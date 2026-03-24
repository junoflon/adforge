// ══════════════════════════════════════════════
// ANALYSIS
// ══════════════════════════════════════════════
async function doAnalysis(ads){
  const sample=ads.slice(0,25)
  const data=sample.map((a,i)=>[`[${i+1}]브랜드:${a.brand}`,`훅:"${a.hook}"`,a.transcript?`스크립트:"${a.transcript.slice(0,150)}"`:null,a.tone?`톤:${a.tone}`:null,a.isActive?`활성${a.activeDays}일`:'종료',a.cta?`CTA:"${a.cta}"`:null].filter(Boolean).join('|')).join('\n')
  const opts={hook:document.getElementById('o-hook').checked,tone:document.getElementById('o-tone').checked,struct:document.getElementById('o-struct').checked,cta:document.getElementById('o-cta').checked,insight:document.getElementById('o-insight').checked}
  const secs=[]
  if(opts.hook) secs.push('hookPatterns: [{type,example,frequency}] 훅 패턴 유형 분류')
  if(opts.tone) secs.push('toneAnalysis: 감성 톤 분포 (문자열)')
  if(opts.struct) secs.push('structureInsight: 영상 구조 패턴 (문자열)')
  if(opts.cta) secs.push('ctaPatterns: CTA 전략 (문자열)')
  if(opts.insight) secs.push('strategicInsight: [문자열 3-5개] 전략 인사이트')
  secs.push('topHooks: [{hook,reason}] TOP5')
  secs.push('summary: 전체 요약 2-3문장')

  const prompt=fillTemplate(getPrompts().analysis.template, {
    adCount: sample.length,
    adData: data,
    analysisSections: secs.join('\n')
  })
  const r=await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt, max_tokens:2000})})
  if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error?.message||`Claude ${r.status}`)}
  const d=await r.json()
  return _parseClaudeJSON(d)
}

function renderReport(r,ads){
  document.getElementById('e2').style.display='none'
  const bn=ads[0]?.brand||'경쟁사'
  const now=new Date().toLocaleString('ko-KR',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})
  const out=document.getElementById('report-out')
  out.style.display='flex'
  out.innerHTML=`
    <div class="report-banner">
      <div class="rb-label">⚡ Foreplay 경쟁사 분석 · ${now}</div>
      <div class="rb-ttl">${bn} 광고 분석 — ${ads.length}개</div>
      <div class="rb-sum">${r.summary||''}</div>
    </div>
    ${r.topHooks?.length?`<div class="rsec"><div class="rsec-hd"><span class="rsec-icon">🎯</span><span class="rsec-ttl">Top Hooks</span><span class="rsec-badge">TOP ${r.topHooks.length}</span></div><div class="rsec-body">${r.topHooks.map((h,i)=>`<div class="top-hook"><div class="th-rank">#${i+1}</div><div><div class="th-hook">"${h.hook||h}"</div>${h.reason?`<div class="th-reason">💡 ${h.reason}</div>`:''}</div></div>`).join('')}</div></div>`:''}
    ${r.hookPatterns?.length?`<div class="rsec"><div class="rsec-hd"><span class="rsec-icon">📐</span><span class="rsec-ttl">훅 패턴 분류</span><span class="rsec-badge">${r.hookPatterns.length}가지</span></div><div class="rsec-body">${r.hookPatterns.map(p=>`<div class="hp-item"><div class="hp-type">${p.type||p.유형||''}</div><div class="hp-ex">"${p.example||p.예시||''}"</div><div class="hp-freq">${p.frequency||p.빈도||''}</div></div>`).join('')}</div></div>`:''}
    ${r.toneAnalysis?`<div class="rsec"><div class="rsec-hd"><span class="rsec-icon">💬</span><span class="rsec-ttl">감성 톤 분석</span></div><div class="rsec-body"><div class="ibox">${r.toneAnalysis}</div></div></div>`:''}
    ${r.structureInsight?`<div class="rsec"><div class="rsec-hd"><span class="rsec-icon">🎬</span><span class="rsec-ttl">영상 구조 패턴</span></div><div class="rsec-body"><div class="ibox">${r.structureInsight}</div></div></div>`:''}
    ${r.ctaPatterns?`<div class="rsec"><div class="rsec-hd"><span class="rsec-icon">👉</span><span class="rsec-ttl">CTA 패턴</span></div><div class="rsec-body"><div class="ibox">${r.ctaPatterns}</div></div></div>`:''}
    ${r.strategicInsight?.length?`<div class="rsec"><div class="rsec-hd"><span class="rsec-icon">⚡</span><span class="rsec-ttl">전략적 인사이트</span></div><div class="rsec-body">${r.strategicInsight.map(s=>`<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)"><div style="color:var(--accent);flex-shrink:0">▸</div><div style="font-size:12px;color:var(--text2);line-height:1.65">${s}</div></div>`).join('')}</div></div>`:''}
  `
}
