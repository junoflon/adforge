// ══════════════════════════════════════════════
// BRAND CRUD
// ══════════════════════════════════════════════
// PDF 데이터 임시 저장
let _pdfData = []


// ══════════════════════════════════════════════
// 수동 경쟁사 입력 모드
// ══════════════════════════════════════════════
let manualBrands = []  // Supabase competitors 테이블에서 로드
let _mcPdfData = []
let editManualId = null

// ── 서버 로드/저장 ──
// ══════════════════════════════════════════════
// 레퍼런스 (수동 모드)
// ══════════════════════════════════════════════

function switchRefTab(tab){
  ['script','topic'].forEach(t=>{
    const panel = document.getElementById('ref-panel-'+t)
    const btn = document.getElementById('ref-tab-'+t)
    if(panel) panel.style.display = t===tab ? 'block' : 'none'
    if(btn){
      btn.style.color = t===tab ? 'var(--purple)' : 'var(--text3)'
      btn.style.borderBottomColor = t===tab ? 'var(--purple)' : 'transparent'
    }
  })
}

// 레퍼런스 데이터 수집 (doGen에서 호출)
function getRefData(){
  const activeTab = ['script','topic'].find(t=>{
    const panel = document.getElementById('ref-panel-'+t)
    return panel && panel.style.display !== 'none'
  }) || 'script'

  if(activeTab === 'script'){
    const text = document.getElementById('ref-script-text')?.value.trim()
    const style = document.getElementById('ref-script-style')?.value.trim()
    return text ? {type:'script', text, style} : null
  }
  if(activeTab === 'topic'){
    const text = document.getElementById('ref-topic-text')?.value.trim()
    const persona = document.getElementById('ref-topic-persona')?.value.trim()
    return text ? {type:'topic', text, persona} : null
  }
  return null
}


async function loadManualBrands(){
  try {
    const r = await fetch('https://nroylubtytcslujylicw.supabase.co/rest/v1/competitors?select=*&order=created_at',{
      headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ'}
    })
    if(r.ok){
      const rows = await r.json()
      manualBrands = rows.map(r=>{
        let ads = []
        // raw_text에 ads JSON 또는 순수 텍스트 저장
        try{
          const parsed = JSON.parse(r.raw_text||'[]')
          if(Array.isArray(parsed)) ads = parsed
          else if(parsed.text) ads = [parsed]
        } catch(e){
          // 순수 텍스트면 하나의 광고로 처리
          if(r.raw_text) ads = [{id:'ma_legacy', text:r.raw_text}]
        }
        let urls = []
        try{ urls = (r.urls||'').split('\n').filter(Boolean) }catch(e){}
        // analysis_data는 jsonb라 텍스트 추출
        let learnedContext = null
        try{
          if(r.analysis_data) learnedContext = typeof r.analysis_data === 'string' ? r.analysis_data : JSON.stringify(r.analysis_data)
        }catch(e){}
        return {id:r.id, name:r.name, ads, urls, learnedContext, pdfs:[]}
      })
      renderManualList()
    }
  } catch(e){ console.warn('competitors 로드 실패:', e.message) }
}

async function saveManualToServer(brand){
  const payload = {
    id: brand.id,
    name: brand.name,
    raw_text: JSON.stringify(brand.ads||[]),  // ads를 raw_text에 저장
    urls: (brand.urls||[]).join('\n'),
    category: brand.learnedContext ? '✓학습완료' : ''  // analysis_data는 jsonb라 category에 간략 표시
  }
  await fetch('https://nroylubtytcslujylicw.supabase.co/rest/v1/competitors?on_conflict=id',{
    method:'POST',
    headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
    body:JSON.stringify(payload)
  })
}

async function deleteManualFromServer(id){
  await fetch('https://nroylubtytcslujylicw.supabase.co/rest/v1/competitors?id=eq.'+id,{
    method:'DELETE',
    headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ'}
  })
}

// ── 모달 열기/닫기 ──
function openManualAddModal(id=null){
  editManualId = id
  _mcPdfData = []
  const b = id ? manualBrands.find(x=>x.id===id) : null
  document.getElementById('mc-name').value = b?.name||''
  document.getElementById('mc-bulk').value = b ? (b.ads||[]).map(a=>a.text).join('\n---\n') : ''
  document.getElementById('mc-learned-wrap').style.display = b?.learnedContext?'block':'none'
  document.getElementById('mc-learned').value = b?.learnedContext||''
  document.getElementById('mc-pdf-list').innerHTML = ''
  // URL 필드
  const urlWrap = document.getElementById('mc-urls-wrap')
  const urls = b?.urls||[]
  urlWrap.innerHTML = urls.map(u=>`
    <div style="display:flex;gap:4px;margin-bottom:4px">
      <input type="text" value="${u}" style="flex:1;font-size:11px;padding:3px 7px;background:var(--s3);border:1px solid var(--border);border-radius:var(--r);color:var(--text)">
      <button onclick="this.parentElement.remove()" style="font-size:11px;background:none;border:none;color:var(--text3);cursor:pointer">✕</button>
    </div>`).join('')
  // 대본 개수 카운트
  updateMcBulkCount()
  openModal('modal-manual')
}

function addMcUrl(){
  const wrap = document.getElementById('mc-urls-wrap')
  const div = document.createElement('div')
  div.style.cssText = 'display:flex;gap:4px;margin-bottom:4px'
  div.innerHTML = `<input type="text" placeholder="https://..." style="flex:1;font-size:11px;padding:3px 7px;background:var(--s3);border:1px solid var(--border);border-radius:var(--r);color:var(--text)"><button onclick="this.parentElement.remove()" style="font-size:11px;background:none;border:none;color:var(--text3);cursor:pointer">✕</button>`
  wrap.appendChild(div)
}

function handleMcPdf(input){
  const files = [...input.files].slice(0, 5)
  files.forEach(file=>{
    const reader = new FileReader()
    reader.onload = e=>{
      const data = e.target.result.split(',')[1]
      _mcPdfData.push({name:file.name, data})
      const listEl = document.getElementById('mc-pdf-list')
      const div = document.createElement('div')
      div.style.cssText = 'font-size:10px;color:var(--text2);padding:3px 6px;background:var(--s3);border-radius:var(--r);margin-bottom:3px;display:flex;justify-content:space-between'
      div.innerHTML = `<span>📄 ${file.name}</span><span onclick="this.parentElement.remove()" style="cursor:pointer;color:var(--text3)">✕</span>`
      listEl.appendChild(div)
    }
    reader.readAsDataURL(file)
  })
}

function updateMcBulkCount(){
  const txt = document.getElementById('mc-bulk').value
  const ads = parseBulkAds(txt)
  const countEl = document.getElementById('mc-bulk-count')
  if(countEl) countEl.textContent = ads.length ? `${ads.length}개 광고 인식됨` : ''
}

function parseBulkAds(text){
  if(!text.trim()) return []
  // '---' 또는 빈 줄 2개로 분리
  const parts = text.split(/\n---\n|\n\n\n+/)
  return parts.map(p=>p.trim()).filter(p=>p.length>5)
}

// ── 저장 ──
async function saveManualBrand(){
  const name = document.getElementById('mc-name').value.trim()
  if(!name){ toast('경쟁사 이름을 입력해주세요','err'); return }

  const bulkText = document.getElementById('mc-bulk').value
  const adTexts = parseBulkAds(bulkText)
  const urls = [...document.querySelectorAll('#mc-urls-wrap input')].map(i=>i.value.trim()).filter(Boolean)
  const learnedCtx = document.getElementById('mc-learned').value.trim()||null

  const id = editManualId || ('mc_'+Date.now())
  const brand = {
    id, name,
    ads: adTexts.map((t,i)=>{return {id:'ma_'+Date.now()+'_'+i, text:t}}),
    urls, learnedContext: learnedCtx, pdfs: _mcPdfData
  }

  if(editManualId){
    const idx = manualBrands.findIndex(x=>x.id===editManualId)
    if(idx>-1) manualBrands[idx] = brand
    else manualBrands.push(brand)
  } else {
    manualBrands.push(brand)
  }

  // 서버 저장
  try{
    await saveManualToServer(brand)
    toast(`${name} 저장됐어요 (${adTexts.length}개 광고)`,'ok')
  } catch(e){ toast('서버 저장 실패: '+e.message,'err') }

  renderManualList()
  closeModal('modal-manual')
  editManualId = null
}

// ── URL/PDF 분석 ──
async function learnManualBrand(){
  if(!K.cl){ toast('Claude API 키가 없어요','err'); return }
  const urls = [...document.querySelectorAll('#mc-urls-wrap input')].map(i=>i.value.trim()).filter(Boolean)
  if(!urls.length && !_mcPdfData.length){ toast('URL이나 PDF를 먼저 추가해주세요','err'); return }

  const btn = document.getElementById('mc-learn-btn')
  btn.disabled=true; btn.innerHTML='<span class="spin">◌</span> 분석 중...'

  try {
    let urlContents = ''
    for(const url of urls.slice(0,3)){
      try {
        const r = await fetch('https://junoflow.app.n8n.cloud/webhook/url-fetch',{
          method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})
        })
        if(r.ok){
          const txt = await r.text()
          if(txt && txt.length>50) urlContents += `\n\n[${url}]\n${txt.slice(0,3000)}`
        }
      } catch(e){ urlContents += `\n\n[분석 URL: ${url}]` }
    }

    const contentParts = []
    _mcPdfData.forEach(p=>contentParts.push({type:'document',source:{type:'base64',media_type:'application/pdf',data:p.data}}))
    const userText = urlContents ? `${urlContents}\n\n위 URL/문서를 분석해서 경쟁사 브랜드 핵심 정보를 요약해주세요.` : '첨부된 PDF를 분석해주세요.'
    contentParts.push({type:'text',text:userText})

    const r = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':K.cl,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:1200,
        tools:[{type:'web_search_20250305',name:'web_search'}],
        system:`경쟁사 분석 전문가로서 주어진 URL(상품 페이지, 리뷰 페이지)을 분석해서 광고 대본 차별화에 필요한 정보를 추출하세요.

다음 항목을 한국어로 작성하세요:

[경쟁사 브랜드 정보]
- 브랜드명 & 주력 제품
- 핵심 USP & 마케팅 메시지
- 가격대 & 타겟

[리뷰에서 발견한 약점] (리뷰 URL 있는 경우)
- 고객 불만 TOP 3 (실제 리뷰 표현으로)
- 자주 나오는 아쉬운 점
- 우리가 공략할 수 있는 빈틈

[우리 브랜드 차별화 포인트]
- 이 경쟁사 대비 강조해야 할 것
- 후킹에 활용할 수 있는 경쟁사 약점`,
        messages:[{role:'user',content:contentParts}]
      })
    })
    if(!r.ok) throw new Error('Claude API 오류')
    const d = await r.json()
    const summary = d.content.map(c=>c.type==='text'?c.text:'').filter(Boolean).join('').trim()
    if(!summary) throw new Error('분석 결과가 없어요. 잠시 후 다시 시도해주세요.')

    document.getElementById('mc-learned-wrap').style.display = 'block'
    document.getElementById('mc-learned').value = summary
    toast('🧠 분석 완료!','ok')
  } catch(e){ toast('분석 실패: '+e.message,'err') }
  btn.disabled=false; btn.innerHTML='🧠 URL/PDF 분석'
}

// ── 삭제 ──
async function deleteManualBrand(id){
  if(!confirm('삭제할까요?')) return
  manualBrands = manualBrands.filter(x=>x.id!==id)
  try{ await deleteManualFromServer(id) }catch(e){}
  renderManualList()
}

// ── 목록 렌더링 ──
function renderManualList(){
  const wrap = document.getElementById('manual-list-wrap')
  if(!wrap) return
  if(!manualBrands.length){
    wrap.innerHTML = '<div style="font-size:10px;color:var(--text3);padding:8px 0;text-align:center">추가된 경쟁사가 없어요</div>'
    return
  }
  // 전체 선택/해제
  const selBtns = manualBrands.length > 1 ? `<div style="display:flex;gap:4px;margin-bottom:4px">
    <button class="btn sm" onclick="manualSelectAll()" style="flex:1;font-size:9px">전체 선택</button>
    <button class="btn sm" onclick="manualClearAll()" style="flex:1;font-size:9px">전체 해제</button>
  </div>` : ''

  wrap.innerHTML = selBtns + manualBrands.map(b=>{
    const adCount = b.ads?.length||0
    const urlCount = b.urls?.length||0
    const selected = b.selected !== false // 기본 선택
    return `<div id="mc-${b.id}" onclick="toggleManualBrand('${b.id}')" style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:${selected?'var(--green-dim)':'var(--s2)'};border:1.5px solid ${selected?'rgba(45,212,122,.4)':'var(--border)'};border-radius:var(--r);margin-bottom:4px;cursor:pointer;transition:all .13s">
      <div id="mc-check-${b.id}" style="width:14px;height:14px;border-radius:3px;border:1.5px solid ${selected?'var(--green)':'var(--border2)'};background:${selected?'var(--green)':'var(--s3)'};display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;flex-shrink:0">${selected?'✓':''}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.name}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:1px">
          ${adCount}개 광고${urlCount?' · URL '+urlCount+'개':''}${b.learnedContext?' · 🧠 분석됨':''}
        </div>
      </div>
      <button class="btn sm" onclick="event.stopPropagation();openManualAddModal('${b.id}')" style="font-size:10px;padding:2px 7px">편집</button>
      <button onclick="event.stopPropagation();deleteManualBrand('${b.id}')" style="font-size:11px;background:none;border:none;color:var(--text3);cursor:pointer">✕</button>
    </div>`
  }).join('')
}

function toggleManualBrand(id){
  const b = manualBrands.find(x=>x.id===id)
  if(!b) return
  b.selected = b.selected === false ? true : false
  renderManualList()
}

function manualSelectAll(){
  manualBrands.forEach(b=>b.selected=true)
  renderManualList()
}

function manualClearAll(){
  manualBrands.forEach(b=>b.selected=false)
  renderManualList()
}

// ── 광고 데이터 변환 (go() 에서 사용) — 선택된 경쟁사만 ──
function getManualAds(){
  const result = []
  manualBrands.forEach(b=>{
    if(b.selected === false) return  // 선택 해제된 경쟁사 제외
    if(!b.name || !b.ads?.length) return
    b.ads.forEach(a=>{
      if(!a.text?.trim()) return
      const lines = a.text.split('\n').filter(l=>l.trim())
      result.push({
        id:a.id, brand:b.name,
        hook: lines[0]||'',
        body: lines.slice(1,-1).join(' ')||lines[1]||'',
        cta: lines[lines.length-1]||'',
        transcript: a.text, full_transcription: a.text,
        tone:'', activeDays:0, isActive:true,
        format:'manual', live:false
      })
    })
  })
  return result
}


async function learnBrand(){
  const urls=[...document.querySelectorAll('#b-urls-wrap input')].map(i=>i.value.trim()).filter(Boolean)
  const hasPdf=_pdfData.length>0
  if(!urls.length && !hasPdf){ toast('URL이나 PDF를 먼저 추가해주세요','err'); return }
  if(!K.cl){ toast('Claude API 키가 없어요','err'); return }

  const btn=document.getElementById('b-learn-btn')
  btn.disabled=true; btn.innerHTML='<span class="spin">◌</span> 학습 중...'

  try {
    // 1. Claude API에 web_search 툴로 URL 직접 분석 (N8N 불필요)
    const systemPrompt=`당신은 브랜드 분석 및 광고 카피라이팅 전문가입니다. 주어진 URL(상품 페이지, 리뷰 페이지 포함)과 PDF를 분석해서 광고 대본 작성에 필요한 핵심 정보를 추출하세요.

중요: 브랜드의 전체 제품군을 빠짐없이 조사하세요. 하나의 제품만 보지 말고, 해당 브랜드가 운영하는 모든 제품 라인을 파악하세요.

다음 항목을 한국어로 작성하세요:

[브랜드 기본 정보]
- 브랜드명 & 카테고리
- 브랜드 톤 & 가격대
- 타겟 고객층

[전체 제품군 조사]
- 해당 브랜드가 운영하는 모든 제품/라인 나열
- 각 제품별 간단한 설명 (1줄)

[제품별 USP] ⚠ 가장 중요
- 제품 1: (제품명) — USP: / 페인포인트: / 타겟:
- 제품 2: (제품명) — USP: / 페인포인트: / 타겟:
- (모든 주요 제품 반복)
※ 하나의 제품 USP를 브랜드 전체 USP로 일반화하지 말 것
※ 각 제품마다 고유한 차별점을 구체적으로 작성

[리뷰에서 추출한 고객 언어] (리뷰 URL이 있는 경우)
- 고객이 실제로 쓰는 표현 TOP 5 (그대로 인용)
- 자주 언급되는 효과/결과 (숫자 포함)
- 구매 결정 이유 TOP 3
- 제품별로 다른 리뷰 포인트가 있으면 구분해서 작성

[광고 활용 인사이트]
- 후킹에 바로 쓸 수 있는 고객 표현
- 경쟁사 대비 강조할 차별점 (제품별)`

    const contentParts=[]
    // PDF 첨부
    if(_pdfData.length) _pdfData.forEach(p=>contentParts.push({type:'document',source:{type:'base64',media_type:'application/pdf',data:p.data}}))
    // URL을 텍스트로 전달 (Claude가 web_search로 직접 접근)
    const urlText = urls.length ? `다음 URL들을 방문해서 브랜드 정보를 분석해주세요:\n${urls.join('\n')}` : ''
    const userText = `${urlText}${_pdfData.length ? '\n\n첨부된 PDF 문서도 함께 분석해주세요.' : ''}\n\n위 브랜드의 핵심 정보를 요약해주세요.`
    contentParts.push({type:'text',text:userText})
    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':K.cl,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:4096,
        system:systemPrompt,
        tools:[{type:'web_search_20250305',name:'web_search'}],
        messages:[{role:'user',content:contentParts}]
      })
    })
    if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error?.message||'Claude API 오류')}
    const d=await r.json()
    // tool_use 결과 포함해서 텍스트 추출
    const summary=d.content.map(c=>c.type==='text'?c.text:'').filter(Boolean).join('').trim()
    if(!summary) throw new Error('분석 결과가 없어요. 잠시 후 다시 시도해주세요.')

    // 3. 버전 스택에 추가
    const nowTs=Date.now()
    const verSel=document.getElementById('b-learned-ver')
    const existStack=editBrandId?(brands.find(x=>x.id===editBrandId)?.learnedStack||[]):[]
    // 구버전 호환
    if(existStack.length===0){
      const oldCtx=editBrandId?(brands.find(x=>x.id===editBrandId)?.learnedContext||''):''
      if(oldCtx) existStack.push({ver:1,label:'v1',ts:0,text:oldCtx})
    }
    const newVer=existStack.length+1
    const newEntry={ver:newVer,label:`v${newVer}`,ts:nowTs,text:summary}
    existStack.push(newEntry)

    // UI 업데이트
    document.getElementById('b-learned').value=summary

    // 학습 결과에서 제품 자동 추출 → 제품 목록에 반영
    const parsedProducts = _parseProducts(summary)
    if(parsedProducts.length){
      // 기존 제품과 병합 (이름이 같으면 덮어쓰기)
      parsedProducts.forEach(np => {
        const existing = _editProducts.findIndex(ep => ep.name === np.name)
        if(existing > -1) _editProducts[existing] = np
        else _editProducts.push(np)
      })
      renderEditProducts()
      toast(`🧠 학습 완료! 제품 ${parsedProducts.length}개 자동 추가됨`,'ok')
    }

    // 4. 저장
    if(editBrandId){
      const idx=brands.findIndex(x=>x.id===editBrandId)
      if(idx>-1){
        brands[idx].learnedContext=summary  // 최신 버전
        brands[idx].learnedStack=existStack
        brands[idx].urls=[...document.querySelectorAll('#b-urls-wrap input')].map(i=>i.value.trim()).filter(Boolean)
        brands[idx].pdfs=_pdfData
        DB.saveBrands(brands)
        toast(`🧠 학습 완료! ${newEntry.label} 저장됐어요`,'ok')
      }
    } else {
      window._pendingLearnedStack=existStack
      toast(`🧠 학습 완료! (${newEntry.label}) 저장 버튼을 눌러주세요`,'ok')
    }

  } catch(e){
    toast('학습 실패: '+e.message,'err')
  }
  btn.disabled=false; btn.innerHTML='🧠 학습 시작'
}

function loadLearnedVersion(idx){
  const b=editBrandId?brands.find(x=>x.id===editBrandId):null
  const stack=b?.learnedStack||[]
  if(stack[idx]) document.getElementById('b-learned').value=stack[idx].text||''
}


function addUrlField(){
  const wrap=document.getElementById('b-urls-wrap')
  const row=document.createElement('div')
  row.className='url-row'; row.style.cssText='display:flex;gap:4px'
  row.innerHTML='<input type="text" placeholder="https://" style="flex:1"><button class="btn sm" onclick="this.parentElement.remove()" style="padding:4px 8px;color:var(--red);flex-shrink:0">✕</button>'
  wrap.appendChild(row)
}

function handlePdfUpload(input){
  const list=document.getElementById('b-pdf-list')
  Array.from(input.files).slice(0,5-_pdfData.length).forEach(file=>{
    const reader=new FileReader()
    reader.onload=e=>{
      const b64=e.target.result.split(',')[1]
      _pdfData.push({name:file.name,data:b64,type:'application/pdf'})
      const item=document.createElement('div')
      item.style.cssText='display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--s3);border-radius:var(--r);font-size:11px'
      item.innerHTML=`<span style="color:var(--accent)">📄</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${file.name}</span><button class="btn sm" style="padding:2px 6px;color:var(--red)" onclick="removePdf(${_pdfData.length-1},this.parentElement)">✕</button>`
      list.appendChild(item)
    }
    reader.readAsDataURL(file)
  })
  input.value=''
}

function removePdf(idx,el){
  _pdfData.splice(idx,1)
  el.remove()
  // re-index buttons
  document.querySelectorAll('#b-pdf-list button').forEach((btn,i)=>{ btn.setAttribute('onclick',`removePdf(${i},this.parentElement)`) })
}

// 모달 내 임시 제품 목록
let _editProducts = []

function openBrandModal(editId=null){
  editBrandId=editId
  _pdfData=[]
  document.getElementById('bm-ttl').textContent=editId?'브랜드 편집':'브랜드 추가'
  const b=editId?brands.find(x=>x.id===editId):null
  ;['b-nm','b-cat','b-tone','b-prhb','b-ctx'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=b?b[{
    'b-nm':'name','b-cat':'category','b-tone':'tone','b-prhb':'prohibit','b-ctx':'context'
  }[id]]||'':'' })

  // 히든 필드 (하위호환)
  document.getElementById('b-pain').value = b?.painpoint||''
  document.getElementById('b-usp').value = b?.usp||''
  document.getElementById('b-learned').value = b?.learnedContext||''

  // 제품 목록 초기화
  _editProducts = b?.products ? JSON.parse(JSON.stringify(b.products)) : []
  // 기존 데이터에 products가 없으면 learnedContext에서 파싱 시도
  if(!_editProducts.length && b?.learnedContext){
    _editProducts = _parseProducts(b.learnedContext)
  }
  // 그래도 없으면 기존 usp/painpoint로 기본 제품 1개 생성
  if(!_editProducts.length && (b?.usp || b?.painpoint)){
    _editProducts.push({name: b.name||'기본 제품', usp: b.usp||'', painpoint: b.painpoint||'', target:''})
  }
  renderEditProducts()

  // URL 필드 초기화
  const wrap=document.getElementById('b-urls-wrap')
  const urls=b?.urls||[]
  wrap.innerHTML=''
  const initUrls=urls.length?urls:['']
  initUrls.forEach(u=>{
    const row=document.createElement('div'); row.className='url-row'; row.style.cssText='display:flex;gap:4px'
    row.innerHTML=`<input type="text" placeholder="https://" value="${u}" style="flex:1"><button class="btn sm" onclick="this.parentElement.remove()" style="padding:4px 8px;color:var(--red);flex-shrink:0">✕</button>`
    wrap.appendChild(row)
  })
  // PDF 목록 초기화
  const pdfList=document.getElementById('b-pdf-list'); pdfList.innerHTML=''
  if(b?.pdfs?.length){
    _pdfData=[...b.pdfs]
    b.pdfs.forEach((p,i)=>{
      const item=document.createElement('div')
      item.style.cssText='display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--s3);border-radius:var(--r);font-size:11px'
      item.innerHTML=`<span style="color:var(--accent)">📄</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name}</span><button class="btn sm" style="padding:2px 6px;color:var(--red)" onclick="removePdf(${i},this.parentElement)">✕</button>`
      pdfList.appendChild(item)
    })
  }
  openModal('modal-brand')
}

// 제품 목록 렌더 (모달 내)
function renderEditProducts(){
  const list = document.getElementById('b-products-list')
  if(!list) return
  if(!_editProducts.length){
    list.innerHTML = '<div style="font-size:10px;color:var(--text3);text-align:center;padding:12px">제품을 추가하거나 URL 학습으로 자동 생성하세요</div>'
    return
  }
  list.innerHTML = _editProducts.map((p,i) => `
    <div style="background:var(--s2);border:1px solid var(--border);border-radius:var(--r);padding:10px;position:relative">
      <button onclick="_editProducts.splice(${i},1);renderEditProducts()" style="position:absolute;top:6px;right:8px;background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px">✕</button>
      <div class="field" style="margin-bottom:6px">
        <label style="font-size:10px">제품명</label>
        <input type="text" value="${p.name||''}" onchange="_editProducts[${i}].name=this.value" placeholder="예: 여성청결제" style="font-size:11px">
      </div>
      <div class="field" style="margin-bottom:6px">
        <label style="font-size:10px">USP (쉼표로 구분)</label>
        <input type="text" value="${p.usp||''}" onchange="_editProducts[${i}].usp=this.value" placeholder="예: 산부인과 원내판매, pH5.0 약산성" style="font-size:11px">
      </div>
      <div class="field" style="margin-bottom:6px">
        <label style="font-size:10px">페인포인트</label>
        <input type="text" value="${p.painpoint||''}" onchange="_editProducts[${i}].painpoint=this.value" placeholder="예: 질염 반복, Y존 냄새" style="font-size:11px">
      </div>
      <div class="field">
        <label style="font-size:10px">타겟</label>
        <input type="text" value="${p.target||''}" onchange="_editProducts[${i}].target=this.value" placeholder="예: 20대 여성, 질염 경험자" style="font-size:11px">
      </div>
    </div>`).join('')
}

function addBrandProduct(){
  _editProducts.push({name:'', usp:'', painpoint:'', target:''})
  renderEditProducts()
  // 마지막 제품의 이름 필드에 포커스
  setTimeout(()=>{
    const inputs = document.querySelectorAll('#b-products-list input[type="text"]')
    if(inputs.length) inputs[inputs.length-4]?.focus()
  },100)
}

function editCurrentBrand(){
  const id=document.getElementById('sel-brand').value
  if(id) openBrandModal(id)
}

function saveBrand(){
  const nm=document.getElementById('b-nm').value.trim()
  if(!nm){ toast('브랜드명을 입력해주세요','err'); return }
  const urls=[...document.querySelectorAll('#b-urls-wrap input')].map(i=>i.value.trim()).filter(Boolean)

  // 제품에서 USP/페인포인트 합산 (하위호환)
  const allUsp = _editProducts.map(p=>p.usp).filter(Boolean).join(', ')
  const allPain = _editProducts.map(p=>p.painpoint).filter(Boolean).join(', ')

  const b={
    id:editBrandId||'b'+Date.now(),
    name:nm,
    category:document.getElementById('b-cat').value.trim(),
    painpoint: allPain || document.getElementById('b-pain').value.trim(),
    usp: allUsp || document.getElementById('b-usp').value.trim(),
    tone:document.getElementById('b-tone').value.trim(),
    prohibit:document.getElementById('b-prhb').value.trim(),
    context:document.getElementById('b-ctx').value.trim(),
    urls,
    pdfs:_pdfData,
    products: _editProducts.filter(p=>p.name),
    learnedContext:document.getElementById('b-learned').value.trim()||null,
    learnedStack:window._pendingLearnedStack||(editBrandId?brands.find(x=>x.id===editBrandId)?.learnedStack||[]:undefined)
  }
  window._pendingLearnedStack=null
  if(editBrandId){ const idx=brands.findIndex(x=>x.id===editBrandId); brands[idx]=b } else brands.push(b)
  DB.saveBrands(brands)
  renderBrandDrop()
  document.getElementById('sel-brand').value=b.id
  onBrandChange()
  closeModal('modal-brand'); toast(`"${nm}" 저장됨 (${_editProducts.filter(p=>p.name).length}개 제품)`,'ok')
}
function renderBrandDrop(){
  const sel=document.getElementById('sel-brand'); const cur=sel.value
  sel.innerHTML='<option value="">— 브랜드 선택 —</option>'
  brands.forEach(b=>{ const o=document.createElement('option'); o.value=b.id; o.textContent=b.name; sel.appendChild(o) })
  if(cur) sel.value=cur
}
// ── 제품/USP/페인포인트 선택 ──
let _selectedUsps = []     // 선택된 태그 목록
let _uspOptions = []       // 드롭다운 옵션 (브랜드에서 추출)
let _brandProducts = []    // 학습된 제품 목록 [{name, usp, painpoint, target}]

// 학습 데이터에서 제품 파싱
function _parseProducts(learnedContext){
  if(!learnedContext) return []
  const products = []
  const lines = learnedContext.match(/[-·]\s*(.+?)\s*[—–-]\s*USP\s*[:：]\s*(.+?)(?:\s*[/|]\s*페인포인트\s*[:：]\s*(.+?))?(?:\s*[/|]\s*타겟\s*[:：]\s*(.+?))?$/gm) || []
  lines.forEach(line => {
    const m = line.match(/[-·]\s*(.+?)\s*[—–-]\s*USP\s*[:：]\s*(.+?)(?:\s*[/|]\s*페인포인트\s*[:：]\s*(.+?))?(?:\s*[/|]\s*타겟\s*[:：]\s*(.+?))?$/)
    if(!m) return
    products.push({
      name: m[1].trim(),
      usp: m[2].trim(),
      painpoint: m[3]?.trim()||'',
      target: m[4]?.trim()||''
    })
  })
  return products
}

function onBrandChange(){
  const b=brands.find(b=>b.id===document.getElementById('sel-brand').value)
  const prev=document.getElementById('brand-prev')
  const editBtn=document.getElementById('brand-edit-btn')
  const uspSelect=document.getElementById('brand-usp-select')
  const prodSelect=document.getElementById('brand-product-select')
  if(!b){
    prev.style.display='none'
    if(editBtn) editBtn.style.display='none'
    if(uspSelect) uspSelect.style.display='none'
    if(prodSelect) prodSelect.style.display='none'
    if(typeof updateStepButtons==='function') updateStepButtons()
    return
  }
  if(editBtn) editBtn.style.display='flex'
  prev.style.display='block'
  const urlCount=b.urls?.filter(u=>u).length||0
  const pdfCount=b.pdfs?.length||0
  const learnedBadge=b.learnedContext?'<span style="color:var(--green);font-size:10px">🧠 학습완료</span>':'<span style="color:var(--text3);font-size:10px">🧠 미학습</span>'
  prev.innerHTML=`<strong style="color:var(--text)">${b.name}</strong>${b.category?' · '+b.category:''}${b.painpoint?`<br><span style="color:var(--text3)">페인포인트:</span> ${b.painpoint.slice(0,55)}…`:''}<br>${learnedBadge}${urlCount||pdfCount?` <span style="color:var(--accent);font-size:10px">${urlCount?'🔗 '+urlCount+'개':''} ${pdfCount?'📄 '+pdfCount+'개':''}</span>`:''}`

  // 제품 목록: 저장된 products 우선, 없으면 learnedContext에서 파싱
  _brandProducts = b.products?.length ? b.products : _parseProducts(b.learnedContext)

  // 제품 드롭다운 구성
  const selProd = document.getElementById('sel-product')
  if(prodSelect && selProd){
    if(_brandProducts.length){
      prodSelect.style.display='block'
      selProd.innerHTML = '<option value="">— 전체 (제품 미지정) —</option>' +
        _brandProducts.map(p => `<option value="${p.name}">${p.name}</option>`).join('')
    } else {
      prodSelect.style.display='none'
    }
  }

  // USP 옵션 구성 (전체)
  _buildUspOptions(b, '')

  _selectedUsps = []
  const wrap = document.getElementById('brand-usp-select')
  if(wrap) wrap.style.display = 'block'
  renderUspTags()
  hideUspDropdown()

  if(typeof updateStepButtons==='function') updateStepButtons()
}

// USP 옵션 구성 (제품 필터 적용)
function _buildUspOptions(b, productName){
  _uspOptions = []

  if(productName){
    // 특정 제품 선택 → 해당 제품의 USP/페인포인트만
    const prod = _brandProducts.find(p=>p.name===productName)
    if(prod){
      if(prod.usp) prod.usp.split(/[,·]/).map(s=>s.trim()).filter(s=>s.length>2).forEach(u =>
        _uspOptions.push({text:u, type:'usp', product:prod.name}))
      if(prod.painpoint) prod.painpoint.split(/[,·]/).map(s=>s.trim()).filter(s=>s.length>2).forEach(p =>
        _uspOptions.push({text:p, type:'pain', product:prod.name}))
    }
  } else {
    // 전체 → 브랜드 기본 USP + 모든 제품 USP
    const uspItems = (b.usp||'').split(/[,\n·]/).map(s=>s.trim()).filter(s=>s.length>2)
    const painItems = (b.painpoint||'').split(/[,\n·]/).map(s=>s.trim()).filter(s=>s.length>2)
    uspItems.forEach(u => _uspOptions.push({text:u, type:'usp'}))
    painItems.forEach(p => _uspOptions.push({text:p, type:'pain'}))

    // 학습된 제품별 USP 추가
    const existing = new Set(_uspOptions.map(o=>o.text))
    _brandProducts.forEach(prod => {
      if(prod.usp) prod.usp.split(/[,·]/).map(s=>s.trim()).filter(s=>s.length>2).forEach(u => {
        if(!existing.has(u)){ _uspOptions.push({text:u, type:'usp', product:prod.name}); existing.add(u) }
      })
      if(prod.painpoint) prod.painpoint.split(/[,·]/).map(s=>s.trim()).filter(s=>s.length>2).forEach(p => {
        if(!existing.has(p)){ _uspOptions.push({text:p, type:'pain', product:prod.name}); existing.add(p) }
      })
    })
  }
}

// 제품 선택 변경
function onProductChange(){
  const brandId = document.getElementById('sel-brand')?.value
  const b = brands.find(x=>x.id===brandId)
  if(!b) return

  const productName = document.getElementById('sel-product')?.value || ''
  _buildUspOptions(b, productName)

  // 선택된 제품의 USP를 자동으로 태그에 추가
  _selectedUsps = []
  if(productName){
    _uspOptions.forEach(o => _selectedUsps.push({text:o.text, type:o.type}))
  }
  renderUspTags()
  hideUspDropdown()
  if(typeof updateStepButtons==='function') updateStepButtons()
}

function renderUspTags(){
  const wrap = document.getElementById('usp-tags')
  if(!wrap) return
  if(!_selectedUsps.length){
    wrap.innerHTML = '<span style="font-size:10px;color:var(--text3)">아래에서 선택하거나 직접 입력하세요</span>'
    return
  }
  wrap.innerHTML = _selectedUsps.map((t,i) => {
    const color = t.type==='usp' ? 'var(--purple)' : t.type==='pain' ? 'var(--red,#ff5f57)' : 'var(--accent)'
    return `<span style="display:inline-flex;align-items:center;gap:3px;padding:3px 8px;background:${color}15;border:1px solid ${color}40;border-radius:12px;font-size:10px;color:${color}">${t.text}<span onclick="_selectedUsps.splice(${i},1);renderUspTags()" style="cursor:pointer;font-size:8px;opacity:.7">✕</span></span>`
  }).join('')
}

function showUspDropdown(){
  filterUspDropdown()
  document.getElementById('usp-dropdown').style.display = 'block'
  // 바깥 클릭 시 닫기
  setTimeout(()=>{
    document.addEventListener('click', _uspClickOutside, {once:true})
  }, 100)
}

function _uspClickOutside(e){
  const dd = document.getElementById('usp-dropdown')
  const input = document.getElementById('usp-input')
  if(!dd.contains(e.target) && e.target!==input) hideUspDropdown()
  else document.addEventListener('click', _uspClickOutside, {once:true})
}

function hideUspDropdown(){
  const dd = document.getElementById('usp-dropdown')
  if(dd) dd.style.display = 'none'
}

function filterUspDropdown(){
  const dd = document.getElementById('usp-dropdown')
  if(!dd) return
  const q = (document.getElementById('usp-input')?.value||'').toLowerCase()
  const already = new Set(_selectedUsps.map(t=>t.text))

  // 기존 옵션 필터링
  const filtered = _uspOptions.filter(o => !already.has(o.text) && (!q || o.text.toLowerCase().includes(q)))

  let html = ''
  if(filtered.length){
    // USP 그룹
    const usps = filtered.filter(o=>o.type==='usp')
    const pains = filtered.filter(o=>o.type==='pain')
    if(usps.length){
      html += '<div style="padding:4px 10px;font-size:9px;color:var(--purple);font-weight:600;background:var(--s3)">USP</div>'
      html += usps.map(o => {
        const prodLabel = o.product ? `<span style="font-size:9px;color:var(--text3);margin-left:4px">[${o.product}]</span>` : ''
        return `<div class="usp-dd-item" onclick="selectUspOption('${o.text.replace(/'/g,"\\'")}','usp')" style="padding:6px 10px;font-size:11px;color:var(--text);cursor:pointer;transition:background .1s" onmouseover="this.style.background='var(--s3)'" onmouseout="this.style.background='none'">${o.text}${prodLabel}</div>`
      }).join('')
    }
    if(pains.length){
      html += '<div style="padding:4px 10px;font-size:9px;color:var(--red,#ff5f57);font-weight:600;background:var(--s3)">페인포인트</div>'
      html += pains.map(o => {
        const prodLabel = o.product ? `<span style="font-size:9px;color:var(--text3);margin-left:4px">[${o.product}]</span>` : ''
        return `<div class="usp-dd-item" onclick="selectUspOption('${o.text.replace(/'/g,"\\'")}','pain')" style="padding:6px 10px;font-size:11px;color:var(--text);cursor:pointer;transition:background .1s" onmouseover="this.style.background='var(--s3)'" onmouseout="this.style.background='none'">${o.text}${prodLabel}</div>`
      }).join('')
    }
  }
  if(q && q.length>1){
    html += `<div onclick="addUspFromInput()" style="padding:6px 10px;font-size:11px;color:var(--accent);cursor:pointer;border-top:1px solid var(--border)" onmouseover="this.style.background='var(--s3)'" onmouseout="this.style.background='none'">+ "${document.getElementById('usp-input').value}" 추가</div>`
  }
  if(!html) html = '<div style="padding:8px 10px;font-size:10px;color:var(--text3)">옵션 없음</div>'
  dd.innerHTML = html
  dd.style.display = 'block'
}

function selectUspOption(text, type){
  if(_selectedUsps.some(t=>t.text===text)) return
  _selectedUsps.push({text, type})
  renderUspTags()
  document.getElementById('usp-input').value = ''
  filterUspDropdown()
}

function addUspFromInput(){
  const input = document.getElementById('usp-input')
  const text = input?.value.trim()
  if(!text || _selectedUsps.some(t=>t.text===text)) return
  _selectedUsps.push({text, type:'custom'})
  renderUspTags()
  input.value = ''
  hideUspDropdown()
}

// 선택된 USP/페인포인트 텍스트 반환 (generation에서 사용)
function getSelectedUsps(){
  return _selectedUsps.map(t=>t.text)
}
