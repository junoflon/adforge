// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
// Supabase settings 테이블에서 API 키 자동 로드
async function loadSettingsFromSB(){
  try {
    const r = await fetch('https://nroylubtytcslujylicw.supabase.co/rest/v1/settings?select=*',{
      headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ'}
    })
    if(!r.ok) return
    const rows = await r.json()
    if(!rows.length) return
    const map = {}
    rows.forEach(r=>{ map[r.key]=r.value })
    // localStorage에 저장 (K 객체가 읽을 수 있도록)
    const existing = JSON.parse(localStorage.getItem('af_keys')||'{}')
    const merged = {
      foreplay:  map['foreplay_api_key']  || existing.foreplay  || '',
      claude:    map['claude_api_key']    || existing.claude    || '',
      eleven:    map['elevenlabs_api_key']|| existing.eleven    || '',
      voiceId:   map['elevenlabs_voice_id']|| existing.voiceId  || '21m00Tcm4TlvDq8ikWAM'
    }
    localStorage.setItem('af_keys', JSON.stringify(merged))

    console.log('✅ Supabase settings에서 API 키 로드 완료')
  } catch(e) {
    console.warn('settings 로드 실패, 기본값 사용:', e.message)
    // 실패해도 기본값으로 localStorage 세팅
    const existing = JSON.parse(localStorage.getItem('af_keys')||'{}')
    if(!existing.foreplay) {
      localStorage.setItem('af_keys', JSON.stringify({
        foreplay: '',
        claude: '',
        eleven: '',
        voiceId: '21m00Tcm4TlvDq8ikWAM'
      }))
    }
  }
}

async function init(){
  updateSbDot()

  // 0. 외부 프롬프트 파일 로드
  await loadPromptFiles()

  // 1. Supabase settings에서 API 키 자동 로드
  await loadSettingsFromSB()

  // 2. API 키 UI 업데이트
  document.getElementById('k-fp').value = K.fp
  document.getElementById('k-cl').value = K.cl
  document.getElementById('k-el').value = K.el
  document.getElementById('k-vo').value = K.vo

  // 3. 필수 키 없으면 설정 모달 자동 오픈
  if(!K.cl || !K.fp){
    setTimeout(()=>openModal('modal-api'), 800)
  }

  // 3. Supabase 모달 URL/Key 자동 채우기
  const sbCfg=SB.getCfg()
  if(sbCfg.url) document.getElementById('sb-url').value=sbCfg.url
  if(sbCfg.key) document.getElementById('sb-key').value=sbCfg.key

  // 4. 브랜드 로드 (Supabase 우선)
  brands = await DB.loadBrands()

  renderBrandDrop()
  updateDots()
  // Spyder 브랜드 미리 로드
  loadSpyderBrands()
  // 수동 경쟁사 로드
  loadManualBrands()
  // TTS 설정 로드
  loadTTSSettings()
  const obs = new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible') })
  },{threshold:.1})
  document.querySelectorAll('.stage').forEach(s=>obs.observe(s))
}
init()

function updateDots(){
  sd('dot-fp', K.fp.length>4)
  sd('dot-cl', K.cl.startsWith('sk-ant'))
  sd('dot-el', K.el.length>10)
}
function sd(id,on){ document.getElementById(id)?.classList.toggle('on',!!on) }
function saveKeys(){
  K.save(
    document.getElementById('k-fp').value.trim(),
    document.getElementById('k-cl').value.trim(),
    document.getElementById('k-el').value.trim(),
    document.getElementById('k-vo').value.trim()
  )
  updateDots(); closeModal('modal-api'); toast('설정 저장됨 ✓','ok')
}
function openModal(id){ document.getElementById(id)?.classList.add('open') }
function closeModal(id){ document.getElementById(id)?.classList.remove('open') }
