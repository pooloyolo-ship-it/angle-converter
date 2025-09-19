
// ===== DOM =====
const tbody = document.getElementById('tbody');
const outBody = document.getElementById('outBody');
const bmGH = document.getElementById('bmGH');
const tgtH = document.getElementById('tgtH');
const ihOut = document.getElementById('ihOut');
const testLog = document.getElementById('testLog');

function addRow(kind='B.S', dh=''){
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="idx"></td>
    <td>
      <select class="kind">
        <option ${kind==='B.S'?'selected':''}>B.S</option>
        <option ${kind==='F.S'?'selected':''}>F.S</option>
      </select>
    </td>
    <td><input type="number" class="dh" step="0.001" placeholder="例: +2.400 や -3.416" value="${dh}"/></td>
    <td><input type="text" class="memo" placeholder="測点名やメモ（例：TP1, P-12）"/></td>
    <td><button class="btn" onclick="this.closest('tr').remove(); renumber();">✕</button></td>
  `;
  tbody.appendChild(tr);
  renumber();
}

function renumber(){
  [...tbody.querySelectorAll('tr')].forEach((tr,i)=>{
    tr.querySelector('.idx').textContent = i+1;
    tr.id = `row-${i+1}`;
    const kindSel = tr.querySelector('.kind');
    if(kindSel){ kindSel.disabled = (i===0); if(i===0) kindSel.value='B.S'; }
  });
  recalcStickyLeft();
}

function parseRows(){
  const rows = [...tbody.querySelectorAll('tr')].map(tr=>({
    kind: tr.querySelector('.kind').value,
    dh: parseFloat(tr.querySelector('.dh').value),
    memo: tr.querySelector('.memo').value.trim()
  }));
  if(rows.length===0) throw new Error('行がありません。最低1行（B.S）を追加してください。');
  if(Number.isNaN(parseFloat(bmGH.value))) throw new Error('BM標高が未入力です。');
  if(rows[0].kind !== 'B.S') throw new Error('最初の行は必ずB.Sにしてください。');
  if(Number.isNaN(rows[0].dh)) throw new Error('B.S の ΔH が未入力です。');
  for(let i=1;i<rows.length;i++){
    if(Number.isNaN(rows[i].dh)) throw new Error(`${i+1}行目の ΔH が未入力です。`);
    if(rows[i].kind==='B.S' && rows[i-1].kind==='B.S') throw new Error(`${i}行目と${i+1}行目に連続してB.Sは設定できません。間にF.Sを入れてください。`);
  }
  return rows;
}

function format(n){ return (Math.round(n*1000)/1000).toFixed(3); }

// ===== core compute =====
function compute(){
  const rows = parseRows();
  const autoInvert = document.getElementById('autoInvert').checked;
  const useTarget = document.getElementById('useTarget').checked;
  const h = parseFloat(tgtH.value);
  if(useTarget && Number.isNaN(h)){
    throw new Error('ターゲット高補正ON時は、ターゲット高（h）を入力してください。');
  }
  // adjust
  const adj = rows.map(r=>{
    let dh = r.dh;
    if(useTarget){ dh = dh - h; }
    if(autoInvert){ dh = -dh; }
    return {...r, dhAdj: dh};
  });

  const results = [];
  let IH = null;
  let currentBM = parseFloat(bmGH.value);
  let lastFS_GH = null;

  for(let i=0;i<adj.length;i++){
    const r = adj[i];
    if(r.kind==='B.S'){
      if(i>0){
        if(lastFS_GH==null) throw new Error(`${i+1}行目のB.Sの直前にF.Sが必要です。`);
        currentBM = lastFS_GH; // TP
      }
      IH = currentBM + r.dhAdj; // IH = BM + BS
    }else{
      if(IH==null) throw new Error(`${i+1}行目(F.S)の前にB.Sが必要です。`);
      const gh = IH - r.dhAdj;
      lastFS_GH = gh;
      results.push({ outIndex: results.length+1, inRow: i+1, kind: 'F.S', name: r.memo || `測点${results.length+1}`, GH: gh });
    }
  }

  ihOut.value = IH==null ? '' : format(IH);

  outBody.innerHTML = '';
  results.forEach(res=>{
    const tr = document.createElement('tr');
    tr.id = `out-row-${res.outIndex}`;
    tr.dataset.inRow = String(res.inRow);
    tr.innerHTML = `<td>${res.outIndex}</td><td>R${res.inRow} (F.S) <button class="btn" data-jump="${res.inRow}">⇢</button></td><td>${res.name}</td><td>${format(res.GH)}</td>`;
    outBody.appendChild(tr);
  });
  // output -> input
  outBody.querySelectorAll('button[data-jump]').forEach(btn=>{
    btn.addEventListener('click',(e)=>{
      const r = e.currentTarget.getAttribute('data-jump');
      const target = document.getElementById(`row-${r}`);
      if(target){
        target.scrollIntoView({behavior:'smooth', block:'center'});
        target.classList.remove('pulse'); void target.offsetWidth; target.classList.add('pulse');
      }
    });
  });
  // input -> output highlight
  [...tbody.querySelectorAll('tr')].forEach((tr,i)=>{
    const inRow = i+1;
    tr.onfocusin = ()=>{
      const out = outBody.querySelector(`[data-in-row="${inRow}"]`);
      if(out){
        out.classList.remove('pulse'); void out.offsetWidth; out.classList.add('pulse');
        out.scrollIntoView({behavior:'smooth', block:'nearest'});
      }
    };
  });

  requestAnimationFrame(()=>recalcStickyLeft());
  return {IH, rows: adj, results};
}

// ===== CSV / Share =====
function toCSV(){
  const rows = parseRows();
  const res = compute();
  let csv = 'No,種別,入力ΔH(TS表示),補正後ΔH(器高式),測点名/メモ\n';
  rows.forEach((r,i)=>{ csv += `${i+1},${r.kind},${r.dh},${format(res.rows[i].dhAdj)},${r.memo||''}\n`; });
  csv += `\nI.H(m),${res.IH!=null?format(res.IH):''}\n`;
  csv += `\n出力No,入力行,測点名,計算GH(m)\n`;
  res.results.forEach(o=>{ csv += `${o.outIndex},R${o.inRow} (F.S),${o.name},${format(o.GH)}\n`; });
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ts_leveling.csv';
  a.click();
}

function shareLink(){
  const state = {
    bm: parseFloat(bmGH.value),
    h: tgtH.value || null,
    autoInvert: document.getElementById('autoInvert').checked,
    useTarget: document.getElementById('useTarget').checked,
    rows: [...tbody.querySelectorAll('tr')].map(tr=>({
      kind: tr.querySelector('.kind').value,
      dh: tr.querySelector('.dh').value,
      memo: tr.querySelector('.memo').value
    }))
  };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  location.hash = b64;
  navigator.clipboard?.writeText(location.href);
  alert('このページURLをコピーしました。共有できます。');
}

// ===== Sticky left =====
function recalcStickyLeft(){
  const thead = tbody.closest('table').querySelector('thead tr');
  if(!thead) return;
  const cells = thead.children;
  if(cells.length<3) return;
  let left = 0; for(let k=0;k<3;k++){ left += cells[k].getBoundingClientRect().width; }
  document.documentElement.style.setProperty('--sticky-left', left+'px');
}
window.addEventListener('resize', recalcStickyLeft);

// ===== tests =====
function log(line){ testLog.textContent += (testLog.textContent?"\n":"") + line; }
function clearLog(){ testLog.textContent = ''; }

function runTests(){
  clearLog();
  try{
    // Test1: basic
    bmGH.value = 100.000;
    tgtH.value = '';
    document.getElementById('autoInvert').checked = true;
    document.getElementById('useTarget').checked = false;
    tbody.innerHTML='';
    addRow('B.S', '+2.400');
    addRow('F.S', '+4.648');
    addRow('F.S', '+3.742');
    addRow('F.S', '+3.455');
    const r1 = compute();
    if(r1.results.length!==3) throw new Error('Test1: F.S件数が一致しません');
    log('Test1: OK');

    // Test2: TP
    tbody.innerHTML='';
    addRow('B.S', '+1.000');   // R1
    addRow('F.S', '+2.000');   // R2 -> GH1
    addRow('B.S', '+0.500');   // R3 : TP1
    addRow('F.S', '+1.000');   // R4 -> GH2
    const r2 = compute();
    if(r2.results.length!==2) throw new Error('Test2: 出力件数不正');
    const mapOK = [...outBody.querySelectorAll('tr')].every(tr=>{
      const inRow = Number(tr.dataset.inRow);
      return tbody.querySelector(`#row-${inRow}`)!=null;
    });
    if(!mapOK) throw new Error('Test2: 入出力リンク不正');
    log('Test2: OK');

    // Test3: target height
    document.getElementById('useTarget').checked = true;
    tgtH.value = '1.500';
    const r3 = compute();
    if(!r3 || typeof r3.IH==='undefined') throw new Error('Test3: 返り値不正');
    log('Test3: OK');

    log('全テスト: OK');
  }catch(err){ log('失敗: '+err.message); }
}

// ===== hooks =====
document.getElementById('addRow').onclick = ()=>addRow(tbody.children.length? 'F.S':'B.S');
document.getElementById('calc').onclick = ()=>{ try{ compute(); }catch(e){ alert(e.message); }};
document.getElementById('exportCsv').onclick = ()=>{ try{ toCSV(); }catch(e){ alert(e.message); }};
document.getElementById('share').onclick = ()=>{ try{ shareLink(); }catch(e){ alert(e.message); }};
document.getElementById('clear').onclick = ()=>{ tbody.innerHTML=''; outBody.innerHTML=''; ihOut.value=''; };
document.getElementById('example').onclick = ()=>{
  tbody.innerHTML = '';
  addRow('B.S', '+2.400'); // R1
  addRow('F.S', '+4.648'); // R2 P-1
  addRow('F.S', '+3.742'); // R3 P-2
  addRow('B.S', '+1.230'); // R4 TP1
  addRow('F.S', '+3.455'); // R5 P-3
  addRow('F.S', '-8.341'); // R6
  addRow('B.S', '+0.950'); // R7 TP2
  addRow('F.S', '-11.409'); // R8
  addRow('F.S', '-12.272'); // R9
  addRow('F.S', '-14.574'); // R10
  const trs = [...tbody.querySelectorAll('tr')];
  if(trs[1]) trs[1].querySelector('.memo').value = 'P-1';
  if(trs[2]) trs[2].querySelector('.memo').value = 'P-2';
  if(trs[4]) trs[4].querySelector('.memo').value = 'P-3';
  recalcStickyLeft();
};
document.getElementById('runTests').onclick = runTests;

// init
if(location.hash.slice(1)){
  try{
    const json = decodeURIComponent(escape(atob(location.hash.slice(1))));
    const state = JSON.parse(json);
    bmGH.value = state.bm;
    tgtH.value = state.h ?? '';
    document.getElementById('autoInvert').checked = !!state.autoInvert;
    document.getElementById('useTarget').checked = !!state.useTarget;
    tbody.innerHTML = '';
    state.rows.forEach(r=>addRow(r.kind, r.dh));
    [...tbody.querySelectorAll('tr')].forEach((tr,idx)=>{ tr.querySelector('.memo').value = state.rows[idx]?.memo || ''; });
  }catch(e){ console.warn('restore failed', e); }
}
if(tbody.children.length===0){ addRow('B.S'); }
recalcStickyLeft();
