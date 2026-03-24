// ══════════════════════════════════════════════
// MODE / FILTER
// ══════════════════════════════════════════════
function setMode(el){
  mode=el.dataset.m
  document.querySelectorAll('.mchip').forEach(c=>c.classList.toggle('on',c===el))
  ;['spyder','brand','pageid','kw','manual'].forEach(m=>{
    const mEl=document.getElementById('m-'+m)
    if(mEl) mEl.style.display=m===mode?'block':'none'
  })
  // 수동 모드: 필터 숨기기
  const isManual = mode==='manual'
  ;['section-filter','section-analysis-opts'].forEach(id=>{
    const el=document.getElementById(id)
    if(el) el.style.display = isManual?'none':''
  })
  // 레퍼런스: 모든 모드에서 표시
  const refEl=document.getElementById('section-reference')
  if(refEl) refEl.style.display = 'block'
  // Spyder 탭 진입 시 자동 로드
  if(mode==='spyder' && typeof spyderBrands!=='undefined' && spyderBrands.length===0) loadSpyderBrands()
}
// ── 날짜 필터 ──
function toggleDateFilter(on){
  document.getElementById('date-filter-inputs').style.display = on ? 'block' : 'none'
  if(on){
    // 기본값: 최근 30일
    setDateRange(30)
  }
}

function setDateRange(days){
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)
  const fmt = d => d.toISOString().split('T')[0]
  document.getElementById('i-date-from').value = fmt(from)
  document.getElementById('i-date-to').value = fmt(to)
}

function getDateParams(){
  const useDate = document.getElementById('use-date-filter')?.checked
  if(!useDate) return {}
  const from = document.getElementById('i-date-from')?.value
  const to = document.getElementById('i-date-to')?.value
  const params = {}
  if(from) params.start_date = from
  if(to) params.end_date = to
  return params
}


function tf(el){
  const k=el.dataset.fk
  if(k==='all'){ document.querySelectorAll('[data-fk="active"],[data-fk="all"]').forEach(c=>c.classList.remove('on')); el.classList.add('on'); filters.delete('active') }
  else if(k==='active'){ document.querySelectorAll('[data-fk="active"],[data-fk="all"]').forEach(c=>c.classList.remove('on')); el.classList.add('on'); filters.add('active') }
  else{ el.classList.toggle('on'); if(el.classList.contains('on')) filters.add(k); else filters.delete(k) }
}
