const el = (id)=>document.getElementById(id);
const modes = {
  V_ratio: [ {id:"V", label:"高さ V (m)"}, {id:"X", label:"比 1:X（例 1.5）"} ],
  V_percent: [ {id:"V", label:"高さ V (m)"}, {id:"P", label:"％勾配（例 12）"} ],
  V_angle: [ {id:"V", label:"高さ V (m)"}, {id:"A", label:"角度 θ (°)"} ],
  H_V: [ {id:"H", label:"水平 H (m)"}, {id:"V", label:"高さ V (m)"} ],
  H_percent: [ {id:"H", label:"水平 H (m)"}, {id:"P", label:"％勾配（例 12）"} ],
  H_angle: [ {id:"H", label:"水平 H (m)"}, {id:"A", label:"角度 θ (°)"} ],
};

function renderInputs(){
  const mode = el('mode').value;
  const box = el('inputs'); box.innerHTML = '';
  modes[mode].forEach(f => {
    const w = document.createElement('div');
    w.innerHTML = `<label for="${f.id}">${f.label}</label>
      <input id="${f.id}" inputmode="decimal" placeholder="数値を入力" aria-label="${f.label}">`;
    box.appendChild(w);
  });
}
function fmt(x){ const d = +el('round').value; return isFinite(x) ? Number(x).toFixed(d) : '—'; }

function calculate(){
  const mode = el('mode').value;
  let H=null,V=null,X=null,P=null,A=null;
  const val = id => parseFloat((el(id)?.value||'').replace(',', ''));

  if(mode==='V_ratio'){ V=val('V'); X=val('X'); if(V>0 && X>0){ H = V*X; } }
  if(mode==='V_percent'){ V=val('V'); P=val('P'); if(V>0 && P>0){ H = V*100/P; } }
  if(mode==='V_angle'){ V=val('V'); A=val('A'); if(V>0 && A>0){ const rad=A*Math.PI/180; H = V/Math.tan(rad); } }
  if(mode==='H_V'){ H=val('H'); V=val('V'); }
  if(mode==='H_percent'){ H=val('H'); P=val('P'); if(H>0 && P>=0){ V = H*P/100; } }
  if(mode==='H_angle'){ H=val('H'); A=val('A'); if(H>0 && A>=0){ const rad=A*Math.PI/180; V = Math.tan(rad)*H; } }

  if(!(H>0) || !(V>=0)){ setResult(); return; }

  const L = Math.sqrt(H*H + V*V);
  const theta = Math.atan2(V,H)*180/Math.PI;
  const percent = H>0 ? (V/H)*100 : null;
  const ratio = V>0 ? `1:${(H/V).toFixed(3)}` : '—';

  setResult(L,H,V,theta,percent,ratio);
}

function setResult(L,H,V,theta,percent,ratio){
  el('L').textContent = fmt(L);
  el('H').textContent = fmt(H);
  el('V').textContent = fmt(V);
  el('theta').textContent = fmt(theta);
  el('percent').textContent = fmt(percent);
  el('ratio').textContent = ratio || '—';

  let note = '';
  if (ratio && ratio !== '—') {
    const x = parseFloat(ratio.split(':')[1]);
    if (isFinite(x)) {
      if (x < 1.0) note = '急勾配（1:1.0より急）';
      else if (x > 1.8) note = '緩勾配（1:1.8より緩）';
      else note = '一般的範囲内（参考）';
    }
  }
  el('note').textContent = note;
}

el('mode').addEventListener('change', renderInputs);
el('calc').addEventListener('click', calculate);
el('round').addEventListener('change', calculate);
el('copy').addEventListener('click', ()=>{
  const t = `【法面計算】 L=${el('L').textContent}m, H=${el('H').textContent}m, V=${el('V').textContent}m / θ=${el('theta').textContent}°, 勾配=${el('percent').textContent}%, 比=${el('ratio').textContent}`;
  navigator.clipboard.writeText(t).catch(()=>{});
});
renderInputs();
