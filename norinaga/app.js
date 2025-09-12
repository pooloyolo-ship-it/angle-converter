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

  const SL = Math.sqrt(H*H + V*V);
  const theta = Math.atan2(V,H)*180/Math.PI;
  const percent = H>0 ? (V/H)*100 : null;
  const ratio = V>0 ? `1:${(H/V).toFixed(3)}` : '—';

  setResult(SL,H,V,theta,percent,ratio);
}

function updateDiagram(H,V,SL,theta,percentText,ratioText){
  const svg = document.getElementById('diagram');
  if(!svg || !(H>0) || !(V>=0)) return;
  const x0 = 40, y0 = 210, maxW = 340, maxH = 180;
  const scale = Math.min(maxW / H, maxH / Math.max(V, 0.0001));
  const w = H * scale;
  const h = V * scale;
  const x1 = x0 + w, y1 = y0 - h;
  svg.querySelector('#hypLine').setAttribute('x2', x1);
  svg.querySelector('#hypLine').setAttribute('y2', y1);
  svg.querySelector('#Hline').setAttribute('x2', x0 + w);
  svg.querySelector('#Vline').setAttribute('x1', x0 + w + 5);
  svg.querySelector('#Vline').setAttribute('x2', x0 + w + 5);
  svg.querySelector('#Vline').setAttribute('y2', y0 - h);
  const r = 30;
  const ang = Math.atan2(h, w);
  const xA = x0 + r*Math.cos(0), yA = y0 - r*Math.sin(0);
  const xB = x0 + r*Math.cos(ang), yB = y0 - r*Math.sin(ang);
  const d = `M${xA},${yA} A${r},${r} 0 0 1 ${xB},${yB}`;
  svg.querySelector('#thetaArc').setAttribute('d', d);
  svg.querySelector('#Hlabel').textContent = `水平 L = ${fmt(H)} m`;
  svg.querySelector('#Vlabel').textContent = `高さ H = ${fmt(V)} m`;
  svg.querySelector('#SLlabel').textContent = `法長 SL = ${fmt(SL)} m`;
  svg.querySelector('#Tlabel').textContent = `角度 θ = ${fmt(theta)} °`;
  if (percentText!=null) svg.querySelector('#Plabel').textContent = `勾配 % = ${percentText}`;
  if (ratioText!=null) svg.querySelector('#Rlabel').textContent = `比 1:X = ${ratioText.replace('1:','')}`;
  svg.querySelector('#SLlabel').setAttribute('x', x0 + w*0.45);
  svg.querySelector('#SLlabel').setAttribute('y', y0 - h*0.55);
}

function setResult(SL,H,V,theta,percent,ratio){
  el('L').textContent = fmt(SL);
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
  updateDiagram(H,V,SL,theta, el('percent').textContent, el('ratio').textContent);
}

el('mode').addEventListener('change', renderInputs);
el('calc').addEventListener('click', calculate);
el('round').addEventListener('change', calculate);
el('copy').addEventListener('click', ()=>{
  const t = `【法面計算】 SL=${el('L').textContent}m, L=${el('H').textContent}m, H=${el('V').textContent}m / θ=${el('theta').textContent}°, 勾配=${el('percent').textContent}%, 比=${el('ratio').textContent}`;
  navigator.clipboard.writeText(t).catch(()=>{});
});
renderInputs();
