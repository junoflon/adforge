// ══════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)) }
let _tt
function toast(msg,type=''){
  clearTimeout(_tt); document.querySelector('.toast')?.remove()
  const t=document.createElement('div'); t.className='toast'+(type?' '+type:''); t.textContent=msg
  document.body.appendChild(t); _tt=setTimeout(()=>t.remove(),3500)
}
