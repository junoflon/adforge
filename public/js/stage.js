// ══════════════════════════════════════════════
// STAGE HELPERS
// ══════════════════════════════════════════════
function stageSet(n,state){
  const labels={wait:'대기',run:'실행 중',done:'완료',err:'오류'}
  const colors={wait:'wait',run:'run',done:'done',err:'err'}
  const st=document.getElementById('st'+n)
  if(st){ st.className='stage-status '+colors[state]; st.textContent=labels[state] }
  const s=document.getElementById('s'+n)
  if(s){
    s.classList.remove('active','done','locked')
    if(state==='run') s.classList.add('active')
    else if(state==='done') s.classList.add('done')
    else if(state==='wait') s.classList.add('locked')
  }
  const conn=document.getElementById('conn'+(n-1))
  if(conn&&state==='done') conn.classList.add('active')
}
function unlock(n){ const s=document.getElementById('s'+n); if(s) s.classList.remove('locked') }
function scrollTo(n){ const s=document.getElementById('s'+n); if(s) s.scrollIntoView({behavior:'smooth',block:'start'}) }

// ══════════════════════════════════════════════
// PROGRESS
// ══════════════════════════════════════════════
function pstep(id,label,state){
  const steps=document.getElementById('prog-steps'); if(!steps) return
  let el=document.getElementById('pp-'+id)
  if(!el){ el=document.createElement('div'); el.id='pp-'+id; el.className='pstep'; el.innerHTML=`<span class="si">○</span><span>${label}</span>`; steps.appendChild(el) }
  el.className='pstep '+state
  el.querySelector('.si').textContent={wait:'○',run:'◌',done:'✓',err:'✗'}[state]||'○'
  el.querySelector('.si').style.animation=state==='run'?'spin .7s linear infinite':'none'
  el.querySelector('span:last-child').textContent=label
}
function pbar(p){ const b=document.getElementById('prog-bar'); if(b) b.style.width=p+'%' }
