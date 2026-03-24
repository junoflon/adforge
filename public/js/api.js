// ══════════════════════════════════════════════
// API / MOCK
// ══════════════════════════════════════════════
async function apiGet(){
  // 수동 입력 모드
  if(mode==='manual'){
    const ads = getManualAds()
    if(!ads.length) throw new Error('경쟁사 광고를 입력해주세요')
    return ads
  }
  const lim=parseInt(document.getElementById('i-lim').value)
  const sort=document.getElementById('i-sort').value
  const p=new URLSearchParams({limit:lim,sort})
  if(filters.has('active')) p.append('active','true')
  const fmts=['video','image'].filter(f=>filters.has(f))
  if(fmts.length) p.append('formats',fmts.join(','))

  let url

  // Foreplay API 프록시 호출
  const n8nFetch = async (endpoint, params={}) => {
    console.log('[API] 호출:', endpoint, params)
    const r = await fetch('/api/foreplay-proxy', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({endpoint, params, apiKey: K.fp})
    })
    if(!r.ok){
      console.error('[API] 실패:', r.status, endpoint)
      const errBody = await r.text().catch(()=>'')
      console.error('[API] 응답:', errBody.slice(0,300))
      return {}
    }
    const data = await r.json()
    console.log('[API] 응답:', endpoint, '결과 키:', Object.keys(data||{}))
    return data
  }
  // Foreplay API 응답에서 배열 추출 (data 또는 ads 또는 results)
  const fpArr = (d) => {
    if(!d) return []
    const raw = Array.isArray(d) ? d[0] : d
    const arr = raw?.data || raw?.ads || raw?.results || raw
    return Array.isArray(arr) ? arr : []
  }

  // ── Spyder 모드: 선택된 브랜드들의 광고 수집 ──
  if(mode==='spyder'){
    const selected=spyderBrands.filter(b=>b.selected)
    if(!selected.length) throw new Error('Spyder에서 브랜드를 선택해주세요')
    const params = {limit:lim, sort}
    if(filters.has('active')) params.active = 'true'
    if(fmts.length) params.formats = fmts.join(',')

    const results=await Promise.all(selected.map(async brand=>{
      const d=await n8nFetch('/api/spyder/brand/ads', {...params, brand_id: brand.id})
      const arr=fpArr(d)
      if(arr.length) console.log('[Spyder] 원본 광고 샘플 (첫번째):', JSON.stringify(Object.keys(arr[0])), 'hook:', arr[0].hook, 'transcript:', arr[0].full_transcription||arr[0].transcript||arr[0].ad_transcription||arr[0].primary_text||'(없음)')
      return arr.map(a=>({...norm(a),brand:brand.name||a.brandName||a.brand?.name||'알 수 없음'}))
    }))
    return _filterNoHook(results.flat())
  }

  const params = Object.fromEntries(p.entries())
  let raw
  if(mode==='pageid'){
    const pid=document.getElementById('i-pid').value.trim()
    if(!pid) throw new Error('Facebook Page ID를 입력해주세요')
    const d=await n8nFetch('/api/brand/getAdsByPageId', {page_id:pid, limit:lim})
    raw = fpArr(d).map(norm)
  } else if(mode==='brand'){
    // 도메인으로 브랜드 검색 → 브랜드 ID로 광고 수집
    const domain=document.getElementById('i-brand').value.trim()
    if(!domain) throw new Error('도메인을 입력해주세요 (예: oliveyoung.co.kr)')
    console.log('[API] 도메인 검색:', domain)
    const brandRes=await n8nFetch('/api/brand/getBrandsByDomain', {domain, limit:10})
    const brandArr=fpArr(brandRes)
    console.log('[API] 브랜드 검색 결과:', brandArr.length, '개')
    if(!brandArr.length) throw new Error('해당 도메인의 브랜드를 찾을 수 없어요: '+domain)
    // 찾은 브랜드들의 광고 수집
    const brandIds=brandArr.map(b=>b.id||b.brand_id).filter(Boolean)
    console.log('[API] 브랜드 ID:', brandIds)
    const results=await Promise.all(brandIds.slice(0,3).map(async bid=>{
      const d=await n8nFetch('/api/brand/getAdsByBrandId', {brand_ids:bid, limit:lim})
      const name=brandArr.find(b=>(b.id||b.brand_id)===bid)?.name||domain
      return fpArr(d).map(a=>({...norm(a),brand:name}))
    }))
    raw = results.flat()
  } else {
    throw new Error('키워드 검색은 Foreplay API에서 지원하지 않습니다')
  }
  return _filterNoHook(raw)
}

// 훅 없는 광고 제외
function _filterNoHook(ads){
  const before = ads.length
  const filtered = ads.filter(a => a.hook && a.hook.trim())
  if(filtered.length < before) console.log(`[Filter] 훅 없는 광고 ${before - filtered.length}개 제외 (${before} → ${filtered.length})`)
  return filtered
}

function norm(r){
  // Foreplay API 실제 필드 파싱 (Spyder 포함)
  const tr = r.full_transcription || r.transcript || r.transcription || r.ad_transcription || r.text || r.body || r.caption || ''
  // 타임스탬프 트랜스크립트에서 첫 문장 추출 (훅)
  const tsTr = r.timestamped_transcription || r.timestampedTranscription || []
  const firstSentence = tsTr[0]?.sentence?.trim() || tsTr[0]?.text?.trim() || ''
  const secondSentence = tsTr[1]?.sentence?.trim() || tsTr[1]?.text?.trim() || ''
  const hook = r.hook || r.primary_text?.split('\n')[0]?.slice(0,80) || (firstSentence ? (firstSentence + (secondSentence ? ' ' + secondSentence : '')) : '') || r.description?.split('\n')[0]?.slice(0,80) || (tr?tr.split(/[.!?\n]/)[0].slice(0,80):'') || ''
  // 플랫폼
  const platforms = r.publisher_platform || r.platforms || [r.platform] || []
  const platform = Array.isArray(platforms) ? platforms[0] : platforms || 'facebook'
  // 포맷
  const format = r.display_format || r.format || (r.video ? 'video' : 'image')
  // 감성 드라이버 → 상위 3개 추출
  const ed = r.emotional_drivers || {}
  const topDrivers = Object.entries(ed).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>k).join(', ')
  // 활성 상태
  const isActive = r.live !== undefined ? r.live : (r.isActive ?? r.active ?? true)
  // 활성 기간 (일)
  const activeDays = r.running_duration || r.activeDays || r.active_days || 0

  return {
    id: r.id || r.adId || ('fp_'+Math.random().toString(36).slice(2,8)),
    brand: r.brand?.name || r.brand_name || r.brandName || r.page_name || '',
    hook: (hook||'').trim(),
    transcript: tr,
    description: r.description || '',
    headline: r.headline || '',
    tone: topDrivers || r.emotionalTone || r.tone || '',
    emotional_drivers: ed,
    creative_targeting: r.creative_targeting || '',
    persona: r.persona || {},
    platform: platform,
    publisher_platform: r.publisher_platform || [],
    format: format,
    isActive: isActive,
    activeDays: activeDays,
    videoUrl: r.video || r.videoUrl || r.video_url || '',
    landingUrl: r.link_url || r.landingUrl || r.landing_page || '',
    cta: r.cta_title || r.cta || r.callToAction || '',
    thumb: r.thumbnail || r.thumbnailUrl || '',
    started_running: r.started_running || '',
    product_category: r.product_category || '',
    video_duration: r.video_duration || 0,
    timestamped_transcription: r.timestamped_transcription || r.timestampedTranscription || []
  }
}

function mockGet(){
  const bn=mode==='spyder'
    ? (spyderBrands.filter(b=>b.selected).map(b=>b.name).join(', ')||'Spyder 브랜드')
    : (mode==='brand'&&document.getElementById('i-brand').value.trim())||'샘플브랜드'
  const HK=['이거 보고 바로 결제했어요 🔥','피부과 원장이 알려준 진짜 방법','다이어트 10번 실패하고 드디어 찾은 것','이걸 모르면 운동해도 살 안 빠져요','매일 아침 이것만 했더니 변했어요','30대부터 피부가 달라지는 이유','첫 주에 2kg 빠졌어요 (진짜 후기)','전 이게 사기인 줄 알았어요','대기업 직원들이 몰래 쓰는 이유','솔직히 이건 써보기 전엔 몰랐어요','이 가격에 이 퀄리티면 안 살 이유 없죠','3개월 쓰고 인생템 됐어요']
  const TN=['공감형','충격형','호기심형','사회적 증거형','긴박형']
  const PL=['facebook','instagram','tiktok','facebook','instagram']
  const CT=['지금 바로 구매하기','한정 특가 확인하기','무료 체험 신청하기','첫 구매 30% 할인']
  const EM=['🎬','📱','✨','💪','🌿','🔥','💄','🛒','⭐','🎯']
  const lim=parseInt(document.getElementById('i-lim').value)
  return Array.from({length:Math.min(lim,HK.length*2)},(_,i)=>{const h=HK[i%HK.length];return{id:'m'+i,brand:bn,hook:h,transcript:h+'\n\n저도 처음엔 반신반의했어요. 근데 직접 써보니까 확실히 달랐어요. 3주 만에 주변에서 다 알아봤고, 지금은 가족한테도 추천하고 있어요.',tone:TN[i%5],platform:PL[i%5],format:i%4===0?'image':'video',isActive:i%5!==4,activeDays:Math.floor(Math.random()*90)+3,videoUrl:'',landingUrl:'https://example.com',cta:CT[i%4],thumb:'',_e:EM[i%10]}})
}

// ══════════════════════════════════════════════
// RENDER GRID
// ══════════════════════════════════════════════
const PI={facebook:'📘',instagram:'📷',tiktok:'🎵',youtube:'▶'}
function renderGrid(){
  const grid=document.getElementById('ad-grid')
  document.getElementById('e1').style.display='none'
  grid.style.display='grid'
  document.getElementById('grid-footer').style.display='flex'
  grid.innerHTML=ads.map((ad,i)=>`
    <div id="c-${ad.id}" class="ad-card ${sel.has(ad.id)?'sel':''}" style="animation-delay:${Math.min(i*.035,.5)}s" onclick="tog('${ad.id}')">
      <div class="ad-thumb">
        ${ad.thumb?`<img src="${ad.thumb}" onerror="this.remove()" loading="lazy">`:''}
        <span class="thumb-emoji">${ad._e||'🎬'}</span>
        <div class="ad-live ${ad.isActive?'on':'off'}">${ad.isActive?'▶ 활성':'● 종료'}</div>
        <div class="sel-check">✓</div>
      </div>
      <div class="ad-info">
        <div class="ad-brand">${PI[ad.platform]||'📱'} ${ad.brand}${ad.activeDays?' · '+ad.activeDays+'일':''}</div>
        <div class="ad-hook">${ad.hook||(ad.description?.split('\n')[0])||'(훅 없음)'}</div>
        <div class="ad-tags">
          <div class="atag plat">${ad.platform}</div>
          ${ad.format?`<div class="atag" style="background:rgba(155,114,251,.15);color:var(--purple)">${ad.format}</div>`:''}
          ${ad.creative_targeting?`<div class="atag tone">${ad.creative_targeting}</div>`:''}
        </div>
        ${ad.transcript?`<div class="ad-tr">${ad.transcript.slice(0,100)}${ad.transcript.length>100?'…':''}</div>`:''}
      </div>
    </div>`).join('')
  document.getElementById('ad-cnt').textContent=ads.length
  updSel()
}
function tog(id){
  if(sel.has(id)) sel.delete(id); else sel.add(id)
  const c=document.getElementById('c-'+id)
  if(c){ c.classList.toggle('sel',sel.has(id)); const ck=c.querySelector('.sel-check'); if(ck) ck.style.display=sel.has(id)?'flex':'none' }
  updSel()
}
function selAll(){ ads.forEach(a=>sel.add(a.id)); document.querySelectorAll('.ad-card').forEach(c=>{c.classList.add('sel');const ck=c.querySelector('.sel-check');if(ck)ck.style.display='flex'}); updSel() }
function clrSel(){ sel.clear(); document.querySelectorAll('.ad-card').forEach(c=>{c.classList.remove('sel');const ck=c.querySelector('.sel-check');if(ck)ck.style.display='none'}); updSel() }
function updSel(){ document.getElementById('sel-cnt').textContent=sel.size+'개 선택' }

function saveLib(ads){
  const byBrand={}
  ads.forEach(a=>{if(!byBrand[a.brand])byBrand[a.brand]=[];byBrand[a.brand].push(a)})
  Object.entries(byBrand).forEach(([bn,bas])=>{
    let c=competitors.find(x=>x.name===bn)
    if(!c){c={id:'c'+Date.now()+Math.random().toString(36).slice(2,5),name:bn,category:'',entries:[],urls:[],rawText:''};competitors.push(c)}
    bas.forEach(a=>{
      const ts=Date.now()+Math.random()
      const tag=[a.tone,a.isActive?'활성':'',a.activeDays?a.activeDays+'일':'','⚡FP'].filter(s=>s.trim()).join('·')
      if(a.hook) c.entries.push({id:'e'+ts+'h',type:'hook',hook:a.hook,cta:a.cta||'',tag,platform:a.platform})
      if(a.transcript&&a.transcript!==a.hook) c.entries.push({id:'e'+ts+'s',type:'script',hook:a.hook||'',body:a.transcript,scriptType:'',tag})
    })
    localStorage.setItem('af_competitors',JSON.stringify(competitors))
  })
}
