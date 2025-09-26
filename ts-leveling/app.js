
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
    <td><input type="number" class="dh" step="0.001" inputmode="decimal" pattern="[-+0-9.]*" autocomplete="off" placeholder="例: +2.400 や -3.416" value="${dh}"/></td>
    <td><input type="text" class="memo" placeholder="測点名やメモ（例：P-12, TP1）"/></td>
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
        if(lastFS_GH==null) throw new Error(`${i+1}行目のB.Sの直前にF.Sが必要です。`);
        currentBM = lastFS_GH;
      }
      IH = currentBM + r.dhAdj;
    } else {
      if(IH==null) throw new Error(`${i+1}行目(F.S)の前にB.Sが必要です。`);
      const gh = IH - r.dhAdj;
      lastFS_GH = gh;
      results.push({ outIndex: results.length+1, inRow: i+1, name: r.memo || `測点${results.length+1}`, GH: gh });
    }
  }

  ihOut.value = IH==null ? '' : format(IH);

  outBody.innerHTML = '';
  results.forEach(res=>{
    const tr = document.createElement('tr');
    tr.id = `out-row-${res.outIndex}`;
    tr.dataset.inRow = String(res.inRow);
    tr.innerHTML = `<td>${res.outIndex}</td><td>R${res.inRow} (FS)</td><td>${res.name}</td><td>${format(res.GH)}</td>`;
    outBody.appendChild(tr);
  });

  return {IH, rows: adj, results};
}

function toCSV(){
  const rows = parseRows();
  const res = compute(); // 計算して最新状態を取得

  // 入力行 → GH の対応を作る（FS 行にだけ GH がある）
  const ghByInputRow = new Map();
  res.results.forEach(o => ghByInputRow.set(o.inRow, o.GH));

  // 単一の大きな表
  let csv = 'Row,Type,DeltaH_TS(m),DeltaH_forHI(m),Point,GH(m)\n';

  rows.forEach((r, i) => {
    const rowNo = i + 1;
    const kind = r.kind;
    const dhTS = r.dh;
    const dhHI = res.rows[i].dhAdj;
    const point = (r.memo || (kind === 'F.S' ? `P-${rowNo}` : '')).replace(/[\r\n,]/g, ' ');
    const gh = ghByInputRow.has(rowNo) ? (Math.round(ghByInputRow.get(rowNo) * 1000) / 1000).toFixed(3) : '';
    csv += `${rowNo},${kind},${dhTS},${dhHI},${point},${gh}\n`;
  });

  // IH を最後に追記
  csv += `\nIH(m),${res.IH != null ? (Math.round(res.IH * 1000) / 1000).toFixed(3) : ''}\n`;

  // Excel 文字化け対策
  const BOM = new Uint8Array([0xEF,0xBB,0xBF]);
  const blob = new Blob([BOM, csv], { type: 'text/csv;charset=utf-8;' });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ts_leveling.csv';
  a.click();
}
// === UTF-8安全なBase64（非推奨APIなし） ===
function toB64UTF8(str){
  return btoa(String.fromCharCode(...new TextEncoder().encode(str)));
}
function fromB64UTF8(b64){
  return new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
}
// 共有URLの #hash から状態を復元（ページ読込時に1回だけ実行）
(function restoreFromHash(){
  if(!location.hash) return;
  try{
    const json  = fromB64UTF8(location.hash.slice(1));
    const state = JSON.parse(json);

    if(state.bm != null) bmGH.value = state.bm;
    document.getElementById('autoInvert').checked = !!state.autoInvert;

    // 入力行を復元
    tbody.innerHTML = '';
    (state.rows || []).forEach(r => addRow(r.kind, r.dh));

    // メモ欄を復元
    const trs = [...tbody.querySelectorAll('tr')];
    (state.rows || []).forEach((r,i)=>{
      if(trs[i]) trs[i].querySelector('.memo').value = r.memo || '';
    });

    // 復元後に自動計算
    try { compute(); } catch(_) {}
  } catch(e){
    console.warn('restore failed:', e);
  }
})();

function shareLink(){
  const state = {
    bm: parseFloat(bmGH.value),
    autoInvert: document.getElementById('autoInvert').checked,
    rows: [...tbody.querySelectorAll('tr')].map(tr => ({
      kind: tr.querySelector('.kind').value,
      dh:   tr.querySelector('.dh').value,
      memo: tr.querySelector('.memo').value
    }))
  };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(state))));

  // 公開URLで共有できるリンクを生成（file:// でも公開URLにする）
  const PUBLIC_BASE = 'https://pooloyolo-ship-it.github.io/angle-converter/ts-leveling/';
  const link = (location.protocol === 'file:')
    ? (PUBLIC_BASE + '#' + b64)
    : (() => { const u = new URL(location.href); u.hash = b64; return u.toString(); })();

  navigator.clipboard?.writeText(link);
  alert('共有URLをコピーしました：\n' + link);
}

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
};

// init
if(tbody.children.length===0){ addRow('B.S'); }
