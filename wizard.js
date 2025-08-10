/* wizard.js — Tailor Wizard Pro + Santé étendue */

/* 1) Import lib santé (avec fallback si le CDN change d’API) */
import * as Fitness from 'https://cdn.jsdelivr.net/npm/fitness-calculator@1.1.1/+esm';

/* 2) Helpers DOM & state */
const $ = s => document.querySelector(s);
const TOTAL = 6;
let step = 1;

const CONFIG = {
  neckRatio: 0.145,
  chestRatio: 0.54,
  waistRatio: 0.46,
  hipRatio: 0.53,
  sleeveRatio: 0.445,
  shirtLenRatio: 0.455
};

const state = {
  unit: 'cm',
  age: 30,
  height_cm: 178,
  weight_kg: 68,
  shoe_eu: 43,
  body_shape: 'v-torso',
  shoulder: 'average',
  posture: 'neutral',
  activity: 'moderate',
  prediction: null
};

const fmt = v => (v === undefined || v === null) ? '-' : v;
const setBar = () => { $('#bar').style.width = `${(step/TOTAL)*100}%`; $('#sn').textContent = step; };
const updateJson = () => { $('#jsonBox').textContent = JSON.stringify(state, null, 2); };

/* 3) Fallback santé */
const has = (obj, k) => obj && typeof obj[k] === 'function';
const BMI = (h, w) => has(Fitness, 'BMI') ? Fitness.BMI(h, w) : w / Math.pow(h/100, 2);
const BMR = (sex, age, h, w) => has(Fitness, 'BMR') ? Fitness.BMR(sex, age, h, w) : 10*w + 6.25*h - 5*age + (sex === 'male' ? 5 : -161);
const TDEE = (sex, age, h, w, act='moderate') => {
  if (has(Fitness, 'TDEE')) return Fitness.TDEE(sex, age, h, w, act);
  const af = ({sedentary:1.2, light:1.375, moderate:1.55, vigorous:1.725})[act] || 1.55;
  return BMR(sex, age, h, w) * af;
};
const BodyFat = (bmi, age, sex='male') => {
  // Formule de Deurenberg
  const sexConst = sex === 'male' ? 1 : 0;
  return (1.20 * bmi) + (0.23 * age) - (10.8 * sexConst) - 5.4;
};
const WHtR = (waist, height) => waist / height;
const FFMI = (weight, height, bfPct) => {
  const leanMass = weight * (1 - bfPct / 100);
  return leanMass / Math.pow(height / 100, 2);
};

/* 4) SVG d’illustration */
const svg = title => `
<svg class="illus" viewBox="0 0 960 420" xmlns="http://www.w3.org/2000/svg">
  <rect x="20" y="20" width="920" height="380" rx="12" fill="#f7f9fd" stroke="#21304e" stroke-width="6"/>
  <text x="40" y="220" font-size="28" fill="#21304e" font-family="Inter,Arial,sans-serif">${title}</text>
</svg>`;

/* 5) Render étapes */
const render = () => {
  let html = '';
  if (step === 1) {
    html = `
      <h1>CRÉEZ UNE TAILLE UNIQUE POUR VOTRE CHEMISE</h1>
      ${svg('Étape 1 – Bases')}
      <div style="display:flex;gap:16px;margin:8px 4px 12px 4px">
        <label class="input"><input type="radio" name="unit" value="cm" ${state.unit==='cm'?'checked':''}/> Centimètres</label>
        <label class="input"><input type="radio" name="unit" value="in" ${state.unit==='in'?'checked':''}/> Pouces</label>
      </div>
      <div class="grid-2">
        ${slider('Âge','age',16,80,state.age,'ans')}
        ${slider('Taille','height_cm',150,210,state.height_cm,'cm')}
        ${slider('Poids','weight_kg',45,140,state.weight_kg,'kg')}
        ${slider('Pointure (EU)','shoe_eu',38,48,state.shoe_eu,'')}
      </div>
    `;
  }
  else if (step === 2) {
    html = `
      <h1>FORME DU CORPS</h1>
      ${svg('Étape 2 – Forme du corps')}
      ${cards('body_shape',[
        ['balanced','Équilibré','Poitrine ≈ Taille'],
        ['v-torso','V-torse','Poitrine > Taille'],
        ['a-torso','A-torse','Taille > Poitrine']
      ])}
    `;
  }
  else if (step === 3) {
    html = `
      <h1>ÉPAULES</h1>
      ${svg('Étape 3 – Épaules')}
      ${cards('shoulder',[
        ['straight','Droite',''],
        ['average','Moyenne',''],
        ['sloped','Penchée','']
      ])}
    `;
  }
  else if (step === 4) {
    html = `
      <h1>POSTURE & ACTIVITÉ</h1>
      ${cards('posture',[
        ['neutral','Neutre',''],
        ['upright','Redressée',''],
        ['rounded','Roulée','']
      ])}
      ${cards('activity',[
        ['sedentary','Faible',''],
        ['moderate','Moyenne',''],
        ['vigorous','Élevée','']
      ])}
    `;
  }
  else if (step === 5) {
    const p = state.prediction || {};
    html = `
      <h1>RÉSULTATS</h1>
      <div class="result">
        ${res('Col',p.neck_cm,'cm')}
        ${res('Poitrine',p.chest_cm,'cm')}
        ${res('Taille',p.waist_cm,'cm')}
        ${res('Hanches',p.hip_cm,'cm')}
        ${res('Manche',p.sleeve_cm,'cm')}
        ${res('Longueur',p.shirt_length_cm,'cm')}
        ${res('BMI',p.bmi)}
        ${res('BMR',p.bmr,'kcal')}
        ${res('TDEE',p.tdee,'kcal')}
        ${res('Body Fat %',p.body_fat_pct,'%')}
        ${res('WHtR',p.whtr)}
        ${res('FFMI',p.ffmi)}
      </div>
    `;
  }
  else if (step === 6) {
    html = `
      <h1>VALIDATION</h1>
      <pre>${JSON.stringify(state,null,2)}</pre>
    `;
  }

  $('#content').innerHTML = html;
  bindStep();
  setBar();
  updateJson();
};

/* 6) UI builders */
const slider = (label,id,min,max,val,unit) => `
<div>
  <label>${label}</label>
  <div class="input">
    <input id="${id}" type="range" min="${min}" max="${max}" value="${val}" />
    <span class="value" id="${id}Val">${val}</span> ${unit}
  </div>
</div>
`;

const cards = (group,arr) => `
<div class="cards">
  ${arr.map(([val,title,sub]) => `
    <button class="cardbtn ${state[group]===val?'selected':''}" data-group="${group}" data-val="${val}">
      <b>${title}</b>${sub?`<small>${sub}</small>`:''}
    </button>`).join('')}
</div>`;

const res = (label,val,unit='') => `<div class="kv"><b>${label}:</b> ${fmt(val)} ${unit}</div>`;

/* 7) Bind */
const bindStep = () => {
  if (step === 1) {
    document.querySelectorAll("input[name='unit']").forEach(r => r.addEventListener('change', e => {
      state.unit = e.target.value; updateJson();
    }));
    const bind = (id,key,out) => {
      const el = document.getElementById(id), lab = document.getElementById(out);
      const update = () => { state[key] = +el.value; lab.textContent = el.value; updateJson(); };
      el.addEventListener('input', update); update();
    };
    bind('age','age','ageVal');
    bind('height_cm','height_cm','height_cmVal');
    bind('weight_kg','weight_kg','weight_kgVal');
    bind('shoe_eu','shoe_eu','shoe_euVal');
  } else {
    document.querySelectorAll('.cardbtn').forEach(b => {
      b.addEventListener('click', () => {
        const group = b.dataset.group, val = b.dataset.val;
        document.querySelectorAll(`.cardbtn[data-group='${group}']`).forEach(x => x.classList.remove('selected'));
        b.classList.add('selected');
        state[group] = val;
        updateJson();
      });
    });
  }
};

/* 8) Calculs */
async function compute() {
  const h = state.height_cm;
  const w = state.weight_kg;
  const age = state.age;

  let neck = CONFIG.neckRatio*h;
  let chest = CONFIG.chestRatio*h;
  let waist = CONFIG.waistRatio*h;
  let hip   = CONFIG.hipRatio*h;
  let sleeve = CONFIG.sleeveRatio*h + 2.0;
  let shirtLen = CONFIG.shirtLenRatio*h;

  if (state.body_shape === 'v-torso') { chest += 4; waist -= 3; }
  if (state.body_shape === 'a-torso') { waist += 4; hip += 3; }
  if (state.shoulder === 'sloped')   { sleeve += 1.2; chest += 1; }
  if (state.posture === 'upright')   { shirtLen -= 1.0; }
  if (state.posture === 'rounded')   { shirtLen += 1.2; }
  if (state.activity === 'vigorous') { chest += 1.0; sleeve += 0.6; }
  if (age > 45) { chest += 0.8; waist += 1.0; }

  const bmiVal = BMI(h,w);
  const bmrVal = BMR('male',age,h,w);
  const tdeeVal = TDEE('male',age,h,w,state.activity);
  const bfPctVal = BodyFat(bmiVal,age,'male');
  const whtrVal = WHtR(waist,h);
  const ffmiVal = FFMI(w,h,bfPctVal);

  state.prediction = {
    neck_cm: +neck.toFixed(1),
    chest_cm: +chest.toFixed(1),
    waist_cm: +waist.toFixed(1),
    hip_cm: +hip.toFixed(1),
    sleeve_cm: +sleeve.toFixed(1),
    shirt_length_cm: +shirtLen.toFixed(1),
    bmi: +bmiVal.toFixed(2),
    bmr: Math.round(bmrVal),
    tdee: Math.round(tdeeVal),
    body_fat_pct: +bfPctVal.toFixed(1),
    whtr: +whtrVal.toFixed(3),
    ffmi: +ffmiVal.toFixed(2)
  };
  updateJson();
}

/* 9) Navigation */
$('#back').addEventListener('click', () => { if (step > 1) { step--; render(); } });
$('#next').addEventListener('click', async () => { if (step === 4) { await compute(); } if (step < TOTAL) { step++; render(); } });

/* 10) Boot */
render();
