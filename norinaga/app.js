// norinaga/app.js (v6 with diagram)
const el = (id)=>document.getElementById(id);

const modes = {
  H_angle:   [ {id:"H", label:"水平 L (m)"}, {id:"A", label:"角度 θ (°)"} ],
  H_V:       [ {id:"H", label:"水平 L (m)"}, {id:"V", label:"高さ H (m)"} ],
  H_percent: [ {id:"H", label:"水平 L (m)"}, {id:"P", label:"％勾配（例 12）"} ],
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
      <input id="${f.id}" type="number" inputmode="decimal" placeholder="数値を入力" aria-label="${f.label}">`;
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
    showOutput(null);
    showDiagram(null);
    return;
  }

  const SL = Math.sqrt(H*H + V*V);
  const theta = Math.atan2(V,H)*180/Math.PI;
  const percent = (H>0) ? (V/H)*100 : null;
  const ratioX = (V>0) ? (H/V) : null;

  const data = {SL,H,V,theta,percent,ratioX};
  showOutput(data);
  showDiagram(data);
}

function showOutput(data){
  const copyBtn = document.getElementById('copyBtn');
  const out = el('out');
  if(!data){ out.style.display = 'none'; out.innerHTML = ''; if (copyBtn) copyBtn.style.display = 'none'; if (copyBtn) copyBtn.onclick = null; return; }
  const {SL,H,V,theta,percent,ratioX} = data;
  out.style.display = 'block';
  out.innerHTML = `
    <h2>法長 SL = ${fmt(SL)} m</h2>
    <p>水平 L = ${fmt(H)} m ／ 高さ H = ${fmt(V)} m</p>
    <p>角度 θ = ${fmt(theta)} ° ／ %勾配 = ${fmt(percent)} % ／ 比 = 1:${fmt(ratioX)}</p>
  `;
  if (copyBtn) {
    copyBtn.style.display = 'inline-block';
    copyBtn.onclick = ()=>{
      const text = `法長 SL=${fmt(SL)}m, 水平 L=${fmt(H)}m, 高さ H=${fmt(V)}m, 角度 θ=${fmt(theta)}°, %勾配=${fmt(percent)}%, 比=1:${fmt(ratioX)}`;
      navigator.clipboard.writeText(text)
        .then(()=>alert('コピーしました！'))
        .catch(()=>alert('コピーに失敗しました'));
    };
  }
}

function showDiagram(data){
  const card = document.getElementById('diagramCard');
  if(!data){ card.style.display='none'; return; }
  card.style.display = 'block';

  const {H,V,SL,theta,percent,ratioX} = data;
  const svg = document.getElementById('diagram');
  const x0 = 80, y0 = 360; // origin (left-bottom)
  const maxW = 640, maxH = 260;
  const scale = Math.min(maxW / H, maxH / Math.max(V, 0.0001));

  const w = H * scale;
  const h = V * scale;
  const x1 = x0 + w;
  const y1 = y0 - h;

  // slope line (red)
  const hyp = svg.querySelector('#hypLine');
  hyp.setAttribute('x1', x0); hyp.setAttribute('y1', y0);
  hyp.setAttribute('x2', x1); hyp.setAttribute('y2', y1);

  // dims
  const dimL = svg.querySelector('#dimL');
  dimL.setAttribute('x1', x0); dimL.setAttribute('x2', x1);
  const dimH = svg.querySelector('#dimH');
  dimH.setAttribute('x1', x1+16); dimH.setAttribute('x2', x1+16);
  dimH.setAttribute('y1', y0); dimH.setAttribute('y2', y1);

  // angle arc
  const r = 56;
  const ang = Math.atan2(h, w);
  const xA = x0 + r*Math.cos(0), yA = y0 - r*Math.sin(0);
  const xB = x0 + r*Math.cos(ang), yB = y0 - r*Math.sin(ang);
  const d = `M${xA},${yA} A${r},${r} 0 0 1 ${xB},${yB}`;
  svg.querySelector('#thetaArc').setAttribute('d', d);

  // labels
  svg.querySelector('#Hlabel').textContent = `水平 L = ${fmt(H)} m`;
  svg.querySelector('#Vlabel').textContent = `高さ H = ${fmt(V)} m`;
  svg.querySelector('#Tlabel').textContent = `角度 θ = ${fmt(theta)} °`;

  // along slope labels rotated
  const midX = x0 + w*0.5, midY = y0 - h*0.5;
  const deg = ang * 180/Math.PI;
  const sl = svg.querySelector('#SLlabel');
  const pl = svg.querySelector('#Plabel');
  const rl = svg.querySelector('#Rlabel');
  sl.textContent = `法長 SL = ${fmt(SL)} m`;
  pl.textContent = `勾配 % = ${fmt(percent)}`;
  rl.textContent = `比 1:X = ${fmt(ratioX)}`;
  [sl,pl,rl].forEach((t,i)=>{
    t.setAttribute('x', midX);
    t.setAttribute('y', midY + (i===1? 18 : i===2? 36 : 0));
    t.setAttribute('text-anchor','middle');
    t.setAttribute('transform', `rotate(${-deg} ${midX} ${midY})`);
  });
}

el('mode').addEventListener('change', renderInputs);
el('calc').addEventListener('click', calculate);
el('round').addEventListener('change', calculate);
renderInputs();
