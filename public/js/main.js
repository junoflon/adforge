// ══════════════════════════════════════════════
// MAIN — 단계별 실행
// ══════════════════════════════════════════════

// ── 버튼 상태 관리 ──
function updateStepButtons(){
  const hasAds = ads && ads.length > 0
  const hasAnalysis = !!analysis
  const hasBrand = !!document.getElementById('sel-brand')?.value
  const hasHooks = typeof _selectedHooks!=='undefined' && _hooksList && _hooksList.length > 0
  const hasSelectedHooks = typeof _selectedHooks!=='undefined' && _selectedHooks.length > 0

  // 하단 버튼
  const btn2 = document.getElementById('btn-step2')
  const btn3a = document.getElementById('btn-step3a')
  const btn3b = document.getElementById('btn-step3b')
  if(btn2) btn2.disabled = !hasAds
  if(btn3a) btn3a.disabled = !hasAnalysis || !hasBrand
  if(btn3b) btn3b.disabled = !hasSelectedHooks

  // Stage 헤더 버튼
  const s2btn = document.getElementById('btn-s2-run')
  const s3aBtn = document.getElementById('btn-s3a-run')
  const s3bBtn = document.getElementById('btn-s3b-run')
  const regen = document.getElementById('regen-btn')
  if(s2btn) s2btn.style.display = hasAds ? 'inline-flex' : 'none'
  if(s3aBtn) s3aBtn.style.display = (hasAnalysis && hasBrand) ? 'inline-flex' : 'none'
  if(s3bBtn) s3bBtn.style.display = (hasSelectedHooks && !scripts.length) ? 'inline-flex' : 'none'
  if(regen) regen.style.display = scripts.length ? 'inline-flex' : 'none'
}

// ── 버튼 로딩 상태 헬퍼 ──
function _btnLoading(id, loading, label){
  const el = document.getElementById(id)
  if(!el) return
  if(loading){ el.disabled=true; el.innerHTML='<span class="spin">◌</span>' }
  else { el.disabled=false; el.textContent=label }
}

// ══════════════════════════════════════════════
// STEP 1: 광고 수집 (토큰 0)
// ══════════════════════════════════════════════
async function goStep1(){
  _btnLoading('btn-step1', true)
  const pw=document.getElementById('prog-wrap')
  pw.style.display='block'; document.getElementById('prog-steps').innerHTML=''; pbar(0)

  // 초기화
  ads=[]; sel.clear(); analysis=null; scripts=[]; ttsScripts=[]
  document.getElementById('ad-grid').style.display='none'
  document.getElementById('grid-footer').style.display='none'
  document.getElementById('e1').style.display='flex'
  document.getElementById('report-out').style.display='none'
  document.getElementById('e2').style.display='flex'
  document.getElementById('scripts-out').style.display='none'
  document.getElementById('hooks-out').style.display='none'
  const tabsEl=document.getElementById('scripts-tabs'); if(tabsEl) tabsEl.style.display='none'
  document.getElementById('e3').style.display='flex'
  document.getElementById('tts-out').style.display='none'
  document.getElementById('e4').style.display='flex'
  ;[1,2,3,4,5].forEach(n=>stageSet(n,'wait'))

  try {
    stageSet(1,'run'); scrollTo(1)
    pstep('c1',K.fp?'Foreplay API 연결':'Mock 모드 준비','run'); pbar(10)
    await sleep(300)
    pstep('c1','✓ 준비 완료','done'); pbar(20)
    pstep('c2','광고 수집 중','run'); pbar(30)

    const forceRefresh = document.getElementById('force-refresh')?.checked

    // 수집 캐시 키
    const adsCacheKey = mode==='spyder'
      ? spyderBrands.filter(b=>b.selected).map(b=>b.id)
      : mode==='manual'
      ? ['manual_'+manualBrands.map(b=>b.name).join('_')]
      : [mode+'_'+(document.getElementById('i-brand')?.value||document.getElementById('i-pid')?.value||document.getElementById('i-kw')?.value||'')]

    window._adsCacheKey = adsCacheKey

    if(K.fp){
      if(!forceRefresh){
        const cached = await loadAdsCache(adsCacheKey)
        if(cached && cached.length){
          ads = cached
          pstep('c2',`✓ ${ads.length}개 (캐시)`,'done'); pbar(90)
        } else {
          ads = await apiGet()
          pstep('c2',`✓ ${ads.length}개 수집`,'done'); pbar(90)
          if(ads.length) saveAdsCache(adsCacheKey, ads)
        }
      } else {
        ads = await apiGet()
        pstep('c2',`✓ ${ads.length}개 수집`,'done'); pbar(90)
        if(ads.length) saveAdsCache(adsCacheKey, ads)
      }
    } else {
      ads = await sleep(900).then(()=>mockGet())
      pstep('c2',`✓ ${ads.length}개 수집`,'done'); pbar(90)
    }

    renderGrid(); stageSet(1,'done'); unlock(2)
    saveLib(ads); pbar(100)
    toast(`✓ 광고 ${ads.length}개 수집 완료`,'ok')

  } catch(e){
    pstep('err','오류: '+e.message,'err'); toast(e.message,'err'); console.error(e)
  }
  _btnLoading('btn-step1', false, '⚡ 수집')
  updateStepButtons()
}

// ══════════════════════════════════════════════
// STEP 2: 분석 (Claude 토큰 ~2K)
// ══════════════════════════════════════════════
async function goStep2(){
  if(!ads.length){ toast('먼저 광고를 수집해주세요','err'); return }
  if(!K.cl){ toast('Claude API 키가 없어요 — 헤더의 API 설정에서 추가해주세요','err'); return }

  // 선택한 광고만 분석 (선택 없으면 전체)
  const selectedAds = sel.size ? ads.filter(a => sel.has(a.id)) : ads
  console.log(`[Step2] 분석 대상: ${selectedAds.length}개 (선택 ${sel.size}개 / 전체 ${ads.length}개)`)

  _btnLoading('btn-step2', true)
  _btnLoading('btn-s2-run', true)

  const pw=document.getElementById('prog-wrap')
  pw.style.display='block'
  pstep('a1','Claude AI 경쟁사 분석 중','run'); pbar(40)

  try {
    stageSet(2,'run'); scrollTo(2)

    const cacheKey = window._adsCacheKey || ['unknown']
    const forceRefresh = document.getElementById('force-refresh')?.checked
    const cached = !forceRefresh ? await loadAnalysisCache(cacheKey) : null

    if(cached){
      analysis = cached
      pstep('a1','✓ 분석 완료 (캐시 — 토큰 0)','done'); pbar(100)
    } else {
      analysis = await doAnalysis(selectedAds)
      pstep('a1',`✓ ${selectedAds.length}개 광고 분석 완료`,'done'); pbar(100)
      saveAnalysisCache(cacheKey, analysis)
    }

    renderReport(analysis,selectedAds); stageSet(2,'done'); unlock(3)
    toast('✓ 분석 완료!','ok')

  } catch(e){
    pstep('err','분석 오류: '+e.message,'err'); toast(e.message,'err'); console.error(e)
    stageSet(2,'err')
  }
  _btnLoading('btn-step2', false, '📊 분석')
  _btnLoading('btn-s2-run', false, '📊 분석 실행')
  updateStepButtons()
}

// ══════════════════════════════════════════════
// STEP 3a: 후킹 아이디어 생성 (Claude 토큰 ~2K)
// ══════════════════════════════════════════════
async function goStep3a(){
  if(!analysis){ toast('먼저 분석을 실행해주세요','err'); return }
  const brandId=document.getElementById('sel-brand')?.value
  if(!brandId){ toast('좌측에서 브랜드를 선택해주세요','err'); return }

  const brand=brands.find(b=>b.id===brandId)
  _btnLoading('btn-step3a', true)

  const pw=document.getElementById('prog-wrap')
  pw.style.display='block'
  pstep('h1','후킹 아이디어 생성 중','run'); pbar(50)

  try {
    stageSet(3,'run'); scrollTo(3)
    document.getElementById('e3').style.display='none'
    const tabsEl=document.getElementById('scripts-tabs')
    if(tabsEl) tabsEl.style.display='block'

    const hooks = await doGenHooks(brand, analysis)
    pstep('h1',`✓ 후킹 ${hooks.length}개 생성`,'done'); pbar(100)

    renderHooks(hooks)
    switchScriptTab('hooks')
    stageSet(3,'done')
    toast(`✓ 후킹 ${hooks.length}개 — 선택 후 대본 생성하세요`,'ok')

  } catch(e){
    pstep('err','후킹 오류: '+e.message,'err'); toast(e.message,'err'); console.error(e)
    stageSet(3,'err')
  }
  _btnLoading('btn-step3a', false, '⚡ 후킹')
  updateStepButtons()
}

// ══════════════════════════════════════════════
// STEP 3b: 선택된 훅으로 대본 생성 (Claude 토큰 ~3K)
// ══════════════════════════════════════════════
async function goStep3b(){
  if(!analysis){ toast('먼저 분석을 실행해주세요','err'); return }
  if(!_selectedHooks.length){ toast('후킹 탭에서 문구를 선택해주세요','err'); return }
  const brandId=document.getElementById('sel-brand')?.value
  if(!brandId){ toast('좌측에서 브랜드를 선택해주세요','err'); return }

  const brand=brands.find(b=>b.id===brandId)
  _btnLoading('btn-step3b', true)
  _btnLoading('regen-btn', true)

  const pw=document.getElementById('prog-wrap')
  pw.style.display='block'
  pstep('g1',`선택된 훅 ${_selectedHooks.length}개로 대본 작성 중`,'run'); pbar(50)

  try {
    stageSet(3,'run')
    scripts = await doGenScripts(brand, analysis, _selectedHooks)
    ttsScripts = scripts
    pstep('g1',`✓ 대본 ${scripts.length}개 완성`,'done'); pbar(100)

    renderScripts(scripts)
    switchScriptTab('scripts')
    stageSet(3,'done')
    toast(`✓ 대본 ${scripts.length}개 생성 완료`,'ok')

  } catch(e){
    pstep('err','생성 오류: '+e.message,'err'); toast(e.message,'err'); console.error(e)
    stageSet(3,'err')
  }
  _btnLoading('btn-step3b', false, '✦ 대본')
  _btnLoading('regen-btn', false, '↻ 재생성')
  updateStepButtons()
}

// ══════════════════════════════════════════════
// 전체 실행 (1→2→3a→3b 순차)
// ══════════════════════════════════════════════
async function goAll(){
  await goStep1()
  if(ads.length) await goStep2()
  if(analysis && document.getElementById('sel-brand')?.value){
    await goStep3a()
    if(typeof _hooksList!=='undefined' && _hooksList.length){
      selectAllHooks()
      await goStep3b()
    }
  }
}

// 하위호환
async function go(){ await goAll() }
async function onlyGen(){ await goStep3b() }
async function goStep3(){ await goStep3a() }
