const $ = s => document.querySelector(s);
const clamp = (v,a,b) => Math.min(b, Math.max(a, v));
const fmt = v => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);
const sfmt = v => (v < 0 ? '− ' : '+ ') + Math.abs(v).toFixed(2);

/* ---------- theme colours for canvas ---------- */
function hexRGB(c){
  c = c.trim();
  if (c[0] !== '#') return [128,128,128];
  if (c.length === 4) c = '#'+c[1]+c[1]+c[2]+c[2]+c[3]+c[3];
  return [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];
}
function themeColors(){
  const cs = getComputedStyle(document.documentElement), g = n => hexRGB(cs.getPropertyValue(n));
  return {bg:g('--surface'), blue:g('--blue'), orange:g('--orange'), ink:g('--ink'), line:g('--line')};
}
const mix = (a,b,t) => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
const css = c => `rgb(${c[0]|0},${c[1]|0},${c[2]|0})`;

/* ---------- tabs ---------- */
function showTab(name){
  const lab = name === 'lab';
  $('#p-neuron').hidden = lab; $('#p-lab').hidden = !lab;
  $('#tab-neuron').setAttribute('aria-selected', String(!lab));
  $('#tab-lab').setAttribute('aria-selected', String(lab));
  if (lab) { drawLab(); } else { L.training = false; syncTrainBtn(); }
}
$('#tab-neuron').onclick = () => showTab('neuron');
$('#tab-lab').onclick = () => showTab('lab');

/* =====================================================
   TAB 1: ONE NEURON
   ===================================================== */
const ACT = {
  step:   {f: z => z >= 0 ? 1 : 0, label:'step',    blurb:'Step: all or nothing. The output is 0 until the sum reaches zero, then it jumps to 1.'},
  sigmoid:{f: z => 1/(1+Math.exp(-z)), label:'sigmoid', blurb:'Sigmoid: a smooth switch. Any sum is squashed into a number between 0 and 1, which reads like a confidence.'},
  tanh:   {f: Math.tanh, label:'tanh',    blurb:'Tanh: like sigmoid but centered on zero, so the output runs from −1 to 1.'},
  relu:   {f: z => Math.max(0,z), label:'ReLU', blurb:'ReLU: positive sums pass straight through and negative sums become 0. Simple, and very common in real networks.'}
};
const SCN = {
  walk:{name:'Should I go for a walk?', labels:['Sunny','Free time'], v:{x1:.8,x2:.6,w1:1.5,w2:1,b:-1.2,act:'sigmoid'},
    yes:'Go walk today', no:'Stay inside',
    hint:'Both inputs push toward yes. Try raising the bias: the neuron becomes keen even on a gloomy day.'},
  and:{name:'Logic gate: AND', labels:['Input A','Input B'], v:{x1:1,x2:1,w1:1,w2:1,b:-1.5,act:'step'},
    yes:'Output ON', no:'Output OFF',
    hint:'Set both inputs to 1 for ON. The bias of −1.5 means one input alone is not enough, so it behaves like AND.'},
  free:{name:'Free play', labels:['Input 1','Input 2'], v:{x1:.5,x2:.5,w1:1,w2:-1,b:0,act:'tanh'},
    yes:'Neuron fires', no:'Neuron stays quiet',
    hint:'No rules. A negative weight makes an input push the neuron toward silence.'}
};
const N = {scn:'walk', x1:0,x2:0,w1:0,w2:0,b:0,act:'sigmoid'};

$('#scn').innerHTML = Object.entries(SCN).map(([k,s]) => `<option value="${k}">${s.name}</option>`).join('');
function loadScenario(k){
  N.scn = k; Object.assign(N, SCN[k].v);
  $('#scn').value = k; $('#act').value = N.act;
  $('#l-x1').textContent = SCN[k].labels[0]; $('#l-x2').textContent = SCN[k].labels[1];
  $('#t1').textContent = SCN[k].labels[0]; $('#t2').textContent = SCN[k].labels[1];
  $('#scnHint').textContent = SCN[k].hint;
  for (const id of ['x1','x2','w1','w2','b']) $('#s-'+id).value = N[id];
  renderNeuron();
}
$('#scn').onchange = e => loadScenario(e.target.value);
$('#act').onchange = e => { N.act = e.target.value; renderNeuron(); };
for (const id of ['x1','x2','w1','w2','b']) $('#s-'+id).oninput = e => { N[id] = parseFloat(e.target.value); renderNeuron(); };

function setPill(id, x, y, text){
  const g = $(id), t = g.querySelector('text'), r = g.querySelector('rect'), w = text.length*8 + 16;
  g.setAttribute('transform', `translate(${x},${y})`);
  t.textContent = text; r.setAttribute('width', w); r.setAttribute('x', -w/2);
}
function setEdge(id, w){
  const e = $(id);
  e.setAttribute('class', 'edge ' + (w >= 0 ? 'pos' : 'neg'));
  e.style.strokeWidth = (1.5 + Math.abs(w)*4).toFixed(1);
  e.style.opacity = Math.abs(w) < .05 ? .3 : .9;
}
function renderNeuron(){
  const s = N, f = ACT[s.act].f, S = SCN[s.scn];
  const p1 = s.x1*s.w1, p2 = s.x2*s.w2, z = p1 + p2 + s.b, out = f(z), fires = z >= 0 && !(z === 0 && s.act !== 'step');
  const on = z > 0 || (s.act === 'step' && z >= 0);

  for (const id of ['x1','x2','w1','w2','b']) $('#o-'+id).textContent = id[0]==='x' ? s[id].toFixed(2) : fmt(s[id]);
  setEdge('#e1', s.w1); setEdge('#e2', s.w2); setEdge('#eb', s.b);
  $('#v1').textContent = s.x1.toFixed(2); $('#v2').textContent = s.x2.toFixed(2);
  $('#c1').setAttribute('fill-opacity', (.1 + .55*s.x1).toFixed(2));
  $('#c2').setAttribute('fill-opacity', (.1 + .55*s.x2).toFixed(2));
  setPill('#p1', 84 + (340-84)*.45, 92 + (165-92)*.45, '× ' + fmt(s.w1));
  setPill('#p2', 84 + (340-84)*.45, 238 + (165-238)*.45, '× ' + fmt(s.w2));
  setPill('#pb', 340 + 44, 100, '+ ' + fmt(s.b));
  $('#zt').textContent = 'z = ' + fmt(z);
  $('#ft').textContent = 'then ' + ACT[s.act].label;
  $('#vo').textContent = out.toFixed(2);
  const co = $('#co');
  co.setAttribute('fill', on ? 'var(--blue)' : 'var(--orange)');
  const strength = s.act === 'relu' ? clamp(out/2,0,1) : s.act === 'tanh' ? Math.abs(out) : Math.abs(out - .5)*2;
  co.setAttribute('fill-opacity', (.12 + .55*strength).toFixed(2));
  $('#verdict').innerHTML = (on ? S.yes : S.no) + `<small>The sum z is ${on ? 'above' : 'below'} zero, so the neuron ${on ? 'leans yes' : 'leans no'}.</small>`;
  $('#steps').innerHTML = `
    <li><span>Multiply each input by its weight.<code>${s.x1.toFixed(2)} × ${fmt(s.w1)} = ${fmt(p1)}</code><code>${s.x2.toFixed(2)} × ${fmt(s.w2)} = ${fmt(p2)}</code></span></li>
    <li><span>Add the results and the bias.<code>${fmt(p1)} ${sfmt(p2)} ${sfmt(s.b)} = ${fmt(z)}</code></span></li>
    <li><span>Pass the sum through the ${ACT[s.act].label} function.<code>${ACT[s.act].label}(${fmt(z)}) = ${out.toFixed(2)}</code></span></li>`;
  $('#actBlurb').textContent = ACT[s.act].blurb;

  // activation plot: z in [-5,5] -> x 26..272 ; y in [-1.5,1.5]... drawn on 1 -> y8, -1 -> y132
  const X = v => 26 + (v + 5)/10*246, Y = v => 70 - v*62;
  let d = '';
  for (let i = 0; i <= 200; i++){ const zz = -5 + i*.05; d += (i ? 'L' : 'M') + X(zz).toFixed(1) + ',' + Y(f(zz)).toFixed(1); }
  $('#apath').setAttribute('d', d);
  const zc = clamp(z,-5,5);
  $('#amx').setAttribute('x1', X(zc)); $('#amx').setAttribute('x2', X(zc));
  $('#adot').setAttribute('cx', X(zc)); $('#adot').setAttribute('cy', clamp(Y(f(zc)), 4, 136));
}

/* =====================================================
   TAB 2: NETWORK LAB
   ===================================================== */
const G = 40;                         // grid resolution for heatmaps
const HACT = {
  tanh:   {f: Math.tanh,               d: a => 1 - a*a, kind:'tanh'},
  relu:   {f: z => Math.max(0,z),      d: a => a > 0 ? 1 : 0, kind:'relu'},
  sigmoid:{f: z => 1/(1+Math.exp(-z)), d: a => a*(1-a), kind:'sig'}
};
const gauss = () => Math.sqrt(-2*Math.log(1 - Math.random())) * Math.cos(2*Math.PI*Math.random());

const DATASETS = {
  blobs:{name:'Two groups', make(){
    const p = [];
    for (let i = 0; i < 60; i++){ p.push({x:clamp(.5+gauss()*.17,-.95,.95), y:clamp(.45+gauss()*.17,-.95,.95), c:1});
                                   p.push({x:clamp(-.5+gauss()*.17,-.95,.95), y:clamp(-.45+gauss()*.17,-.95,.95), c:0}); }
    return p; }},
  or:{name:'OR', make(){
    const p = [];
    for (const [cx,cy,c] of [[-.55,-.55,0],[.55,-.55,1],[-.55,.55,1],[.55,.55,1]])
      for (let i = 0; i < 28; i++) p.push({x:clamp(cx+gauss()*.14,-.95,.95), y:clamp(cy+gauss()*.14,-.95,.95), c});
    return p; }},
  and:{name:'AND', make(){
    const p = [];
    for (const [cx,cy,c] of [[-.55,-.55,0],[.55,-.55,0],[-.55,.55,0],[.55,.55,1]])
      for (let i = 0; i < 28; i++) p.push({x:clamp(cx+gauss()*.14,-.95,.95), y:clamp(cy+gauss()*.14,-.95,.95), c});
    return p; }},
  xor:{name:'XOR', make(){
    const p = [];
    for (const [cx,cy,c] of [[-.55,-.55,1],[.55,-.55,0],[-.55,.55,0],[.55,.55,1]])
      for (let i = 0; i < 28; i++) p.push({x:clamp(cx+gauss()*.14,-.95,.95), y:clamp(cy+gauss()*.14,-.95,.95), c});
    return p; }},
  ring:{name:'Ring', make(){
    const p = [];
    for (let i = 0; i < 70; i++){
      let a = Math.random()*6.283, r = Math.random()*.3; p.push({x:Math.cos(a)*r, y:Math.sin(a)*r, c:1});
      a = Math.random()*6.283; r = .62 + Math.random()*.3; p.push({x:Math.cos(a)*r, y:Math.sin(a)*r, c:0});
    }
    return p; }}
};

const L = {data:[], dataset:'blobs', hidden:[], act:'tanh', lr:.03, net:null, training:false,
           epoch:0, losses:[], loss:null, acc:null, addClass:1, grid:null, nodes:null, edges:null};

function makeNet(hidden, act){
  const sizes = [2, ...hidden, 1], net = {sizes, act, W:[], b:[], mW:[], vW:[], mb:[], vb:[], t:0};
  for (let l = 0; l < sizes.length-1; l++){
    const nin = sizes[l], nout = sizes[l+1], lim = Math.sqrt(6/(nin+nout));
    net.W.push(Array.from({length:nout}, () => Array.from({length:nin}, () => (Math.random()*2-1)*lim)));
    net.b.push(new Array(nout).fill(0));
    net.mW.push(Array.from({length:nout}, () => new Array(nin).fill(0)));
    net.vW.push(Array.from({length:nout}, () => new Array(nin).fill(0)));
    net.mb.push(new Array(nout).fill(0)); net.vb.push(new Array(nout).fill(0));
  }
  return net;
}
function forward(net, x, y){
  const h = HACT[net.act], acts = [[x,y]], last = net.W.length-1;
  for (let l = 0; l <= last; l++){
    const prev = acts[l], out = [];
    for (let j = 0; j < net.W[l].length; j++){
      let z = net.b[l][j]; const w = net.W[l][j];
      for (let i = 0; i < w.length; i++) z += w[i]*prev[i];
      out.push(l === last ? 1/(1+Math.exp(-z)) : h.f(z));
    }
    acts.push(out);
  }
  return acts;
}
function trainStep(net, data){
  if (!data.length) return {loss:0, acc:0};
  const h = HACT[net.act], nl = net.W.length, n = data.length;
  const gW = net.W.map(m => m.map(r => r.map(() => 0))), gb = net.b.map(r => r.map(() => 0));
  let loss = 0, ok = 0;
  for (const pt of data){
    const acts = forward(net, pt.x, pt.y), p = clamp(acts[nl][0], 1e-6, 1-1e-6);
    loss -= pt.c ? Math.log(p) : Math.log(1-p);
    if ((p > .5) === !!pt.c) ok++;
    let delta = [p - pt.c];
    for (let l = nl-1; l >= 0; l--){
      const prevD = l > 0 ? new Array(net.sizes[l]).fill(0) : null;
      for (let j = 0; j < delta.length; j++){
        gb[l][j] += delta[j];
        for (let i = 0; i < net.W[l][j].length; i++){
          gW[l][j][i] += delta[j]*acts[l][i];
          if (prevD) prevD[i] += net.W[l][j][i]*delta[j];
        }
      }
      if (prevD){ for (let i = 0; i < prevD.length; i++) prevD[i] *= h.d(acts[l][i]); delta = prevD; }
    }
  }
  net.t++;
  const b1 = .9, b2 = .999, lr = L.lr, c1 = 1 - Math.pow(b1, net.t), c2 = 1 - Math.pow(b2, net.t);
  const upd = (g, m, v) => { g /= n; m = b1*m + (1-b1)*g; v = b2*v + (1-b2)*g*g; return [m, v, -lr*(m/c1)/(Math.sqrt(v/c2) + 1e-8)]; };
  for (let l = 0; l < nl; l++) for (let j = 0; j < net.W[l].length; j++){
    for (let i = 0; i < net.W[l][j].length; i++){
      const [m, v, dw] = upd(gW[l][j][i], net.mW[l][j][i], net.vW[l][j][i]);
      net.mW[l][j][i] = m; net.vW[l][j][i] = v; net.W[l][j][i] += dw;
    }
    const [m, v, db] = upd(gb[l][j], net.mb[l][j], net.vb[l][j]);
    net.mb[l][j] = m; net.vb[l][j] = v; net.b[l][j] += db;
  }
  return {loss: loss/n, acc: ok/n};
}

/* ----- structure & DOM for the network diagram ----- */
function resetNet(){
  L.net = makeNet(L.hidden, L.act); L.epoch = 0; L.losses = []; L.loss = null; L.acc = null;
  buildNetDOM(); drawLab();
}
function buildNetDOM(){
  const sizes = L.net.sizes, nc = sizes.length, maxN = Math.max(...sizes);
  const wrap = $('#netwrap');
  wrap.style.height = Math.max(190, maxN*52 + 16) + 'px';
  const pos = (c, i) => [ (c + .5)/nc*100, (i + .5)/sizes[c]*100 ];
  let svg = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">';
  L.edges = [];
  for (let c = 1; c < nc; c++){
    L.edges[c-1] = [];
    for (let j = 0; j < sizes[c]; j++){ L.edges[c-1][j] = [];
      for (let i = 0; i < sizes[c-1]; i++){
        const [x1,y1] = pos(c-1,i), [x2,y2] = pos(c,j);
        svg += `<line data-l="${c-1}" data-j="${j}" data-i="${i}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--blue)" stroke-width="1"/>`;
      }}
  }
  svg += '</svg>';
  let nodes = '';
  L.nodes = [];
  for (let c = 0; c < nc; c++){
    L.nodes[c] = [];
    for (let j = 0; j < sizes[c]; j++){
      const [x,y] = pos(c,j), tag = c === 0 ? (j ? 'y' : 'x') : c === nc-1 ? 'out' : '';
      nodes += `<div class="node" style="left:${x}%;top:${y}%"><canvas width="${G}" height="${G}"></canvas>${tag ? `<i>${tag}</i>` : ''}</div>`;
    }
  }
  wrap.innerHTML = svg + nodes;
  const cvs = wrap.querySelectorAll('canvas'); let k = 0;
  for (let c = 0; c < nc; c++) for (let j = 0; j < sizes[c]; j++) L.nodes[c][j] = cvs[k++];
  wrap.querySelectorAll('line').forEach(e => { L.edges[+e.dataset.l][+e.dataset.j][+e.dataset.i] = e; });
  $('#colhead').innerHTML = sizes.map((_, c) => `<span>${c === 0 ? 'Inputs' : c === nc-1 ? 'Output' : 'Hidden ' + c}</span>`).join('');
  L.grid = sizes.map(n => Array.from({length:n}, () => new Float32Array(G*G)));
}

function buildLayerControls(){
  const el = $('#layers'); el.innerHTML = '';
  if (!L.hidden.length){
    const s = document.createElement('span'); s.className = 'note'; s.textContent = 'No hidden layers: this is a single neuron.'; el.append(s);
  }
  L.hidden.forEach((n, i) => {
    const d = document.createElement('div'); d.className = 'layer';
    d.innerHTML = `<span>Layer ${i+1}</span><button class="mini" aria-label="Remove a neuron from layer ${i+1}" ${n <= 1 ? 'disabled' : ''}>−</button><b>${n}</b><button class="mini" aria-label="Add a neuron to layer ${i+1}" ${n >= 8 ? 'disabled' : ''}>+</button><button class="mini" aria-label="Delete layer ${i+1}">×</button>`;
    const b = d.querySelectorAll('button');
    b[0].onclick = () => { L.hidden[i]--; rebuild(); };
    b[1].onclick = () => { L.hidden[i]++; rebuild(); };
    b[2].onclick = () => { L.hidden.splice(i,1); rebuild(); };
    el.append(d);
  });
  const add = document.createElement('button'); add.className = 'btn'; add.textContent = '+ Add layer';
  add.disabled = L.hidden.length >= 3; add.style.opacity = add.disabled ? .4 : 1;
  add.onclick = () => { L.hidden.push(3); rebuild(); };
  el.append(add);
}
function rebuild(){ buildLayerControls(); resetNet(); }

/* ----- datasets ----- */
function buildDsRow(){
  $('#dsRow').innerHTML = '';
  for (const [k, d] of Object.entries(DATASETS)){
    const b = document.createElement('button'); b.className = 'chip'; b.textContent = d.name;
    b.setAttribute('aria-pressed', String(k === L.dataset));
    b.onclick = () => { setDataset(k); resetNet(); };
    $('#dsRow').append(b);
  }
}
function setDataset(k){ L.dataset = k; L.data = DATASETS[k].make(); buildDsRow(); }

/* ----- drawing ----- */
const heat = document.createElement('canvas'); heat.width = heat.height = G;
function drawLab(){
  if ($('#p-lab').hidden || !L.net) return;
  const C = themeColors(), net = L.net, nl = net.sizes.length, h = HACT[net.act];

  // forward pass over a grid, storing every neuron's activation
  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++){
    const acts = forward(net, -1 + 2*(gx+.5)/G, 1 - 2*(gy+.5)/G), k = gy*G + gx;
    for (let c = 0; c < nl; c++) for (let j = 0; j < acts[c].length; j++) L.grid[c][j][k] = acts[c][j];
  }
  // main heatmap
  const hc = heat.getContext('2d'), img = hc.createImageData(G,G), out = L.grid[nl-1][0];
  for (let k = 0; k < G*G; k++){
    const p = out[k], a = .22 + .5*Math.abs(p - .5)*2, col = mix(C.bg, mix(C.orange, C.blue, p), a);
    img.data[k*4] = col[0]; img.data[k*4+1] = col[1]; img.data[k*4+2] = col[2]; img.data[k*4+3] = 255;
  }
  hc.putImageData(img, 0, 0);
  const cv = $('#board'), ctx = cv.getContext('2d'), W = cv.width;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(heat, 0, 0, W, W);
  ctx.strokeStyle = css(mix(C.bg, C.ink, .25)); ctx.lineWidth = 1; ctx.setLineDash([4,5]);
  ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,W); ctx.moveTo(0,W/2); ctx.lineTo(W,W/2); ctx.stroke(); ctx.setLineDash([]);
  for (const pt of L.data){
    const p = forward(net, pt.x, pt.y)[nl-1][0], wrong = (p > .5) !== !!pt.c;
    const px = (pt.x+1)/2*W, py = (1-pt.y)/2*W;
    ctx.beginPath(); ctx.arc(px, py, 6, 0, 6.283);
    ctx.fillStyle = css(pt.c ? C.blue : C.orange); ctx.fill();
    ctx.lineWidth = wrong ? 3 : 2; ctx.strokeStyle = wrong ? css(C.ink) : css(C.bg); ctx.stroke();
  }

  // neuron thumbnails
  for (let c = 0; c < nl; c++) for (let j = 0; j < net.sizes[c]; j++){
    const cx = L.nodes[c][j].getContext('2d'), im = cx.createImageData(G,G), arr = L.grid[c][j];
    const kind = c === 0 ? 'tanh' : c === nl-1 ? 'sig' : h.kind;
    for (let k = 0; k < G*G; k++){
      const a = arr[k], v = kind === 'tanh' ? (a+1)/2 : kind === 'relu' ? Math.min(a,1.5)/1.5 : a;
      const col = mix(C.bg, mix(C.orange, C.blue, clamp(v,0,1)), .85);
      im.data[k*4] = col[0]; im.data[k*4+1] = col[1]; im.data[k*4+2] = col[2]; im.data[k*4+3] = 255;
    }
    cx.putImageData(im, 0, 0);
  }
  // weights
  for (let l = 0; l < net.W.length; l++) for (let j = 0; j < net.W[l].length; j++) for (let i = 0; i < net.W[l][j].length; i++){
    const w = net.W[l][j][i], e = L.edges[l][j][i];
    e.setAttribute('stroke', w >= 0 ? 'var(--blue)' : 'var(--orange)');
    e.setAttribute('stroke-width', clamp(Math.abs(w)*2.2, .5, 8).toFixed(1));
    e.setAttribute('stroke-opacity', clamp(.25 + Math.abs(w)*.4, .3, .9).toFixed(2));
  }
  drawLoss(C); updateStats();
}
function drawLoss(C){
  const cv = $('#loss'), ctx = cv.getContext('2d'), W = cv.width, H = cv.height, ls = L.losses;
  ctx.clearRect(0,0,W,H);
  ctx.strokeStyle = css(C.line); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0,H-1); ctx.lineTo(W,H-1); ctx.stroke();
  if (ls.length < 2) return;
  const max = Math.max(.8, ...ls), step = Math.max(1, Math.floor(ls.length/300));
  ctx.strokeStyle = css(C.blue); ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
  for (let i = 0, n = 0; i < ls.length; i += step, n++){
    const x = i/(ls.length-1)*(W-6) + 3, y = H - 6 - (ls[i]/max)*(H-14);
    n ? ctx.lineTo(x,y) : ctx.moveTo(x,y);
  }
  ctx.stroke();
}
function updateStats(){
  $('#sEpoch').textContent = L.epoch;
  $('#sLoss').textContent = L.loss == null ? '–' : L.loss.toFixed(3);
  $('#sAcc').textContent = L.acc == null ? '–' : Math.round(L.acc*100) + '%';
  const coach = $('#coach'); let msg, win = false;
  const hard = L.dataset === 'xor' || L.dataset === 'ring';
  if (!L.data.length) msg = 'There are no points yet. Click the board to add some, or pick a pattern below it.';
  else if (L.acc != null && L.acc >= .97 && L.epoch > 20){ win = true; msg = 'Solved. The network separates the two colours. Click the board to add a new dot and see if it lands in the right zone.'; }
  else if (!L.hidden.length && hard && L.epoch > 150 && (L.acc||0) < .8) msg = 'A single neuron can only draw one straight line, so it cannot separate this pattern. Add a hidden layer in the builder and train again.';
  else if (L.epoch === 0) msg = 'Press Train. The weights start out random, so the first guesses are poor.';
  else if (L.training) msg = 'Training. Each step nudges every weight a little in the direction that lowers the loss.';
  else msg = 'Paused. Press Train to keep going, or change the network and see what happens.';
  coach.textContent = msg; coach.classList.toggle('win', win);
}

/* ----- training loop ----- */
function doSteps(k){
  for (let s = 0; s < k; s++){
    const r = trainStep(L.net, L.data); L.epoch++; L.loss = r.loss; L.acc = r.acc;
    L.losses.push(r.loss); if (L.losses.length > 1500) L.losses.shift();
  }
}
function syncTrainBtn(){ $('#train').textContent = L.training ? '❚❚ Pause' : '▶ Train'; }
function loop(){
  if (!L.training) return;
  if (L.data.length) doSteps(5);
  if (L.epoch > 8000){ L.training = false; syncTrainBtn(); }
  drawLab();
  requestAnimationFrame(loop);
}
function setTraining(on){ L.training = on; syncTrainBtn(); if (on) requestAnimationFrame(loop); else drawLab(); }

$('#train').onclick = () => setTraining(!L.training);
$('#stepBtn').onclick = () => { setTraining(false); if (L.data.length) doSteps(1); drawLab(); };
$('#resetBtn').onclick = () => { setTraining(false); resetNet(); };
$('#hAct').onchange = e => { L.act = e.target.value; resetNet(); };
$('#speed').onchange = e => { L.lr = parseFloat(e.target.value); };

$('#board').addEventListener('click', e => {
  const r = e.target.getBoundingClientRect();
  const x = (e.clientX - r.left)/r.width*2 - 1, y = 1 - (e.clientY - r.top)/r.height*2;
  if (L.data.length >= 400) return;
  L.data.push({x:clamp(x,-1,1), y:clamp(y,-1,1), c: e.shiftKey ? 1 - L.addClass : L.addClass});
  drawLab();
});
function setAdd(c){ L.addClass = c; $('#addA').setAttribute('aria-pressed', String(c === 1)); $('#addB').setAttribute('aria-pressed', String(c === 0)); }
$('#addA').onclick = () => setAdd(1); $('#addB').onclick = () => setAdd(0);
$('#clearPts').onclick = () => { L.data = []; L.epoch = 0; L.losses = []; L.loss = L.acc = null; setTraining(false); };

/* ----- experiments ----- */
const EXPS = [
  {t:'1. A line is enough', d:'One neuron splits two groups.', ds:'blobs', h:[]},
  {t:'2. Hit the wall', d:'One neuron cannot solve XOR.', ds:'xor', h:[]},
  {t:'3. Add a hidden layer', d:'Four neurons crack XOR.', ds:'xor', h:[4]},
  {t:'4. Wrap a ring', d:'Curved shapes need more neurons.', ds:'ring', h:[5]}
];
$('#exps').innerHTML = EXPS.map((x, i) => `<button class="exp" data-i="${i}"><b>${x.t}</b><span>${x.d}</span></button>`).join('');
document.querySelectorAll('.exp').forEach(b => b.onclick = () => {
  const x = EXPS[+b.dataset.i];
  setTraining(false); L.hidden = x.h.slice(); setDataset(x.ds); buildLayerControls(); resetNet();
  window.scrollTo({top: 0, behavior: 'smooth'}); setTraining(true);
});

/* ----- boot ----- */
loadScenario('walk');
L.data = DATASETS.blobs.make(); buildDsRow(); buildLayerControls(); resetNet();
if (location.hash === '#lab') showTab('lab');
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => drawLab());
new MutationObserver(() => drawLab()).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
