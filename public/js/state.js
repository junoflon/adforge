// ══════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════
const K = {
  get fp() { return _k().foreplay||'' },
  get cl() { return _k().claude||'' },
  get el() { const v=_k().eleven||''; return v.replace(/[^\x00-\x7F]/g,'').trim() },
  get vo() { return _k().voiceId||'21m00Tcm4TlvDq8ikWAM' },
  save(fp,cl,el,vo){
    const data={foreplay:fp,claude:cl,eleven:el,voiceId:vo||'21m00Tcm4TlvDq8ikWAM'}
    localStorage.setItem('af_keys',JSON.stringify(data))
    // Supabase settings 테이블에도 저장
    const pairs=[
      {key:'foreplay_api_key',value:fp},
      {key:'claude_api_key',value:cl},
      {key:'elevenlabs_api_key',value:el},
      {key:'elevenlabs_voice_id',value:vo||'21m00Tcm4TlvDq8ikWAM'}
    ]
    // settings 테이블에 각 키 upsert (key/value 구조)
    Promise.all(pairs.map(p=>
      fetch('https://nroylubtytcslujylicw.supabase.co/rest/v1/settings?on_conflict=key',{
        method:'POST',
        headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify(p)
      })
    )).then(()=>{ console.log('✅ API 키 Supabase 저장 완료'); showSaveIndicator('☁️ API 키 Supabase 저장됨 ✓') })
    .catch(e=>console.warn('API 키 Supabase 저장 실패:',e.message))
  }
}
function _k(){ try{return JSON.parse(localStorage.getItem('af_keys')||'{}')}catch(e){return {}} }

let brands      = []  // 서버에서 로드 (init()에서 채워짐)
let competitors = JSON.parse(localStorage.getItem('af_competitors')||'[]')
let mode        = 'brand'
let filters     = new Set(['active','video','image'])
let ads         = []
let sel         = new Set()
let analysis    = null
let scripts     = []
let ttsScripts  = []
let editBrandId = null
