// ══════════════════════════════════════════════
// AdForge 프롬프트 관리
// localStorage에 저장되어 UI에서 편집 가능
// ══════════════════════════════════════════════

const DEFAULT_PROMPTS = {
  analysis: {
    name: '광고 분석',
    desc: '수집된 경쟁사 광고를 분석하는 프롬프트',
    template: `광고 크리에이티브 전략가로서 아래 {{adCount}}개 광고를 분석하고 JSON으로 응답하세요.

{{adData}}

분석항목:
{{analysisSections}}

JSON만 응답:{"hookPatterns":[],"toneAnalysis":"","structureInsight":"","ctaPatterns":"","strategicInsight":[],"topHooks":[],"summary":""}`
  },

  script: {
    name: '대본 생성',
    desc: '경쟁사 분석 기반 광고 대본을 생성하는 프롬프트',
    template: null, // prompt-script.txt에서 로드
    file: 'prompt-script.txt'
  },

  hooking: {
    name: '후킹 아이디어',
    desc: 'SNS 광고용 후킹 문구를 생성하는 프롬프트',
    template: null,
    file: 'prompt-hooking.txt'
  }
}

// ── 프롬프트 버전 (기본값 변경 시 올려서 캐시 무효화) ──
const PROMPT_VERSION = 6

// ── 외부 파일 프롬프트 로드 ──
let _loadedFilePrompts = {}

async function loadPromptFiles() {
  for (const key in DEFAULT_PROMPTS) {
    const p = DEFAULT_PROMPTS[key]
    if (p.file && !p.template) {
      try {
        const r = await fetch('/' + p.file + '?t=' + Date.now())
        if (r.ok) {
          _loadedFilePrompts[key] = await r.text()
          console.log('[Prompts] 파일 로드:', p.file)
        }
      } catch(e) { console.warn('[Prompts] 파일 로드 실패:', p.file) }
    }
  }
}

// ── 프롬프트 저장/로드 ──
function getPrompts() {
  const result = {}
  for (const key in DEFAULT_PROMPTS) {
    result[key] = { ...DEFAULT_PROMPTS[key] }
    // 파일에서 로드된 템플릿 적용
    if (!result[key].template && _loadedFilePrompts[key]) {
      result[key].template = _loadedFilePrompts[key]
    }
  }

  // localStorage 커스텀 오버라이드
  const saved = localStorage.getItem('af_prompts')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed._ver !== PROMPT_VERSION) {
        localStorage.removeItem('af_prompts')
        return result
      }
      for (const key in result) {
        if (parsed[key]?.template) result[key].template = parsed[key].template
      }
    } catch(e) {}
  }
  return result
}

function savePrompts(prompts) {
  const toSave = { _ver: PROMPT_VERSION }
  for (const key in prompts) {
    toSave[key] = { template: prompts[key].template }
  }
  localStorage.setItem('af_prompts', JSON.stringify(toSave))
}

function resetPrompt(key) {
  const prompts = getPrompts()
  if (DEFAULT_PROMPTS[key]) {
    prompts[key].template = DEFAULT_PROMPTS[key].template
    savePrompts(prompts)
  }
  return prompts
}

function resetAllPrompts() {
  localStorage.removeItem('af_prompts')
  return JSON.parse(JSON.stringify(DEFAULT_PROMPTS))
}

// ── 템플릿 변수 치환 ──
function fillTemplate(templateStr, vars) {
  return templateStr.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

// ── 프롬프트 편집 모달 ──
function openPromptManager() {
  const prompts = getPrompts()
  const keys = Object.keys(prompts)
  const firstKey = keys[0]

  const overlay = document.createElement('div')
  overlay.className = 'overlay'
  overlay.id = 'modal-prompts'
  overlay.onclick = e => { if(e.target===overlay) overlay.remove() }
  overlay.style.display = 'flex'

  overlay.innerHTML = `
    <div class="modal" style="max-width:700px;width:95vw;max-height:85vh;display:flex;flex-direction:column">
      <div class="modal-hd">
        <span>⚙️ 프롬프트 관리</span>
        <button class="modal-x" onclick="document.getElementById('modal-prompts').remove()">✕</button>
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px;flex:1;overflow-y:auto">
        <div style="font-size:11px;color:var(--text3);line-height:1.5">
          대본 생성에 사용되는 프롬프트를 커스터마이징할 수 있습니다.<br>
          <code style="font-size:10px;background:var(--s3);padding:1px 4px;border-radius:3px">{{"{{변수명}}"}}</code> 형태의 변수는 실행 시 자동 치환됩니다.
        </div>

        <!-- 탭 -->
        <div style="display:flex;gap:0;border-bottom:1px solid var(--border)">
          ${keys.map((k,i) => `
            <button class="pm-tab" id="pm-tab-${k}" onclick="switchPromptTab('${k}')"
              style="flex:1;padding:8px 4px;font-size:11px;font-weight:600;border:none;background:none;cursor:pointer;
              color:${i===0?'var(--purple)':'var(--text3)'};border-bottom:2px solid ${i===0?'var(--purple)':'transparent'}">
              ${prompts[k].name}
            </button>
          `).join('')}
        </div>

        <!-- 패널 -->
        ${keys.map((k,i) => `
          <div class="pm-panel" id="pm-panel-${k}" style="display:${i===0?'flex':'none'};flex-direction:column;gap:10px;flex:1">
            <div style="font-size:10px;color:var(--text3)">${prompts[k].desc}</div>
            <textarea id="pm-textarea-${k}" rows="16"
              style="font-size:11px;font-family:'JetBrains Mono',monospace;line-height:1.6;resize:vertical;flex:1;min-height:200px"
            >${prompts[k].template}</textarea>
            <div style="display:flex;gap:6px;justify-content:space-between;align-items:center">
              <div style="display:flex;gap:6px">
                <button class="btn sm" onclick="promptVarsHelp('${k}')" style="font-size:10px">📋 변수 목록</button>
                <button class="btn sm" onclick="resetOnePrompt('${k}')" style="font-size:10px;color:var(--red,#ff5f57)">↺ 초기화</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn sm" onclick="resetAllPromptsUI()" style="color:var(--red,#ff5f57)">전체 초기화</button>
        <button class="btn pur" onclick="savePromptsUI()">저장</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
}

function switchPromptTab(key) {
  document.querySelectorAll('.pm-tab').forEach(t => {
    t.style.color = 'var(--text3)'
    t.style.borderBottomColor = 'transparent'
  })
  document.querySelectorAll('.pm-panel').forEach(p => p.style.display = 'none')
  const tab = document.getElementById('pm-tab-' + key)
  const panel = document.getElementById('pm-panel-' + key)
  if(tab) { tab.style.color = 'var(--purple)'; tab.style.borderBottomColor = 'var(--purple)' }
  if(panel) panel.style.display = 'flex'
}

function savePromptsUI() {
  const prompts = getPrompts()
  for (const key in prompts) {
    const ta = document.getElementById('pm-textarea-' + key)
    if (ta) prompts[key].template = ta.value
  }
  savePrompts(prompts)
  toast('프롬프트 저장됨 ✓', 'ok')
  document.getElementById('modal-prompts')?.remove()
}

function resetOnePrompt(key) {
  if (!confirm(`"${DEFAULT_PROMPTS[key].name}" 프롬프트를 기본값으로 초기화할까요?`)) return
  const prompts = resetPrompt(key)
  const ta = document.getElementById('pm-textarea-' + key)
  if (ta) ta.value = DEFAULT_PROMPTS[key].template
  toast('초기화됨', 'ok')
}

function resetAllPromptsUI() {
  if (!confirm('모든 프롬프트를 기본값으로 초기화할까요?')) return
  const prompts = resetAllPrompts()
  for (const key in prompts) {
    const ta = document.getElementById('pm-textarea-' + key)
    if (ta) ta.value = prompts[key].template
  }
  toast('전체 초기화됨', 'ok')
}

function promptVarsHelp(key) {
  const vars = {
    analysis: {
      '{{adCount}}': '분석할 광고 개수',
      '{{adData}}': '광고 데이터 (자동 생성)',
      '{{analysisSections}}': '분석 항목 목록 (체크박스 기반)'
    },
    script: {
      '{{brandName}}': '브랜드명',
      '{{category}}': '카테고리',
      '{{painpoint}}': '페인포인트',
      '{{usp}}': 'USP (차별점)',
      '{{brandTone}}': '브랜드 톤',
      '{{prohibitRule}}': '금지 사항 (|금지:...)',
      '{{prohibitExtra}}': '금지 사항 규칙',
      '{{summary}}': '분석 요약',
      '{{topHooks}}': 'TOP 훅 목록',
      '{{hookPatterns}}': '훅 패턴 분류',
      '{{insights}}': '전략 인사이트',
      '{{toneAnalysis}}': '감성 톤 분석',
      '{{ctaPatterns}}': 'CTA 패턴',
      '{{adType}}': '광고 유형',
      '{{tone}}': '톤 설정',
      '{{count}}': '대본 개수',
      '{{targetChars}}': '목표 글자수',
      '{{duration}}': '목표 길이 (초/분)',
      '{{refRule}}': '레퍼런스 규칙 (자동)'
    },
    hooking: {
      '{{brandName}}': '브랜드명',
      '{{category}}': '카테고리',
      '{{painpoint}}': '페인포인트',
      '{{usp}}': 'USP (차별점)',
      '{{topHooks}}': 'TOP 훅 목록',
      '{{learnedHint}}': '학습 데이터 힌트',
      '{{learnedContext}}': '학습된 브랜드 정보',
      '{{prohibitRule}}': '금지 사항'
    }
  }
  const list = vars[key] || {}
  const html = Object.entries(list).map(([k,v]) =>
    `<div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid var(--border)">
      <code style="font-size:10px;background:var(--s3);padding:2px 6px;border-radius:3px;white-space:nowrap;color:var(--purple)">${k}</code>
      <span style="font-size:11px;color:var(--text2)">${v}</span>
    </div>`
  ).join('')

  const popup = document.createElement('div')
  popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--s2);border:1px solid var(--border2);border-radius:12px;padding:16px;z-index:10001;max-width:400px;width:90vw;box-shadow:0 8px 32px rgba(0,0,0,.4)'
  popup.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <span style="font-weight:700;font-size:13px">📋 사용 가능한 변수</span>
      <button onclick="this.closest('div[style*=fixed]').remove()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px">✕</button>
    </div>
    ${html}
  `
  document.body.appendChild(popup)
}
