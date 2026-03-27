// ══════════════════════════════════════════════
// TTS
// ══════════════════════════════════════════════
// ══════════════════════════════════════════════
// TTS 설정
// ══════════════════════════════════════════════
let _allVoices = []
let _ttsSettings = {
  voiceId: '21m00Tcm4TlvDq8ikWAM',
  voiceName: 'Rachel',
  stability: 0.5,
  similarity: 0.75,
  style: 0,
  speed: 1.0,
  model: 'eleven_multilingual_v2'
}

// TTS 설정 로드 (Supabase settings)
async function loadTTSSettings(){
  try {
    const r = await fetch('https://nroylubtytcslujylicw.supabase.co/rest/v1/settings?key=in.(elevenlabs_api_key,elevenlabs_voice_id,tts_settings)&select=key,value',{
      headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ'}
    })
    if(r.ok){
      const rows = await r.json()
      const map = {}
      rows.forEach(r=>map[r.key]=r.value)
      if(map.elevenlabs_api_key) {
        K.save(K.fp, K.cl, map.elevenlabs_api_key, map.elevenlabs_voice_id||'21m00Tcm4TlvDq8ikWAM')
      }
      if(map.tts_settings){
        try{ Object.assign(_ttsSettings, JSON.parse(map.tts_settings)) }catch(e){}
      }
    }
  } catch(e){}
}

function ttsApiChanged(){
  document.getElementById('tts-connect-status').style.display='none'
}

async function openTTSModal(){
  // 현재 설정 UI에 반영
  const apiInput = document.getElementById('tts-api-key')
  if(apiInput) apiInput.value = K.el||''
  document.getElementById('tts-stability').value = _ttsSettings.stability
  document.getElementById('stab-v').textContent = _ttsSettings.stability.toFixed(2)
  document.getElementById('tts-similarity').value = _ttsSettings.similarity
  document.getElementById('sim-v').textContent = _ttsSettings.similarity.toFixed(2)
  document.getElementById('tts-style').value = _ttsSettings.style
  document.getElementById('style-v').textContent = _ttsSettings.style.toFixed(2)
  document.getElementById('tts-speed').value = _ttsSettings.speed
  document.getElementById('speed-v').textContent = _ttsSettings.speed.toFixed(2)
  document.getElementById('tts-model').value = _ttsSettings.model

  // 이미 연결된 상태면 목소리 목록 표시
  if(K.el && _allVoices.length){
    showVoiceSection()
    renderVoiceList(_allVoices)
  } else if(K.el){
    connectElevenLabs()
  }
  openModal('modal-tts')
}

async function connectElevenLabs(){
  const apiKey = document.getElementById('tts-api-key').value.trim()
  if(!apiKey){ toast('API 키를 입력해주세요','err'); return }

  const btn = document.getElementById('tts-connect-btn')
  const status = document.getElementById('tts-connect-status')
  btn.disabled=true; btn.innerHTML='<span class="spin">◌</span>'
  status.style.display='none'

  try {
    // 1. API 키 검증 + 목소리 목록 가져오기
    const r = await fetch('https://api.elevenlabs.io/v1/voices',{
      headers:{'xi-api-key': apiKey.replace(/[^\x00-\x7F]/g,'').trim()}
    })
    if(!r.ok) throw new Error('API 키가 올바르지 않아요')
    const d = await r.json()
    _allVoices = d.voices.map(v=>{
      return {
        id: v.voice_id,
        name: v.name,
        category: v.category,
        labels: v.labels||{},
        preview_url: v.preview_url,
        description: v.description||''
      }
    })

    // 2. 임시 저장 + UI 업데이트
    K.save(K.fp, K.cl, apiKey, _ttsSettings.voiceId)
    status.style.display='block'
    status.style.color='var(--green)'
    status.textContent=`✓ 연결 성공! 목소리 ${_allVoices.length}개 로드됨`

    // 3. ElevenLabs dot 업데이트
    document.getElementById('dot-el')?.classList.add('on')
    document.getElementById('el-status-txt').textContent='연결됨 ✓'
    document.getElementById('el-status-txt').style.color='var(--green)'

    showVoiceSection()
    renderVoiceList(_allVoices)

  } catch(e){
    status.style.display='block'
    status.style.color='var(--red,#ff5f57)'
    status.textContent='✕ ' + e.message
  }
  btn.disabled=false; btn.innerHTML='연결'
}

function showVoiceSection(){
  document.getElementById('tts-voice-section').style.display='block'
  document.getElementById('tts-settings-section').style.display='block'
  document.getElementById('tts-voice-count').textContent=_allVoices.length+'개'
}

function renderVoiceList(voices){
  const list = document.getElementById('tts-voice-list')
  if(!voices.length){ list.innerHTML='<div style="font-size:11px;color:var(--text3);text-align:center;padding:12px">목소리가 없어요</div>'; return }
  list.innerHTML = voices.map(v=>{
    const isSel = v.id === _ttsSettings.voiceId
    const lang = v.labels?.language||v.labels?.accent||''
    const gender = v.labels?.gender||''
    const age = v.labels?.age||''
    const use = v.labels?.use_case||''
    const tags = [lang,gender,age,use].filter(Boolean).slice(0,3).join(' · ')
    return `<div onclick="selectVoice('${v.id}','${v.name.replace(/'/g,"\\'")}')"
      style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:${isSel?'var(--purple-dim)':'var(--s2)'};border:1px solid ${isSel?'var(--purple)':'var(--border)'};border-radius:var(--r);cursor:pointer;transition:all .13s"
      id="vitem-${v.id}">
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:600;color:${isSel?'var(--purple)':'var(--text)'}">${v.name}</div>
        ${tags?`<div style="font-size:9px;color:var(--text3);margin-top:1px">${tags}</div>`:''}
      </div>
      <span style="font-size:9px;padding:1px 5px;border-radius:4px;background:var(--s3);color:var(--text3);text-transform:uppercase;flex-shrink:0">${v.category||''}</span>
      ${v.preview_url?`<button onclick="event.stopPropagation();playVoicePreview('${v.preview_url}')" style="font-size:10px;background:none;border:none;cursor:pointer;color:var(--text3);flex-shrink:0;padding:2px 4px" title="미리 듣기">▶</button>`:''}
    </div>`
  }).join('')
}

function selectVoice(id, name){
  _ttsSettings.voiceId = id
  _ttsSettings.voiceName = name
  // 선택 UI 업데이트
  document.querySelectorAll('[id^="vitem-"]').forEach(el=>{
    const vid = el.id.replace('vitem-','')
    const isSel = vid===id
    el.style.background = isSel?'var(--purple-dim)':'var(--s2)'
    el.style.borderColor = isSel?'var(--purple)':'var(--border)'
    el.querySelector('div>div').style.color = isSel?'var(--purple)':'var(--text)'
  })
  toast('🎙 '+name+' 선택됨','ok')
}

function playVoicePreview(url){
  const player = document.getElementById('tts-preview-player')
  player.style.display='block'
  const audio = player.querySelector('audio')
  audio.src = url
  audio.play()
}

function filterVoices(query){
  const q = query.toLowerCase()
  const filtered = q ? _allVoices.filter(v=>
    v.name.toLowerCase().includes(q) ||
    Object.values(v.labels).some(l=>String(l).toLowerCase().includes(q))
  ) : _allVoices
  renderVoiceList(filtered)
}

let _voiceCategoryFilter = 'all'
function filterVoiceCategory(cat){
  _voiceCategoryFilter = cat
  document.querySelectorAll('[id^="vcat-"]').forEach(btn=>{
    btn.classList.toggle('on', btn.id==='vcat-'+cat)
  })
  const filtered = cat==='all' ? _allVoices : _allVoices.filter(v=>v.category===cat)
  renderVoiceList(filtered)
}

async function previewTTS(){
  if(!K.el){ toast('API 키를 먼저 연결해주세요','err'); return }
  const btn = document.getElementById('tts-preview-btn')
  btn.disabled=true; btn.innerHTML='<span class="spin">◌</span> 생성 중...'
  try {
    const text = '안녕하세요! 이 목소리로 광고 대본을 읽어드릴게요. 자연스럽게 들리나요?'
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${_ttsSettings.voiceId}`,{
      method:'POST',
      headers:{'Accept':'audio/mpeg','Content-Type':'application/json','xi-api-key':K.el},
      body:JSON.stringify({
        text, model_id:document.getElementById('tts-model').value,
        voice_settings:{
          stability:parseFloat(document.getElementById('tts-stability').value),
          similarity_boost:parseFloat(document.getElementById('tts-similarity').value),
          style:parseFloat(document.getElementById('tts-style').value),
          use_speaker_boost:true
        },
        speed: parseFloat(document.getElementById('tts-speed').value)
      })
    })
    if(!r.ok) throw new Error('TTS 실패')
    const blob=await r.blob()
    const url=URL.createObjectURL(blob)
    const player = document.getElementById('tts-preview-player')
    player.style.display='block'
    const audio = player.querySelector('audio')
    audio.src=url; audio.play()
  } catch(e){ toast('미리 듣기 실패: '+e.message,'err') }
  btn.disabled=false; btn.innerHTML='▶ 미리 듣기'
}

async function saveTTSSettings(){
  const apiKey = document.getElementById('tts-api-key').value.trim()
  _ttsSettings.stability = parseFloat(document.getElementById('tts-stability').value)
  _ttsSettings.similarity = parseFloat(document.getElementById('tts-similarity').value)
  _ttsSettings.style = parseFloat(document.getElementById('tts-style').value)
  _ttsSettings.speed = parseFloat(document.getElementById('tts-speed').value)
  _ttsSettings.model = document.getElementById('tts-model').value

  // API 키 저장
  if(apiKey) K.save(K.fp, K.cl, apiKey, _ttsSettings.voiceId)

  // Supabase에 TTS 설정 저장
  const pairs = [
    {key:'tts_settings', value:JSON.stringify(_ttsSettings)},
    {key:'elevenlabs_voice_id', value:_ttsSettings.voiceId}
  ]
  if(apiKey) pairs.push({key:'elevenlabs_api_key', value:apiKey})

  Promise.all(pairs.map(p=>
    fetch('https://nroylubtytcslujylicw.supabase.co/rest/v1/settings?on_conflict=key',{
      method:'POST',
      headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3lsdWJ0eXRjc2x1anlsaWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDA2MjEsImV4cCI6MjA4OTQ3NjYyMX0.2jgPGouTF-OW9GCkrtjJbLDsaCYLKXGtMY89t-eXULQ','Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify(p)
    })
  )).then(()=>showSaveIndicator('☁️ TTS 설정 저장됨 ✓'))

  closeModal('modal-tts')
  toast(`🎙 ${_ttsSettings.voiceName||'설정'} 저장됐어요`,'ok')
}


async function makeTTS(idx){
  if(!K.el){ openTTSModal(); toast('ElevenLabs API 키를 먼저 설정해주세요','err'); return }
  const s=ttsScripts[idx]
  const text=`${s.hook} ${s.body} ${s.cta}`
  document.getElementById('e4').style.display='none'
  const out=document.getElementById('tts-out')
  out.style.display='flex'
  stageSet(4,'run')
  scrollTo(4)
  const lid='tts-card-'+idx
  // 기존 카드가 있으면 교체, 없으면 새로 추가
  let existing = document.getElementById(lid)
  if(existing){
    existing.innerHTML=`<div class="tts-body" style="color:var(--text3);font-family:'JetBrains Mono',monospace;font-size:11px"><span class="spin">◌</span> TTS 다시 생성 중 (${_ttsSettings.voiceName||'기본 목소리'})...</div>`
  } else {
    const loader=document.createElement('div'); loader.id=lid; loader.className='tts-card'
    loader.innerHTML=`<div class="tts-body" style="color:var(--text3);font-family:'JetBrains Mono',monospace;font-size:11px"><span class="spin">◌</span> TTS 생성 중 (${_ttsSettings.voiceName||'기본 목소리'})...</div>`
    out.prepend(loader)
  }
  try {
    const r=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${_ttsSettings.voiceId}`,{
      method:'POST',
      headers:{'Accept':'audio/mpeg','Content-Type':'application/json','xi-api-key':K.el.replace(/[^\x00-\x7F]/g,'').trim()},
      body:JSON.stringify({
        text,
        model_id: _ttsSettings.model||'eleven_multilingual_v2',
        voice_settings:{
          stability: _ttsSettings.stability||0.5,
          similarity_boost: _ttsSettings.similarity||0.75,
          style: _ttsSettings.style||0,
          use_speaker_boost: true
        },
        speed: _ttsSettings.speed||1.0
      })
    })
    if(!r.ok) throw new Error('ElevenLabs 오류 ('+r.status+')')
    const blob=await r.blob(); const url=URL.createObjectURL(blob)
    document.getElementById(lid).outerHTML=`
      <div class="tts-card" id="${lid}">
        <div class="tts-hdr">
          <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text3)">TTS ${String(s.id).padStart(2,'0')} · ${_ttsSettings.voiceName||''}</span>
          <span style="font-size:11px;color:var(--green)">✓ 완료</span>
        </div>
        <div class="tts-body">
          <div class="tts-hook">"${s.hook}"</div>
          <audio controls src="${url}"></audio>
          <div style="display:flex;gap:6px;margin-top:8px">
            <a href="${url}" download="tts_${s.id}.mp3" class="btn grn sm">⬇ 다운로드</a>
            <button class="btn sm pur" onclick="makeTTS(${idx})" style="font-size:10px">🔄 다시 뽑기</button>
            <button class="btn sm" onclick="openTTSModal()" style="font-size:10px">⚙ 목소리 변경</button>
          </div>
        </div>
      </div>`
    stageSet(4,'done'); toast(`🎙 TTS 완료! (${_ttsSettings.voiceName})`,'ok')
    scrollTo(5)
  } catch(e){ document.getElementById(lid)?.remove(); stageSet(4,'err'); toast('TTS 실패: '+e.message,'err') }
}

// ══════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════
// 대본을 텍스트로 변환 (lines 형식 지원)
function _scriptToText(s){
  return `[훅] ${s.hook}\n\n[본문] ${s.body}\n\n[CTA] ${s.cta}`
}

function cpScript(idx){ navigator.clipboard.writeText(_scriptToText(ttsScripts[idx])); toast('복사됨 ✓','ok') }
function exportAll(){
  if(!ttsScripts.length){ toast('생성된 대본이 없어요','err'); return }
  const txt=ttsScripts.map(s=>`=== SCRIPT ${s.id} (${s.style||''}) ===\n${_scriptToText(s)}\n`).join('\n')
  navigator.clipboard.writeText(txt); toast(`${ttsScripts.length}개 대본 복사됨 ✓`,'ok')
}
function exportTxt(){
  if(!ttsScripts.length){ toast('생성된 대본이 없어요','err'); return }
  const txt=ttsScripts.map(s=>`=== SCRIPT ${s.id} (${s.style||''}) ===\n${_scriptToText(s)}\n`).join('\n')
  const blob=new Blob([txt],{type:'text/plain'}); const url=URL.createObjectURL(blob)
  const a=document.createElement('a'); a.href=url; a.download='adforge_scripts.txt'; a.click()
  URL.revokeObjectURL(url); toast('TXT 다운로드 완료 ✓','ok')
}
