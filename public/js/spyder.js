// ══════════════════════════════════════════════
// SPYDER — 내 추적 브랜드 관리
// ══════════════════════════════════════════════
let spyderBrands = []   // [{id, name, pageId, adCount, liveCount, selected}]

// ── Spyder 탭 전환 ──
// ── Foreplay에서 돌아왔을 때 Spyder 자동 새로고침 ──
async function testSpyderAPI(){
  const listEl = document.getElementById('spyder-brand-list')
  listEl.innerHTML = '<div style="font-size:10px;color:var(--text3);padding:6px"><span class="spin">◌</span> offset 0 vs 10 비교 테스트 중...</div>'
  try {
    // offset=0 요청
    const r0 = await fetch('/api/foreplay-proxy', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({endpoint:'/api/spyder/brands?offset=0&limit=10', params:{offset:0,limit:10}, apiKey:K.fp})
    })
    const d0 = await r0.json()
    const names0 = (d0?.data||[]).map(b=>b.name).join(', ')

    // offset=10 요청
    const r1 = await fetch('/api/foreplay-proxy', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({endpoint:'/api/spyder/brands?offset=10&limit=10', params:{offset:10,limit:10}, apiKey:K.fp})
    })
    const d1 = await r1.json()
    const names1 = (d1?.data||[]).map(b=>b.name).join(', ')

    listEl.innerHTML = '<div style="font-size:10px;padding:8px;background:var(--s3);border-radius:var(--r);line-height:1.8">' +
      '<b style="color:var(--purple)">offset=0:</b> ' + names0 + '<br><br>' +
      '<b style="color:var(--green)">offset=10:</b> ' + names1 +
      (names0===names1 ? '<br><br><span style="color:var(--red,#ff5f57)">❌ 동일! N8N이 offset 무시 중</span>' : '<br><br><span style="color:var(--green)">✅ 다름! offset 작동 중</span>') +
      '</div>'
  } catch(e) {
    listEl.innerHTML = '<div style="font-size:10px;color:var(--red,#ff5f57);padding:6px">에러: '+e.message+'</div>'
  }
}


function registerSpyderReturn(){
  // foreplay.co에서 돌아올 때 한 번만 새로고침
  const handler = () => {
    if(!document.hidden){
      document.removeEventListener('visibilitychange', handler)
      // 0.5초 후 강제 새로고침 (탭 전환 완료 후)
      setTimeout(()=>{
        const btn = document.getElementById('spyder-refresh-btn')
        if(btn && mode==='spyder'){
          btn.dataset.force = '1'
          loadSpyderBrands()
          toast('Spyder 브랜드 업데이트 중...', 'ok')
        }
      }, 500)
    }
  }
  document.addEventListener('visibilitychange', handler)
}


function switchSpyderTab(tab){
  const myPanel = document.getElementById('spyder-panel-my')
  const searchPanel = document.getElementById('spyder-panel-search')
  const myBtn = document.getElementById('spyder-tab-my')
  const searchBtn = document.getElementById('spyder-tab-search')
  if(tab === 'my'){
    myPanel.style.display = 'block'
    searchPanel.style.display = 'none'
    myBtn.style.color = 'var(--purple)'; myBtn.style.borderBottomColor = 'var(--purple)'
    searchBtn.style.color = 'var(--text3)'; searchBtn.style.borderBottomColor = 'transparent'
  } else {
    myPanel.style.display = 'none'
    searchPanel.style.display = 'block'
    searchBtn.style.color = 'var(--purple)'; searchBtn.style.borderBottomColor = 'var(--purple)'
    myBtn.style.color = 'var(--text3)'; myBtn.style.borderBottomColor = 'transparent'
    document.getElementById('spyder-search-input')?.focus()
  }
}

// ── 브랜드 검색 ──
async function searchSpyderBrand(){
  const q = document.getElementById('spyder-search-input')?.value.trim()
  if(!q){ toast('브랜드명을 입력해주세요','err'); return }

  const resultEl = document.getElementById('spyder-search-result')
  resultEl.innerHTML = '<div style="font-size:11px;color:var(--text3);text-align:center;padding:12px"><span class="spin">◌</span> 검색 중...</div>'

  try {
    // 1. 내 Spyder 목록에서 먼저 필터링
    const qLow = q.toLowerCase()
    const localResults = spyderBrands.filter(b => b.name.toLowerCase().includes(qLow))

    // 2. Foreplay API 도메인 검색 (있으면)
    let apiResults = []
    if(K.fp){
      try {
        // 도메인 형식이면 도메인 검색, 아니면 내 Spyder 목록만 필터
        const isDomain = q.includes('.')
        if(isDomain){
          const res = await fetch('/api/foreplay-proxy', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({endpoint:'/api/brand/getBrandsByDomain', params:{domain:q, limit:10}, apiKey:K.fp})
          })
          if(res.ok){
            const data = await res.json()
            console.log('[Search] 도메인 검색 응답:', JSON.stringify(data).slice(0,500))
            const raw = Array.isArray(data)?data[0]:data
            const arr = raw?.data||raw?.brands||raw?.results||(Array.isArray(raw)?raw:[])
            if(Array.isArray(arr)) apiResults = arr
          }
        }
        console.log('[Search] API 결과:', apiResults.length, '개')
      } catch(e){ console.error('[Search] 에러:', e.message) }
    }

    // 3. 합쳐서 표시 (내 Spyder 먼저, 그 다음 API 결과)
    const arr = [
      ...localResults.map(b=>({...b, _source:'my'})),
      ...apiResults.filter(b=>{
        const name = b.name||b.brandName||''
        return !localResults.some(l=>l.name.toLowerCase()===name.toLowerCase())
      }).map(b=>({...b, _source:'api'}))
    ]

    if(!arr.length){
      resultEl.innerHTML = `<div style="font-size:11px;color:var(--text3);padding:10px;line-height:1.6">
        검색 결과가 없어요.<br>
        <a href="https://app.foreplay.co" target="_blank" style="color:var(--purple)">foreplay.co</a>에서 Spyder 브랜드를 추가하면 여기서 선택할 수 있어요.
      </div>`
      return
    }

    // DOM으로 직접 생성 (따옴표 충돌 방지)
    resultEl.innerHTML = ''
    arr.forEach(b => {
      const name = b.name || b.page_name || b.brandName || '알 수 없음'
      const bid = b.id || b.page_id || b.pageId || ''
      const adCount = b.adCount || b.ad_count || 0
      const avatar = b.avatar || b.logo || b.image || ''
      const isMy = b._source === 'my'
      const div = document.createElement('div')
      div.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--s2);border:1px solid '+(isMy?'var(--purple)':'var(--border)')+';border-radius:var(--r);margin-bottom:5px;cursor:pointer'
      div.onclick = () => selectSearchResult(bid, name, isMy)
      const img = document.createElement(avatar?'img':'div')
      if(avatar){ img.src=avatar; img.onerror=()=>img.style.display='none' }
      img.style.cssText = 'width:28px;height:28px;border-radius:50%;'+(avatar?'object-fit:cover':'background:var(--s3);display:flex;align-items:center;justify-content:center;font-size:12px')+';flex-shrink:0'
      if(!avatar) img.textContent = name[0]||'?'
      const info = document.createElement('div')
      info.style.cssText = 'flex:1;min-width:0'
      info.innerHTML = '<div style="font-size:12px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+name+'</div>'
        +'<div style="font-size:10px;color:var(--text3)">'+(isMy?'📌 내 Spyder · ':'')+'광고 '+adCount+'개</div>'
      const btn = document.createElement('button')
      btn.className = 'btn sm'+(isMy?' pur':'')
      btn.style.cssText = 'font-size:10px;flex-shrink:0'
      btn.textContent = isMy?'선택':'광고 수집'
      btn.onclick = e => { e.stopPropagation(); selectSearchResult(bid,name,isMy) }
      div.append(img,info,btn)
      resultEl.appendChild(div)
    })

  } catch(e){
    resultEl.innerHTML = `<div style="font-size:11px;color:var(--red,#ff5f57);padding:8px">검색 실패: ${e.message}</div>`
  }
}

function selectSearchResult(id, name, isMy){
  if(isMy === true || isMy === 'true'){
    // 내 Spyder 브랜드 → Spyder 모드에서 해당 브랜드 선택
    const brand = spyderBrands.find(b=>b.id===id||b.name===name)
    if(brand){
      brand.selected = true
      switchSpyderTab('my')
      renderSpyderList()
      toast('📌 '+name+' 선택됨 → 수집 버튼을 눌러주세요','ok')
      return
    }
  }
  // 외부 브랜드 → Page ID 모드로 전환
  if(!id){ toast('브랜드 ID가 없어요','err'); return }
  const modeEl = document.querySelector('[data-m="pageid"]')
  if(modeEl) setMode(modeEl)
  const pidEl = document.getElementById('i-pid')
  if(pidEl){ pidEl.value = id; toast(name+' 선택됨 → 수집 버튼을 눌러주세요','ok') }
}


async function loadSpyderBrands(){
  const listEl=document.getElementById('spyder-brand-list')
  if(!listEl) return

  if(!K.fp){
    // settings에서 키 다시 로드 시도
    await loadSettingsFromSB()
    if(!K.fp){
      listEl.innerHTML='<div class="spyder-loading">Foreplay API 키를 먼저 설정해주세요</div>'
      return
    }
  }

  const btn=document.getElementById('spyder-refresh-btn')
  if(btn){ btn.disabled=true; btn.innerHTML='<span class="spin">◌</span>' }

  // Supabase 캐시 먼저 체크 (새로고침 버튼이 아닌 경우)
  const isForceRefresh = btn?.dataset?.force === '1'
  if(!isForceRefresh){
    const cached = await loadSpyderCache()
    if(cached && cached.length){
      spyderBrands = cached
      // 패널이 숨겨져 있어도 렌더링
      const myPanel = document.getElementById('spyder-panel-my')
      if(myPanel) myPanel.style.display = 'block'
      renderSpyderList()
      if(btn){ btn.disabled=false; btn.innerHTML='↻' }
      return
    }
  }
  if(btn) btn.dataset.force = '0'

  listEl.innerHTML='<div class="spyder-loading"><span class="spin">◌</span> Spyder 브랜드 불러오는 중...</div>'

  try {
    // Foreplay API: 내 Spyder 추적 브랜드 목록 (페이지네이션)
    let allBrands=[], offset=0, hasMore=true
    listEl.innerHTML='<div class="spyder-loading"><span class="spin">◌</span> 불러오는 중... <span id="spyder-load-count">0</span>개</div>'
    while(hasMore){
      // N8N 프록시로 offset 포함해서 호출
      // endpoint에 쿼리스트링 직접 포함 (N8N이 params를 제대로 전달 못할 경우 대비)
      const r=await fetch('/api/foreplay-proxy',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          endpoint:`/api/spyder/brands?offset=${offset}&limit=10`,
          params:{offset,limit:10},
          apiKey:K.fp
        })
      })
      if(!r.ok) break
      const d=await r.json()
      const arr = d?.data || []
      if(!Array.isArray(arr)||arr.length===0) break
      allBrands=allBrands.concat(arr)
      const countEl=document.getElementById('spyder-load-count')
      if(countEl) countEl.textContent=allBrands.length
      if(arr.length < 10) hasMore=false
      else offset+=10
      if(allBrands.length>=500) break
      await new Promise(resolve=>setTimeout(resolve,150))
    }
    const spArr=allBrands

    // 영구 저장된 그룹 설정 로드
    const savedGroups = await loadSpyderGroups()

    spyderBrands=(Array.isArray(spArr)?spArr:[]).map(b=>{
      const bid = b.id||('sp_'+Math.random().toString(36).slice(2,6))
      return {
        id: bid,
        name: b.name||'알 수 없음',
        pageId: b.ad_library_id||b.pageId||b.page_id||'',
        avatar: b.avatar||'',
        category: b.category||'',
        url: b.url||'',
        adCount: b.adCount||b.total_ads||0,
        liveCount: b.liveCount||b.active_ads||0,
        selected: false,
        groupName: savedGroups[bid] || null
      }
    })

    if(!spyderBrands.length){
      listEl.innerHTML='<div class="spyder-loading">Spyder 추적 브랜드가 없어요<br><span style="color:var(--text3)">foreplay.co에서 먼저 브랜드를 추적 등록하세요</span></div>'
      if(btn){ btn.disabled=false; btn.innerHTML='↻' }
      return
    }
    const myPanel2 = document.getElementById('spyder-panel-my')
    if(myPanel2) myPanel2.style.display = 'block'
    renderSpyderList()
    saveSpyderCache(spyderBrands)  // Supabase에 캐시 저장
    toast(`Spyder 브랜드 ${spyderBrands.length}개 로드됨`,'ok')

  } catch(e){
    console.error('Spyder 로드 에러:', e.message)
    listEl.innerHTML='<div class="spyder-loading" style="color:var(--red,#ff5f57)">로드 실패: '+e.message+'<br><span style="color:var(--text3);font-size:10px">↻ 버튼으로 다시 시도하세요</span></div>'
  } finally {
    if(btn){ btn.disabled=false; btn.innerHTML='↻' }
  }
}

function mockSpyderBrands(){
  return [
    {id:'sp1',name:'올리브영',pageId:'123456789',adCount:342,liveCount:28,selected:false},
    {id:'sp2',name:'마켓컬리',pageId:'234567890',adCount:218,liveCount:15,selected:false},
    {id:'sp3',name:'무신사',pageId:'345678901',adCount:189,liveCount:22,selected:false},
    {id:'sp4',name:'오늘의집',pageId:'456789012',adCount:156,liveCount:11,selected:false},
    {id:'sp5',name:'쿠팡이츠',pageId:'567890123',adCount:298,liveCount:34,selected:false},
  ]
}

function renderSpyderList(){
  const listEl=document.getElementById('spyder-brand-list')
  if(!listEl||!spyderBrands.length) return

  // Supabase 미연결 시 경고
  const warnHtml = !SB.isConnected() ? '<div class="sp-local-warn">⚠️ Supabase 미연결 — 로컬 캐시 사용 중</div>' : ''

  // 그룹화: spyderBrands의 groupName 필드 기준 (없으면 '기타')
  const groups={}
  spyderBrands.forEach(b=>{
    const g=b.groupName||'📋 전체'
    if(!groups[g]) groups[g]=[]
    groups[g].push(b)
  })

  const selAll=spyderBrands.length>1?`<div style="display:flex;gap:4px;margin-bottom:5px">
    <button class="btn sm" onclick="spyderSelectAll()" style="flex:1;font-size:10px">전체 선택</button>
    <button class="btn sm" onclick="spyderClearAll()" style="flex:1;font-size:10px">전체 해제</button>
  </div>`:''

  const groupsHtml=Object.entries(groups).map(([gName,bList])=>{
    const gId='sg_'+gName.replace(/[^a-z0-9]/gi,'_')
    const allSel=bList.every(b=>b.selected)
    const someSel=bList.some(b=>b.selected)
    const itemsHtml=bList.map(b=>`
      <div class="spyder-item ${b.selected?'sel':''}" id="spb-${b.id}" onclick="toggleSpyderBrand('${b.id}')">
        <div class="sp-check">${b.selected?'✓':''}</div>
        ${b.avatar?`<img class="sp-avatar" src="${b.avatar}" onerror="this.style.display='none'">`:''}
        <div class="sp-name">${b.name}</div>
        ${b.liveCount?`<div class="sp-live">▶ ${b.liveCount}</div>`:''}
        <div class="sp-count">${b.adCount||'?'}개</div>
      </div>`).join('')

    if(Object.keys(groups).length===1){
      // 그룹 1개면 헤더 없이 바로 표시
      return itemsHtml
    }
    return `<div class="spyder-group">
      <div class="spyder-group-hdr" onclick="toggleSpyderGroup('${gId}')">
        <span class="sg-arrow">▼</span>
        <span style="flex:1">${gName}</span>
        <span class="sp-sel-all" onclick="event.stopPropagation();spyderSelectGroup('${gId}')">${allSel?'✓ ':someSel?'- ':''}선택</span>
        <span style="font-size:9px;color:var(--text3);margin-left:4px">${bList.length}개</span>
      </div>
      <div class="spyder-group-body" id="${gId}">${itemsHtml}</div>
    </div>`
  }).join('')

  listEl.innerHTML = warnHtml + selAll + groupsHtml
  updateSpyderInfo()
}

function toggleSpyderGroup(gId){
  const body=document.getElementById(gId)
  const hdr=body?.previousElementSibling
  if(!body) return
  body.classList.toggle('collapsed')
  hdr?.classList.toggle('collapsed')
}

function spyderSelectGroup(gId){
  const body=document.getElementById(gId)
  if(!body) return
  const ids=[...body.querySelectorAll('.spyder-item')].map(el=>el.id.replace('spb-',''))
  const allSel=ids.every(id=>spyderBrands.find(b=>b.id===id)?.selected)
  ids.forEach(id=>{
    const b=spyderBrands.find(x=>x.id===id)
    if(b) b.selected=!allSel
  })
  renderSpyderList()
}

function spyderSelectAll(){
  spyderBrands.forEach(b=>b.selected=true)
  renderSpyderList()
}

function spyderClearAll(){
  spyderBrands.forEach(b=>b.selected=false)
  renderSpyderList()
}

function toggleSpyderBrand(id){
  const brand=spyderBrands.find(b=>b.id===id)
  if(!brand) return
  brand.selected=!brand.selected
  const item=document.getElementById('spb-'+id)
  if(item){
    item.classList.toggle('sel',brand.selected)
    item.querySelector('.sp-check').textContent=brand.selected?'✓':''
  }
  updateSpyderInfo()
}

function updateSpyderInfo(){
  const sel=spyderBrands.filter(b=>b.selected)
  const info=document.getElementById('spyder-selected-info')
  if(!info) return
  if(!sel.length){ info.style.display='none'; return }
  const totalAds=sel.reduce((s,b)=>s+b.adCount,0)
  const liveAds=sel.reduce((s,b)=>s+b.liveCount,0)
  info.style.display='block'
  info.innerHTML=`✓ ${sel.map(b=>b.name).join(', ')}<br>광고 ${totalAds}개 · 활성 ${liveAds}개`
}

// ── Spyder 브랜드 Supabase 캐시 ──
async function loadSpyderCache(){
  // 1. Supabase에서 먼저 (anon key 직접)
  try {
    const r = await fetch('https://nroylubtytcslujylicw.supabase.co/rest/v1/spyder_cache?select=*',{
      headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ'}
    })
    if(r.ok){
      const rows = await r.json()
      if(rows&&rows.length){
        const row = rows[0]
        if(Date.now()-row.updated_at < 7*24*60*60*1000){
          const brands = JSON.parse(row.brands_json||'[]')
          if(brands.length) return brands
        }
      }
    }
  } catch(e){}
  // 2. 로컬 폴백
  try {
    const local = JSON.parse(localStorage.getItem('af_spyder_cache')||'null')
    if(local && Date.now()-local.ts < 7*24*60*60*1000) return local.brands
  } catch(e){}
  return null
}

async function saveSpyderCache(brands){
  const toSave = brands.map(b=>({...b, groupName:b.groupName||null}))
  const payload = [{id:'main', brands_json:JSON.stringify(toSave), updated_at:Date.now()}]
  // Supabase에 직접 저장 (anon key)
  try {
    const r = await fetch('https://nroylubtytcslujylicw.supabase.co/rest/v1/spyder_cache?on_conflict=id',{
      method:'POST',
      headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify(payload)
    })
    if(r.ok) console.log('✅ Spyder 캐시 Supabase 저장')
    else console.warn('Spyder 캐시 저장 실패:', r.status)
  } catch(e){ console.warn('Spyder 캐시 저장 오류:', e.message) }
  // 로컬에도 항상 백업
  localStorage.setItem('af_spyder_cache', JSON.stringify({ts:Date.now(), brands:toSave}))
}


// ══════════════════════════════════════════════
// 폴더(그룹) 설정 — 캐시와 별도로 영구 저장
// ══════════════════════════════════════════════
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ'
const SB_URL = 'https://nroylubtytcslujylicw.supabase.co/rest/v1'

async function loadSpyderGroups(){
  // 1. Supabase settings에서 로드
  try {
    const r = await fetch(SB_URL+'/settings?key=eq.spyder_groups&select=value',{
      headers:{'apikey':SB_ANON,'Authorization':'Bearer '+SB_ANON}
    })
    if(r.ok){
      const rows = await r.json()
      if(rows.length && rows[0].value){
        const groups = JSON.parse(rows[0].value)
        console.log('[Groups] Supabase에서 로드:', Object.keys(groups).length, '개')
        localStorage.setItem('af_spyder_groups', JSON.stringify(groups))
        return groups
      }
    }
  } catch(e){}
  // 2. 로컬 폴백
  try {
    return JSON.parse(localStorage.getItem('af_spyder_groups')||'{}')
  } catch(e){ return {} }
}

async function saveSpyderGroups(){
  // {brandId: groupName} 맵 저장
  const groups = {}
  spyderBrands.forEach(b=>{ if(b.groupName) groups[b.id]=b.groupName })
  // 로컬 즉시 저장
  localStorage.setItem('af_spyder_groups', JSON.stringify(groups))
  // Supabase settings에 저장
  try {
    await fetch(SB_URL+'/settings?on_conflict=key',{
      method:'POST',
      headers:{'apikey':SB_ANON,'Authorization':'Bearer '+SB_ANON,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify({key:'spyder_groups', value:JSON.stringify(groups)})
    })
    console.log('[Groups] Supabase 저장 완료')
  } catch(e){ console.warn('[Groups] Supabase 저장 실패:', e.message) }
}

function spyderGroupEdit(){
  // 간단한 그룹 편집 UI - 브랜드 목록에서 그룹명 입력
  const brand = spyderBrands[0]
  if(!spyderBrands.length){ toast('브랜드를 먼저 로드해주세요','err'); return }
  const modal = document.createElement('div')
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1000;display:flex;align-items:center;justify-content:center'
  modal.innerHTML=`<div style="background:var(--s1);border:1px solid var(--border2);border-radius:var(--r2);padding:20px;width:400px;max-height:80vh;overflow-y:auto">
    <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:var(--text)">📁 브랜드 그룹 설정</div>
    <div style="font-size:10px;color:var(--text3);margin-bottom:10px">브랜드별 그룹명을 지정해서 폴더처럼 분류하세요</div>
    ${spyderBrands.map(b=>`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <div style="font-size:11px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text2)">${b.name}</div>
      <input type="text" value="${b.groupName||''}" placeholder="그룹명..."
        style="width:120px;font-size:10px;padding:3px 6px;background:var(--s3);border:1px solid var(--border);border-radius:var(--r);color:var(--text)"
        onchange="const br=spyderBrands.find(x=>x.id==='${b.id}');if(br){br.groupName=this.value.trim()||null}">
    </div>`).join('')}
    <div style="display:flex;gap:6px;margin-top:14px;justify-content:flex-end">
      <button class="btn" onclick="this.closest('div[style*=fixed]').remove()">취소</button>
      <button class="btn pur" onclick="saveSpyderGroups();saveSpyderCache(spyderBrands);renderSpyderList();this.closest('div[style*=fixed]').remove();toast('그룹 설정 저장됨','ok')">저장</button>
    </div>
  </div>`
  document.body.appendChild(modal)
}
