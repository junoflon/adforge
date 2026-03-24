
// ══════════════════════════════════════════════
// GENERATION
// ══════════════════════════════════════════════
// 선택된 훅 저장 (3a에서 선택 → 3b에서 사용)
let _selectedHooks = []

// ── STEP 3a: 후킹 아이디어만 생성 ──
async function doGenHooks(brand, anal){
  const selUsps = (typeof getSelectedUsps==='function') ? getSelectedUsps() : []
  const topH=(anal.topHooks||[]).map((h,i)=>`${i+1}."${h.hook||h}"`).join('\n')

  // 레퍼런스 컨텍스트 구성
  const refData = (typeof getRefData === 'function') ? getRefData() : null
  let refCtx = ''
  if(refData){
    if(refData.type==='script')
      refCtx = `\n[참고 대본 레퍼런스 — 이 톤/말투/구조를 최우선으로 참고]\n${refData.text}${refData.style?'\n스타일: '+refData.style:''}`
    else if(refData.type==='topic')
      refCtx = `\n[대본 주제/방향 — 이 주제에 맞는 훅 생성]\n${refData.text}${refData.persona?'\n타겟: '+refData.persona:''}`
  }

  const hookPrompt=fillTemplate(getPrompts().hooking.template, {
    brandName: brand.name,
    category: brand.category||'미설정',
    painpoint: brand.painpoint||'미설정',
    usp: selUsps.length ? selUsps.join(', ') : (brand.usp||'미설정'),
    topHooks: topH,
    learnedHint: brand.learnedContext&&brand.learnedContext.includes('고객이 실제로')?'⚡ 학습된 고객 언어/리뷰 표현을 최대한 활용해서 공감형 후킹을 만드세요.':'',
    learnedContext: brand.learnedContext?'\n\n[브랜드 학습 데이터]\n'+brand.learnedContext:'',
    refContext: refCtx,
    prohibitRule: brand.prohibit?`\n- 금지: ${brand.prohibit}`:''
  })

  const hookFull = hookPrompt
  const r = await fetch('/api/claude',{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({prompt:hookFull, max_tokens:4000})
  })
  if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error?.message||`Claude ${r.status}`)}
  const d=await r.json()
  return _parseClaudeJSON(d).hooks || []
}

// ── STEP 3b: 선택된 훅으로 대본 생성 ──
async function doGenScripts(brand, anal, selectedHooks){
  const refData = (typeof getRefData === 'function') ? getRefData() : null
  let refCtx = ''
  if(refData){
    if(refData.type==='script')
      refCtx = `\n\n[참고 대본 레퍼런스]\n${refData.text}${refData.style?'\n스타일 지시: '+refData.style:''}`
    else if(refData.type==='topic')
      refCtx = `\n\n[대본 주제/방향]\n${refData.text}${refData.persona?'\n타겟 페르소나: '+refData.persona:''}`
  }

  const cnt = selectedHooks.length || parseInt(document.getElementById('i-cnt').value)||3
  const adType=document.getElementById('i-adtype').value
  const tone=document.getElementById('i-tone').value
  const durSec=parseInt(document.getElementById('i-dur')?.value)||30
  const durLabel=durSec>=60?(Math.floor(durSec/60)+'분'+(durSec%60?durSec%60+'초':'')):(durSec+'초')
  const targetChars=durSec*4
  const topH=(anal.topHooks||[]).map((h,i)=>`${i+1}."${h.hook||h}"`).join('\n')
  const hPats=(anal.hookPatterns||[]).map(p=>`- ${p.type||p.유형}:"${p.example||p.예시}"`).join('\n')
  const insights=(anal.strategicInsight||[]).join('\n')

  const selUsps = (typeof getSelectedUsps==='function') ? getSelectedUsps() : []
  const usedUsp = selUsps.length ? selUsps.join(', ') : (brand.usp||'미설정')

  // 선택된 훅을 프롬프트에 포함
  const hooksCtx = selectedHooks.length
    ? `\n\n[사용할 훅 문구 (반드시 이 훅들을 각 대본의 hook으로 사용)]\n${selectedHooks.map((h,i)=>`${i+1}. "${h.text}" (${h.pattern||''})`).join('\n')}`
    : ''

  const prompt=fillTemplate(getPrompts().script.template, {
    brandName: brand.name,
    category: brand.category||'미설정',
    painpoint: brand.painpoint||'미설정',
    usp: usedUsp,
    brandTone: brand.tone||'미설정',
    prohibitRule: brand.prohibit?`|금지:${brand.prohibit}`:'',
    summary: anal.summary||'',
    topHooks: topH,
    hookPatterns: hPats,
    insights: insights,
    toneAnalysis: anal.toneAnalysis||'',
    ctaPatterns: anal.ctaPatterns||'',
    adType: adType,
    tone: tone,
    count: cnt,
    targetChars: targetChars,
    duration: durLabel,
    refRule: refData?` 1-1)[중요] 참고 ${refData.type==='script'?'대본의 스타일·구조·톤을 최우선으로 반영':refData.type==='topic'?'주제/방향에 맞게 대본 작성':'레퍼런스 반영'}`:'',
    prohibitExtra: brand.prohibit?` 6)금지:${brand.prohibit}`:''
  })

  const learnedCtx=brand.learnedContext?`\n\n[학습된 브랜드 정보 + 고객 리뷰 인사이트]\n${brand.learnedContext}\n\n⚡ 위 정보 중 "고객이 실제로 쓰는 표현"은 훅에 그대로 활용하세요.`:''
  const fullPrompt=prompt+learnedCtx+refCtx+hooksCtx

  const r = await fetch('/api/claude',{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({prompt:fullPrompt, max_tokens:4096})
  })
  if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error?.message||`Claude ${r.status}`)}
  const d=await r.json()
  return (_parseClaudeJSON(d).scripts || []).map(_normalizeScript)
}

// 하위호환
async function doGen(brand,anal){
  const hooks = await doGenHooks(brand, anal)
  const scripts = await doGenScripts(brand, anal, hooks)
  return {scripts, hooks}
}

// lines 형식 → body 형식으로 통일
function _normalizeScript(s){
  // lines 배열이 있으면 body로 변환
  if(s.lines && Array.isArray(s.lines) && s.lines.length){
    const bodyParts = s.lines.map(l => {
      let line = ''
      if(l.direction) line += '[' + l.direction + ']|'
      if(l.speaker) line += l.speaker + ': '
      line += l.text || ''
      return line
    })
    s.body = bodyParts.join('|')
    if(!s.hook) s.hook = s.lines[0]?.text || ''
    if(!s.cta){
      const last = s.lines[s.lines.length-1]
      s.cta = last?.text || ''
    }
    delete s.lines
  }
  return s
}

// Claude 응답에서 JSON을 안전하게 추출
function _parseClaudeJSON(response){
  let raw = response.content.map(c=>c.text||'').join('')
  console.log('[Claude Raw] 길이:', raw.length)

  // 코드블록 제거
  raw = raw.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim()

  // JSON 객체 영역만 추출
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if(start===-1||end===-1) throw new Error('Claude 응답에서 JSON을 찾을 수 없습니다')
  let jsonStr = raw.slice(start, end+1)

  // trailing comma 제거
  jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']')

  // 1차: 그대로
  try { return JSON.parse(jsonStr) } catch(e){}

  // 2차: 문자열 안의 실제 줄바꿈을 \\n으로 이스케이프
  // "key": "value with\nnewline" → "key": "value with\\nnewline"
  try {
    let fixed = ''
    let inStr = false
    let esc = false
    for(let i=0; i<jsonStr.length; i++){
      const c = jsonStr[i]
      if(esc){ fixed+=c; esc=false; continue }
      if(c==='\\' && inStr){ fixed+=c; esc=true; continue }
      if(c==='"'){ inStr=!inStr; fixed+=c; continue }
      if(inStr && (c==='\n'||c==='\r')){ fixed+='\\n'; continue }
      if(inStr && c==='\t'){ fixed+=' '; continue }
      fixed+=c
    }
    // 구조 줄바꿈 제거
    fixed = fixed.replace(/[\n\r\t]/g, ' ')
    return JSON.parse(fixed)
  } catch(e){
    console.warn('[JSON Parse] 2차 실패:', e.message)
  }

  // 3차: 잘린 JSON 복구 — 응답이 max_tokens에서 잘렸을 때
  try {
    // 줄바꿈 제거 후 시도
    let clean = jsonStr.replace(/[\n\r\t]/g, ' ')
    // 마지막 완전한 객체까지만 잘라서 배열 닫기
    // hooks 배열: 마지막 완전한 } 찾기
    const lastComplete = clean.lastIndexOf('}')
    if(lastComplete > 0){
      let trimmed = clean.slice(0, lastComplete+1)
      // 배열과 객체 닫기
      const openBrackets = (trimmed.match(/\[/g)||[]).length - (trimmed.match(/\]/g)||[]).length
      const openBraces = (trimmed.match(/\{/g)||[]).length - (trimmed.match(/\}/g)||[]).length
      for(let i=0;i<openBrackets;i++) trimmed += ']'
      for(let i=0;i<openBraces;i++) trimmed += '}'
      // trailing comma 제거
      trimmed = trimmed.replace(/,\s*\]/g, ']').replace(/,\s*\}/g, '}')
      const result = JSON.parse(trimmed)
      console.log('[JSON Parse] 잘린 JSON 복구 성공')
      return result
    }
  } catch(e2){
    console.error('[JSON Parse] 최종 실패:', e2.message)
  }

  const preview = jsonStr.slice(0, 500).replace(/\n/g, '↵')
  throw new Error('JSON 파싱 실패. Claude 원본(앞500자): ' + preview)
}

function renderScripts(list){
  const e3b = document.getElementById('e3b')
  if(e3b) e3b.style.display='none'
  const out=document.getElementById('scripts-out')
  out.style.display='flex'
  out.innerHTML=list.map((s,i)=>`
    <div class="scard" style="animation-delay:${i*.07}s">
      <div class="scard-hdr">
        <span class="scard-num">SCRIPT ${String(s.id).padStart(2,'0')}</span>
        <span class="scard-style">${s.style||''}</span>
        ${s.hookType?`<span class="scard-fp">⚡FP: ${s.hookType}</span>`:''}
      </div>
      <div class="scard-body">
        <div class="slbl h">HOOK</div>
        <div class="s-hook">${s.hook||''}</div>
        <div class="slbl b">BODY</div>
        <div class="s-body">${s.body||''}</div>
        ${s.cta?'<div class="s-cta"><div class="s-cta-lbl">CTA</div><div class="s-cta-txt">'+s.cta+'</div></div>':''}
        ${s.reason?`<div class="s-reason">💡 ${s.reason}</div>`:''}
      </div>
      <div class="scard-foot">
        <button class="btn pur sm" onclick="makeTTS(${i})">🎙 TTS 생성</button>
        <button class="btn acc sm" onclick="cpScript(${i})">📋 복사</button>
      </div>
    </div>`).join('')

}

// 대본 렌더링 — body 텍스트에서 [연출지시] 와 화자: 대사를 파싱
function _renderScript(s){
  const body = s.body || ''
  // body에 [화면 또는 화자: 패턴이 있으면 촬영 대본 형식으로 렌더
  if(body.match(/\[.+\]/) || body.match(/(남|여|나레이션|MC|진행자)\s*:/)){
    // | 구분자 또는 줄바꿈으로 분리
    const lines = body.split(/\||\n/).filter(l => l.trim())
    const html = lines.map(line => {
      const trimmed = line.trim()
      // [화면 - ...] 또는 [음성 - ...] 연출 지시
      if(trimmed.startsWith('[')){
        return `<div style="background:var(--s3);border:1px solid var(--border);border-radius:var(--r);padding:6px 10px;margin:6px 0 4px;font-size:10px;color:var(--gold);font-family:'JetBrains Mono',monospace;line-height:1.6">${trimmed}</div>`
      }
      // 화자: 대사
      const speakerMatch = trimmed.match(/^(남|여|나레이션|MC|진행자|남1|남2|여1|여2)\s*[:：]\s*(.*)/)
      if(speakerMatch){
        const speaker = speakerMatch[1]
        const text = speakerMatch[2].replace(/\(([^)]{2,})\)/g, '<span style="color:var(--text3);font-style:italic;font-size:11px">($1)</span>')
        return `<div style="padding:2px 0 6px;font-size:13px;color:var(--text);line-height:1.7"><span style="color:var(--purple);font-weight:700">${speaker} :</span> ${text}</div>`
      }
      // 일반 텍스트 (연기 지시 포함 가능)
      const text = trimmed.replace(/\(([^)]{2,})\)/g, '<span style="color:var(--text3);font-style:italic;font-size:11px">($1)</span>')
      return `<div style="padding:2px 0 4px;font-size:12px;color:var(--text2);line-height:1.7">${text}</div>`
    }).join('')

    return `
      <div class="slbl h">HOOK</div>
      <div class="s-hook">${s.hook||''}</div>
      <div class="slbl b">SCRIPT</div>
      <div style="padding:4px 0 8px">${html}</div>
      ${s.cta?`<div class="s-cta"><div class="s-cta-lbl">CTA</div><div class="s-cta-txt">${s.cta}</div></div>`:''}`
  }

  // 기존 단순 형식
  return `
    <div class="slbl h">HOOK</div>
    <div class="s-hook">${s.hook||''}</div>
    <div class="slbl b">BODY</div>
    <div class="s-body">${body}</div>
    ${s.cta?`<div class="s-cta"><div class="s-cta-lbl">CTA</div><div class="s-cta-txt">${s.cta}</div></div>`:''}`
}

// 후킹 데이터 저장
let _hooksList = []

function renderHooks(list){
  _hooksList = list
  _selectedHooks = []
  const out = document.getElementById('hooks-out')
  if(!out) return
  out.style.display = 'block'
  out.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-size:12px;font-weight:700;color:var(--text2)">⚡ 후킹 아이디어 ${list.length}개</div>
      <div style="display:flex;gap:4px">
        <button class="btn sm" onclick="selectAllHooks()" style="font-size:10px">전체 선택</button>
        <button class="btn sm acc" onclick="copyAllHooks()" style="font-size:10px">📋 복사</button>
      </div>
    </div>
    <div style="font-size:10px;color:var(--text3);margin-bottom:10px">대본에 사용할 훅을 선택하세요 → 아래 <strong>대본 생성</strong> 버튼 클릭</div>
    ${list.map((h,i)=>`
    <div id="hook-item-${i}" onclick="toggleHookSelect(${i})" style="padding:10px 12px;background:var(--s2);border:2px solid var(--border);border-radius:var(--r);margin-bottom:6px;cursor:pointer;transition:all .15s">
      <div style="display:flex;align-items:flex-start;gap:8px">
        <div id="hook-check-${i}" style="width:18px;height:18px;border-radius:4px;border:2px solid var(--border2);background:var(--s3);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;font-size:10px;transition:all .15s"></div>
        <div style="flex:1">
          <span style="font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--purple);background:var(--purple-dim);padding:2px 6px;border-radius:4px">${h.pattern||'후킹'}</span>
          <div style="font-size:13px;font-weight:600;color:var(--text);line-height:1.5;font-family:'Syne',sans-serif;margin-top:4px">${h.text}</div>
          ${h.why?`<div style="font-size:10px;color:var(--text3);margin-top:4px">💡 ${h.why}</div>`:''}
        </div>
      </div>
    </div>`).join('')}
    <div id="hooks-selected-info" style="display:none;padding:8px 12px;background:var(--purple-dim);border:1px solid rgba(155,114,251,.3);border-radius:var(--r);font-size:11px;color:var(--purple);margin-top:8px"></div>
  `
}

function toggleHookSelect(idx){
  const hook = _hooksList[idx]
  const existing = _selectedHooks.findIndex(h=>h.text===hook.text)
  if(existing>-1) _selectedHooks.splice(existing, 1)
  else _selectedHooks.push(hook)

  // UI 업데이트
  const item = document.getElementById('hook-item-'+idx)
  const check = document.getElementById('hook-check-'+idx)
  const selected = _selectedHooks.some(h=>h.text===hook.text)
  if(item){
    item.style.borderColor = selected ? 'var(--purple)' : 'var(--border)'
    item.style.background = selected ? 'var(--purple-dim)' : 'var(--s2)'
  }
  if(check){
    check.style.background = selected ? 'var(--purple)' : 'var(--s3)'
    check.style.borderColor = selected ? 'var(--purple)' : 'var(--border2)'
    check.textContent = selected ? '✓' : ''
    check.style.color = '#fff'
  }

  // 선택 정보
  const info = document.getElementById('hooks-selected-info')
  if(info){
    if(_selectedHooks.length){
      info.style.display = 'block'
      info.textContent = `✓ ${_selectedHooks.length}개 훅 선택됨 → 아래 "대본 생성" 버튼을 클릭하세요`
    } else {
      info.style.display = 'none'
    }
  }
  if(typeof updateStepButtons==='function') updateStepButtons()
}

function selectAllHooks(){
  _selectedHooks = [..._hooksList]
  _hooksList.forEach((_,i)=>{
    const item = document.getElementById('hook-item-'+i)
    const check = document.getElementById('hook-check-'+i)
    if(item){ item.style.borderColor='var(--purple)'; item.style.background='var(--purple-dim)' }
    if(check){ check.style.background='var(--purple)'; check.style.borderColor='var(--purple)'; check.textContent='✓'; check.style.color='#fff' }
  })
  const info = document.getElementById('hooks-selected-info')
  if(info){ info.style.display='block'; info.textContent=`✓ ${_selectedHooks.length}개 전체 선택됨 → 아래 "대본 생성" 버튼을 클릭하세요` }
  if(typeof updateStepButtons==='function') updateStepButtons()
}

function copyAllHooks(){
  const out = document.getElementById('hooks-out')
  const hooks = [...out.querySelectorAll('[style*="Syne"]')].map((el,i)=>`${i+1}. ${el.textContent}`).join('\n')
  navigator.clipboard.writeText(hooks)
  toast(`후킹 ${out.querySelectorAll('[style*="Syne"]').length}개 복사됨`,'ok')
}

function switchScriptTab(tab){
  const scriptsOut = document.getElementById('scripts-out')
  const hooksOut = document.getElementById('hooks-out')
  const tabScripts = document.getElementById('tab-scripts')
  const tabHooks = document.getElementById('tab-hooks')
  if(tab === 'scripts'){
    scriptsOut.style.display = 'flex'
    hooksOut.style.display = 'none'
    tabScripts.style.color = 'var(--purple)'; tabScripts.style.borderBottomColor = 'var(--purple)'
    tabHooks.style.color = 'var(--text3)'; tabHooks.style.borderBottomColor = 'transparent'
  } else {
    scriptsOut.style.display = 'none'
    hooksOut.style.display = 'block'
    tabHooks.style.color = 'var(--purple)'; tabHooks.style.borderBottomColor = 'var(--purple)'
    tabScripts.style.color = 'var(--text3)'; tabScripts.style.borderBottomColor = 'transparent'
  }
}
