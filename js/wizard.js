
import { buildEstimate } from './estimator.js';
import { drawAvatar2D } from './avatar2d.js';
import { init3D, update3D } from './avatar3d.js';

let DATA = (window.CUSTOM_DATA || window.SAMPLE_DATA || []);

const ui = {
  progress: document.querySelector('#progbar'),
  stepWraps: [...document.querySelectorAll('.step')],
  next: document.querySelector('#next'), back: document.querySelector('#back'),
  height: document.querySelector('#iHeight'), weight: document.querySelector('#iWeight'), age: document.querySelector('#iAge'),
  sex: document.querySelector('#iSex'),
  shapeOpts: [...document.querySelectorAll('[data-shape]')],
  shoulderOpts: [...document.querySelectorAll('[data-shoulders]')],
  belly: document.querySelector('#iBelly'), muscle: document.querySelector('#iMuscle'),
  fit: document.querySelector('#iFit'),
  useCsv: document.querySelector('#useCsv'), csvFile: document.querySelector('#csvFile'),
  resJson: document.querySelector('#result-json'), avatar2d: document.querySelector('#avatar2d'), avatar3d: document.querySelector('#avatar3d'),
  toggle3d: document.querySelector('#toggle3d')
};

let state = { step:0, sex:'M', height_cm:null, weight_kg:null, age:null, bodyShape:'rectangle', shoulderSlope:'average', bellyLevel:1, muscleLevel:1, fit:'regular' };

function setStep(i){ state.step = Math.max(0, Math.min(ui.stepWraps.length-1, i)); ui.stepWraps.forEach((el,idx)=>el.classList.toggle('hidden', idx!==state.step)); ui.progress.style.width = (100* (state.step+1)/ui.stepWraps.length) + '%'; ui.back.classList.toggle('muted', state.step===0); ui.next.textContent = (state.step===ui.stepWraps.length-1) ? 'Calculer' : 'Continuer'; }

function pickOpt(list, key, val){ list.forEach(el=>{ el.classList.toggle('active', el.dataset[key]===val); el.addEventListener('click', ()=>{ list.forEach(e=>e.classList.remove('active')); el.classList.add('active'); state[key==='shape'?'bodyShape':'shoulderSlope']=el.dataset[key]; }); }); }

pickOpt(ui.shapeOpts, 'shape', 'rectangle');
pickOpt(ui.shoulderOpts, 'shoulders', 'average');

ui.back.addEventListener('click', ()=> setStep(state.step-1));
ui.next.addEventListener('click', ()=> { if (state.step<ui.stepWraps.length-1) setStep(state.step+1); else runEstimate(); });

ui.useCsv.addEventListener('change', ()=> document.querySelector('#csvPick').classList.toggle('hidden', !ui.useCsv.checked));
ui.csvFile.addEventListener('change', async (e)=>{ const f=e.target.files[0]; if(!f) return; const rows = await parseCsv(f); DATA = rows; toast('CSV chargé: '+rows.length+' lignes'); });

ui.toggle3d.addEventListener('change', ()=>{
  document.querySelector('.right').classList.toggle('view3d', ui.toggle3d.checked);
  if (ui.toggle3d.checked && !window._3dInited) { init3D(ui.avatar3d); window._3dInited = true; }
});

function parseCsv(file){ return file.text().then(t=>{ const lines=t.split(/\r?\n/).filter(Boolean); const headers=lines[0].split(',').map(h=>h.trim()); const rows=[]; for(let i=1;i<lines.length;i++){ const cells=lines[i].split(',').map(c=>c.trim()); const o={}; headers.forEach((h,idx)=>{ const n=Number(cells[idx]); o[h]=Number.isFinite(n)?n:(cells[idx]||null); }); rows.push(o);} return rows; }); }

function toast(msg){ const el=document.createElement('div'); el.textContent=msg; el.style.position='fixed'; el.style.bottom='16px'; el.style.right='16px'; el.style.background='#0f1320'; el.style.border='1px solid #334155'; el.style.color='#e5e7eb'; el.style.padding='8px 12px'; el.style.borderRadius='10px'; el.style.boxShadow='0 10px 30px rgba(0,0,0,.35)'; document.body.appendChild(el); setTimeout(()=>el.remove(), 2500); }

function runEstimate(){
  state.sex = ui.sex.value;
  state.height_cm = Number(ui.height.value||ui.height.dataset.val||ui.height.value);
  state.weight_kg = Number(ui.weight.value);
  state.age = Number(ui.age.value);
  state.bellyLevel = Number(ui.belly.value);
  state.muscleLevel = Number(ui.muscle.value);
  state.fit = ui.fit.value;
  if (!DATA || !DATA.length) return toast('Dataset vide');
  if (!state.height_cm || !state.weight_kg || !state.age) return toast('Complete taille, poids, âge');

  const { estimate, meta } = buildEstimate(DATA, {
    sex: state.sex, height_cm: state.height_cm, weight_kg: state.weight_kg, age: state.age,
    bodyShape: state.bodyShape, shoulderSlope: state.shoulderSlope
  });

  // micro-ajustements utilisateur
  const adj = { ...estimate, height_cm: state.height_cm, weight_kg: state.weight_kg };
  // ventre : augmente surtout la taille, un peu les hanches
  const bellyFactors = [0.00, 0.015, 0.035, 0.06]; // 0..3
  adj.waist_cm *= (1 + bellyFactors[state.bellyLevel] || 1);
  adj.hip_cm   *= (1 + (bellyFactors[state.bellyLevel]||0)*0.35);
  // musculature : augmente poitrine + biceps
  const muscleFactors = [0.00, 0.01, 0.025, 0.045];
  adj.chest_cm *= (1 + muscleFactors[state.muscleLevel] || 1);
  if (adj.bicep_cm) adj.bicep_cm *= (1 + (muscleFactors[state.muscleLevel]||0)*1.6);

  // Aisance (pour vêtement). On renvoie les 2 : corps + vêtement.
  const easeMap = { slim: -2.0, regular: 0.0, relaxed: 3.0 };
  const garment = {
    chest_cm: Math.max(0, adj.chest_cm + (easeMap[state.fit]||0)),
    waist_cm: Math.max(0, adj.waist_cm + (easeMap[state.fit]||0)),
    hip_cm:   Math.max(0, adj.hip_cm   + (easeMap[state.fit]||0))
  };

  drawAvatar2D(ui.avatar2d, adj);
  if (ui.toggle3d.checked) { if (!window._3dInited) { init3D(ui.avatar3d); window._3dInited=true; } update3D({ ...adj, ...state }, { shoulders: state.shoulderSlope }); }

  const payload = { input: { ...state }, bodyEstimate: adj, garmentTarget: garment, _meta: meta };
  ui.resJson.value = JSON.stringify(payload, null, 2);
  setStep(ui.stepWraps.length-1); // reste sur récap
}

setStep(0);
