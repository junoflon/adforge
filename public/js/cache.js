// ══════════════════════════════════════════════
// CACHE
// ══════════════════════════════════════════════

const SB_HEADERS = {
  'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ',
  'Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ',
  'Content-Type':'application/json'
}
const SB_REST = 'https://nroylubtytcslujylicw.supabase.co/rest/v1'

// ── 간단한 문자열 해시 ──
function _hash(str){
  let h = 0
  for(let i=0;i<str.length;i++){ h=((h<<5)-h)+str.charCodeAt(i); h|=0 }
  return Math.abs(h).toString(36)
}

// ── 생성 입력값 지문 (레퍼런스/브랜드/설정 변경 감지) ──
function genInputHash(){
  const parts = []
  // 레퍼런스 데이터
  const ref = (typeof getRefData === 'function') ? getRefData() : null
  if(ref){
    if(ref.type==='script') parts.push('rs:'+_hash(ref.text||'')+(ref.style||''))
    else if(ref.type==='video') parts.push('rv:'+(ref.urls||[]).join(','))
    else if(ref.type==='image') parts.push('ri:'+(ref.images?.length||0)+(ref.note||''))
  } else {
    parts.push('r0')
  }
  // 브랜드 설정
  const brandId = document.getElementById('sel-brand')?.value||''
  if(brandId){
    const b = (typeof brands!=='undefined') ? brands.find(x=>x.id===brandId) : null
    if(b) parts.push('b:'+_hash(b.name+(b.painpoint||'')+(b.usp||'')+(b.tone||'')+(b.prohibit||'')+(b.learnedContext?.slice(0,100)||'')))
  }
  // 대본 설정
  parts.push(document.getElementById('i-cnt')?.value||'3')
  parts.push(document.getElementById('i-adtype')?.selectedIndex||'0')
  parts.push(document.getElementById('i-tone')?.selectedIndex||'0')
  parts.push(document.getElementById('i-dur')?.value||'30')
  // 프롬프트 커스터마이징
  if(typeof getPrompts === 'function'){
    const p = getPrompts()
    parts.push(_hash(p.script.template+p.hooking.template))
  }
  return _hash(parts.join('|'))
}

// ══════════════════════════════════════════════
// 1. 광고 수집 캐시 (Stage 1) — 입력 변경 무관, 24시간 유지
// ══════════════════════════════════════════════
async function loadAdsCache(brandIds){
  const keyPrefix = brandIds.sort().join('|')
  if(SB.isConnected()){
    try {
      const rows = await SB.getAll('ads_cache')
      const row = rows.find(r=>r.id===keyPrefix)
      if(row && Date.now()-row.fetched_at < 24*60*60*1000){
        const parsed = JSON.parse(row.data_json||'[]')
        if(parsed.length) return parsed
      }
    } catch(e){}
  }
  try {
    const local = JSON.parse(localStorage.getItem('af_ads_cache')||'{}')
    const row = local[keyPrefix]
    if(row && Date.now()-row.fetched_at < 24*60*60*1000){
      const parsed = JSON.parse(row.data_json||'[]')
      if(parsed.length) return parsed
    }
  } catch(e){}
  return null
}

async function saveAdsCache(brandIds, adsData){
  const keyPrefix = brandIds.sort().join('|')
  const payload = {
    id: keyPrefix,
    brand_id: brandIds[0]||'',
    brand_name: adsData[0]?.brand||'',
    data_json: JSON.stringify(adsData),
    fetched_at: Date.now()
  }
  if(SB.isConnected()){
    try { await SB.upsert('ads_cache', [payload]) } catch(e){}
  }
  try {
    const local = JSON.parse(localStorage.getItem('af_ads_cache')||'{}')
    local[keyPrefix] = payload
    localStorage.setItem('af_ads_cache', JSON.stringify(local))
  } catch(e){}
}

// ══════════════════════════════════════════════
// 2. 분석 캐시 (Stage 2) — 분석만 저장, 대본 포함 안함
// ══════════════════════════════════════════════
function _analysisKey(brandIds){
  return 'anal_' + brandIds.join('_').slice(0, 80)
}

async function loadAnalysisCache(brandIds){
  const id = _analysisKey(brandIds)
  // Supabase
  try {
    const r = await fetch(SB_REST+'/ads_cache?id=eq.'+encodeURIComponent(id)+'&select=data_json,fetched_at', {headers:SB_HEADERS})
    if(r.ok){
      const rows = await r.json()
      if(rows.length && rows[0].data_json){
        const d = JSON.parse(rows[0].data_json)
        if(d.analysis && Date.now()-(d.generatedAt||0) < 7*24*60*60*1000) return d.analysis
      }
    }
  } catch(e){}
  // 로컬
  try {
    const local = JSON.parse(localStorage.getItem('af_'+id)||'null')
    if(local?.data_json){
      const d = JSON.parse(local.data_json)
      if(d.analysis && Date.now()-(d.generatedAt||0) < 7*24*60*60*1000) return d.analysis
    }
  } catch(e){}
  return null
}

async function saveAnalysisCache(brandIds, analysis){
  const id = _analysisKey(brandIds)
  const payload = {
    id,
    brand_id: brandIds[0]||'',
    brand_name: '',
    data_json: JSON.stringify({ analysis, generatedAt: Date.now() }),
    fetched_at: Date.now()
  }
  try {
    await fetch(SB_REST+'/ads_cache?on_conflict=id', {
      method:'POST', headers:{...SB_HEADERS, 'Prefer':'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify(payload)
    })
  } catch(e){}
  try { localStorage.setItem('af_'+id, JSON.stringify(payload)) } catch(e){}
}

