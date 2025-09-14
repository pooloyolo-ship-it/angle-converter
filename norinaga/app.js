// norinaga/app.js
const el = (id)=>document.getElementById(id);

const modes = {
  H_V:       [ {id:"H", label:"水平 L (m)"}, {id:"V", label:"高さ H (m)"} ],
  H_percent: [ {id:"H", label:"水平 L (m)"}, {id:"P", label:"％勾配（例 12）"} ],
  H_angle:   [ {id:"H", label:"水平 L (m)"}, {id:"A", label:"角度 θ (°)"} ],
  V_ratio:   [ {id:"V", label:"高さ H (m)"}, {id:"X", label:"比 1:X（例 1.5）"} ],
  V_percent: [ {id:"V", label:"高さ H (m)"}, {id:"P", label:"％勾配（例 12）"} ],
  V_angle:   [ {id:"V", label:"高さ H (m)"}, {id:"A", label:"角度 θ (°)"} ],
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

function fmt(x){
  const d = +el('round').value;
  return (x==null || !isFinite(x)) ? '—' : Number(x).toFixed(d);
}

function calculate(){
  const mode = el('mode').value;
  let H=null, V=null, X=null, P=null, A=null;
  const val = id => parseFloat((el(id)?.value||'').toString().replace(',', ''));

  if(mode==='H_V'){ H=val('H'); V=val('V'); }
  if(mode==='H_percent'){ H=val('H'); P=val('P'); if(H>0 && P>=0){ V = H*P/100; } }
  if(mode==='H_angle'){ H=val('H'); A=val('A'); if(H>0 && A>=0){ const rad=A*Math.PI/180; V = Math.tan(rad)*H; } }

  if(mode==='V_ratio'){ V=val('V'); X=val('X'); if(V>0 && X>0){ H = V*X; } }
  if(mode==='V_percent'){ V=val('V'); P=val('P'); if(V>0 && P>0){ H = V*100/P; } }
  if(mode==='V_angle'){ V=val('V'); A=val('A'); if(V>0 && A>0){ const rad=A*Math.PI/180; H = V/Math.tan(rad); } }

  if(!(H>0) || !(V>=0)){
    setResult(null,null,null,null,null,null);
    return;
  }

  const SL = Math.sqrt(H*H + V*V);
  const theta = Math.atan2(V,H)*180/Math.PI;
  const percent = (H>0) ? (V/H)*100 : null;
  const ratioX = (V>0) ? (H/V) : null;

  setResult(SL,H,V,theta,percent,ratioX);
}

function setResult(SL,H,V,theta,percent,ratioX){
  const out = el('out');
  out.innerHTML = `
    <h2>法長 SL = ${fmt(SL)} m</h2>
    <p>水平 L = ${fmt(H)} m ／ 高さ H = ${fmt(V)} m</p>
    <p>角度 θ = ${fmt(theta)} ° ／ %勾配 = ${fmt(percent)} % ／ 比 = 1:${fmt(ratioX)}</p>
  `;
}

el('mode').addEventListener('change', renderInputs);
el('calc').addEventListener('click', calculate);
el('round').addEventListener('change', calculate);
renderInputs();
