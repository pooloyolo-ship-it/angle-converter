
// ===== DOM =====
const tbody = document.getElementById('tbody');
const outBody = document.getElementById('outBody');
const bmGH = document.getElementById('bmGH');
const ihOut = document.getElementById('ihOut');

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
    <td><input type="number" class="dh" step="0.001" placeholder="e.g. +2.400 or -3.416" value="${dh}"/></td>
    <td><input type="text" class="memo" placeholder="Point label or note (e.g. P-12, TP1)"/></td>
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
  if(rows.length===0) throw new Error('No rows. Add at least one B.S row.');
  if(Number.isNaN(parseFloat(bmGH.value))) throw new Error('BM GH is empty.');
  if(rows[0].kind !== 'B.S') throw new Error('First row must be B.S.');
  if(Number.isNaN(rows[0].dh)) throw new Error('B.S DeltaH is empty.');
  for(let i=1;i<rows.length;i++){
    if(Number.isNaN(rows[i].dh)) throw new Error(`Row ${i+1}: DeltaH is empty.`);
    if(rows[i].kind==='B.S' && rows[i-1].kind==='B.S') throw new Error(`Row ${i} and ${i+1} cannot both be B.S.`);
  }
  return rows;
}

function format(n){ return (Math.round(n*1000)/1000).toFixed(3); }

function compute(){
  const rows = parseRows();
  const autoInvert = document.getElementById('autoInvert').checked;

  const adj = rows.map(r=>({ ...r, dhAdj: autoInvert ? -r.dh : r.dh }));

  const results = [];
  let IH = null;
  let currentBM = parseFloat(bmGH.value);
  let lastFS_GH = null;

  for(let i=0;i<adj.length;i++){
    const r = adj[i];
    if(r.kind==='B.S'){
      if(i>0){
        if(lastFS_GH==null) throw new Error(`Row ${i+1}: F.S before this B.S is required.`);
        currentBM = lastFS_GH;
      }
      IH = currentBM + r.dhAdj;
    } else {
      if(IH==null) throw new Error(`Row ${i+1}: B.S is required before F.S.`);
      const gh = IH - r.dhAdj;
      lastFS_GH = gh;
      results.push({ outIndex: results.length+1, inRow: i+1, name: r.memo || `P-${results.length+1}`, GH: gh });
    }
  }

  ihOut.value = IH==null ? '' : format(IH);

  outBody.innerHTML = '';
  results.forEach(res=>{
    const tr = document.createElement('tr');
    tr.id = `out-row-${res.outIndex}`;
    tr.dataset.inRow = String(res.inRow);
    tr.innerHTML = `<td>${res.outIndex}</td><td>R${res.inRow} (FS) <button class="btn" data-jump="${res.inRow}">⇢</button></td><td>${res.name}</td><td>${format(res.GH)}</td>`;
    outBody.appendChild(tr);
  });
  outBody.querySelectorAll('button[data-jump]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const r = e.currentTarget.getAttribute('data-jump');
      const target = document.getElementById(`row-${r}`);
      if(target){
        target.scrollIntoView({behavior:'smooth', block:'center'});
        target.classList.remove('pulse'); void target.offsetWidth; target.classList.add('pulse');
      }
    });
  });
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

function toCSV(){
  const rows = parseRows();
  const res = compute();
  let csv = '';
  csv += 'No,Type,DeltaH_TS(m),DeltaH_forHI(m),Note\n';
  rows.forEach((r,i)=>{ csv += `${i+1},${r.kind},${r.dh},${format(res.rows[i].dhAdj)},${(r.memo||'').replace(/[,\\n]/g,' ')}\n`; });
  csv += `\nIH(m),${res.IH!=null?format(res.IH):''}\n`;
  csv += `\nOutNo,InputRow,Point,GH(m)\n`;
  res.results.forEach(o=>{ csv += `${o.outIndex},R${o.inRow} (FS),${(o.name||'').replace(/[,\\n]/g,' ')},${format(o.GH)}\n`; });
  const BOM = new Uint8Array([0xEF,0xBB,0xBF]);
  const blob = new Blob([BOM, csv],{type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ts_leveling.csv';
  a.click();
}

function shareLink(){
  const state = {
    bm: parseFloat(bmGH.value),
    autoInvert: document.getElementById('autoInvert').checked,
    rows: [...tbody.querySelectorAll('tr')].map(tr=>({
      kind: tr.querySelector('.kind').value,
      dh: tr.querySelector('.dh').value,
      memo: tr.querySelector('.memo').value
    }))
  };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  location.hash = b64;
  navigator.clipboard?.writeText(location.href);
  alert('Copied shareable URL.');
}

function recalcStickyLeft(){
  const thead = tbody.closest('table').querySelector('thead tr');
  if(!thead) return;
  const cells = thead.children;
  if(cells.length<3) return;
  let left = 0; for(let k=0;k<3;k++){ left += cells[k].getBoundingClientRect().width; }
  document.documentElement.style.setProperty('--sticky-left', left+'px');
}
window.addEventListener('resize', recalcStickyLeft);

// hooks
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

// init
if(location.hash.slice(1)){
  try{
    const json = decodeURIComponent(escape(atob(location.hash.slice(1))));
    const state = JSON.parse(json);
    bmGH.value = state.bm;
    document.getElementById('autoInvert').checked = !!state.autoInvert;
    tbody.innerHTML = '';
    state.rows.forEach(r=>addRow(r.kind, r.dh));
    [...tbody.querySelectorAll('tr')].forEach((tr,idx)=>{ tr.querySelector('.memo').value = state.rows[idx]?.memo || ''; });
  }catch(e){ console.warn('restore failed', e); }
}
if(tbody.children.length===0){ addRow('B.S'); }
recalcStickyLeft();
