// ══════════════════════════════════════════════
// SUPABASE ENGINE
// ══════════════════════════════════════════════
const SB = {
  // ── 하드코딩된 Supabase 설정 (팀원 입력 불필요) ──
  _DEFAULT: {
    url: 'https://nroylubtytcslujylicw.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ'
  },
  getCfg(){
    // 항상 기본값 사용 (localStorage 오버라이드 가능)
    try{
      const saved = JSON.parse(localStorage.getItem('af_sb_cfg')||'{}')
      return (saved.url && saved.key) ? saved : this._DEFAULT
    }catch(e){ return this._DEFAULT }
  },
  saveCfg(cfg){ localStorage.setItem('af_sb_cfg', JSON.stringify(cfg)) },
  clearCfg(){ localStorage.removeItem('af_sb_cfg') },
  isConnected(){ const c=this.getCfg(); return !!(c.url&&c.key) },

  async _fetch(path, opts={}){
    const c=this.getCfg()
    if(!c.url||!c.key) throw new Error('Supabase 미연결')
    const res=await fetch(c.url+'/rest/v1'+path,{
      ...opts,
      headers:{
        'apikey':c.key,
        'Authorization':'Bearer '+c.key,
        'Content-Type':'application/json',
        'Prefer': opts.prefer||'return=representation',
        ...(opts.headers||{})
      }
    })
    if(!res.ok){
      const e=await res.json().catch(()=>({}))
      throw new Error(e.message||e.hint||`Supabase 오류 ${res.status}`)
    }
    const txt=await res.text()
    return txt ? JSON.parse(txt) : []
  },

  async getAll(table){
    const r=await fetch('https://nroylubtytcslujylicw.supabase.co/rest/v1/'+table+'?select=*',{
      headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ'}
    })
    if(!r.ok) return []
    return r.json()
  },

  async upsert(table, rows){
    const r=await fetch('https://nroylubtytcslujylicw.supabase.co/rest/v1/'+table+'?on_conflict=id',{
      method:'POST',
      headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify(Array.isArray(rows)?rows:[rows])
    })
    if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.message||'DB '+r.status)}
    return r
  },

  async delete(table, id){
    await fetch('https://nroylubtytcslujylicw.supabase.co/rest/v1/'+table+'?id=eq.'+id,{
      method:'DELETE',
      headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ'}
    })
  },

  async deleteAll(table){
    await fetch('https://nroylubtytcslujylicw.supabase.co/rest/v1/'+table+'?id=neq.impossible_value_xyz',{
      method:'DELETE',
      headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ'}
    })
  },

  async test(){
    const res=await this._fetch('/brands?select=id&limit=1')
    return true
  }
}

// row 변환 헬퍼
function sbToBrand(r){
  // context에 products JSON이 저장되어 있으면 파싱
  let context = r.context||''
  let products = []
  try {
    if(context.startsWith('[')){ products=JSON.parse(context); context='' }
    else if(context.includes('"products":')){
      const parsed=JSON.parse(context); products=parsed.products||[]; context=parsed.context||''
    }
  } catch(e){}
  return {
    id:r.id, name:r.name, category:r.category||'',
    painpoint:r.painpoint||'', usp:r.usp||'', tone:r.tone||'',
    prohibit:r.prohibit||'', context, color:r.color||'#9b72fb',
    products,
    learnedContext:r.learned_context||null,
    learnedStack:Array.isArray(r.learned_stack)?r.learned_stack:[],
    urls:r.urls?r.urls.split('\n').filter(Boolean):[]
  }
}
function brandToSb(b){
  // products를 context 필드에 JSON으로 저장
  const ctxData = b.products?.length
    ? JSON.stringify({context:b.context||'', products:b.products})
    : b.context||''
  return {
    id:b.id, name:b.name, category:b.category||'',
    painpoint:b.painpoint||'', usp:b.usp||'', tone:b.tone||'',
    prohibit:b.prohibit||'', context:ctxData, color:b.color||'#9b72fb',
    learned_context:b.learnedContext||null,
    learned_stack:b.learnedStack?.length?b.learnedStack:null,
    urls:b.urls?.filter(u=>u).join('\n')||null
  }
}

// DB 헬퍼 — localStorage + Supabase 동기화
const DB = {
  _saveTimer: null,

  async loadBrands(){
    try {
      const r = await fetch('https://nroylubtytcslujylicw.supabase.co/rest/v1/brands?select=*&order=created_at',{
        headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ'}
      })
      if(r.ok){
        const rows = await r.json()
        return rows.map(sbToBrand)
      }
    } catch(e){ console.warn('Supabase 브랜드 로드 실패:', e.message) }
    return JSON.parse(localStorage.getItem('af_brands')||'[]')
  },

  saveBrands(data){
    const payload = data.map(brandToSb)
    // Supabase에 직접 저장 (타이머 없이, await 없이)
    fetch('https://nroylubtytcslujylicw.supabase.co/rest/v1/brands?on_conflict=id',{method:'POST',headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)})
      .then(r=>{ if(r.ok) showSaveIndicator('☁️ Supabase 저장됨 ✓'); else showSaveIndicator('⚠️ Supabase 저장 실패 ('+r.status+')', true) })
      .catch(e=>{ console.warn('brands 저장 실패:',e.message); showSaveIndicator('⚠️ 로컬 저장됨 — 서버 오류', true) })
  }
}

let _siTimer
function showSaveIndicator(msg, warn=false){
  let el=document.getElementById('save-ind')
  if(!el){
    el=document.createElement('div'); el.id='save-ind'
    el.style.cssText='position:fixed;bottom:58px;right:24px;font-size:10px;font-family:"JetBrains Mono",monospace;padding:4px 10px;border-radius:var(--r);z-index:400;opacity:0;transition:opacity .3s;pointer-events:none'
    document.body.appendChild(el)
  }
  el.textContent=msg
  el.style.background=warn?'var(--gold-dim)':'var(--green-dim)'
  el.style.color=warn?'var(--gold)':'var(--green)'
  el.style.border=`1px solid ${warn?'var(--gold)':'var(--green)'}`
  el.style.opacity='1'
  clearTimeout(_siTimer)
  _siTimer=setTimeout(()=>{ el.style.opacity='0' }, 2500)
}

function updateSbDot(){
  const dot=document.getElementById('dot-sb')
  const lbl=document.getElementById('lbl-sb')
  if(!dot) return
  if(SB.isConnected()){
    dot.className='dot on'
    if(lbl) lbl.textContent='Supabase'
  } else {
    dot.className='dot warn'
    if(lbl) lbl.textContent='Supabase'
  }
}

async function testSb(){
  const url=document.getElementById('sb-url').value.trim()
  const key=document.getElementById('sb-key').value.trim()
  if(!url||!key){ toast('URL과 키를 모두 입력해주세요','err'); return }
  const btn=document.getElementById('sb-test-btn')
  const res=document.getElementById('sb-test-result')
  btn.disabled=true; btn.innerHTML='<span class="spin">◌</span> 연결 중...'
  res.style.display='none'
  SB.saveCfg({url,key})
  try {
    await SB.test()
    res.style.display='block'
    res.style.background='var(--green-dim)'; res.style.border='1px solid rgba(45,212,122,.3)'; res.style.color='var(--green)'
    res.innerHTML='✓ 연결 성공!<br>brands 테이블이 확인됐어요. 저장 버튼을 눌러 확정하세요.'
    updateSbDot()
  } catch(e){
    res.style.display='block'
    res.style.background='var(--red-dim)'; res.style.border='1px solid rgba(255,79,106,.3)'; res.style.color='var(--red)'
    res.innerHTML=`✗ ${e.message}<br><span style="color:var(--text3)">URL과 키를 다시 확인해주세요</span>`
  }
  btn.disabled=false; btn.textContent='연결 테스트'
}

function saveSb(){
  const url=document.getElementById('sb-url').value.trim()
  const key=document.getElementById('sb-key').value.trim()
  if(!url||!key){ toast('URL과 키를 입력해주세요','err'); return }
  SB.saveCfg({url,key})
  updateSbDot()
  closeModal('modal-sb')
  toast('Supabase 연결 저장됨 ✓','ok')
  // 브랜드 다시 로드
  DB.loadBrands().then(data=>{ brands=data; renderBrandDrop() })
}

function disconnectSb(){
  SB.clearCfg()
  updateSbDot()
  closeModal('modal-sb')
  toast('Supabase 연결 해제됨')
}
