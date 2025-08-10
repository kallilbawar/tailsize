/* wizard.js — Tailor Wizard (front-only, pro) */

/* 1) Import lib santé (avec fallback si le CDN change d’API) */
import * as Fitness from 'https://cdn.jsdelivr.net/npm/fitness-calculator@1.1.1/+esm';

/* 2) Helpers DOM & state */
const $ = s => document.querySelector(s);
const TOTAL = 6;
let step = 1;

const state = {
  /* unités & bases */
  unit: 'cm',
  age: 30,
  height_cm: 178,
  weight_kg: 68,
  shoe_eu: 43,
  /* morphologie */
  body_shape: 'v-torso',   // balanced | v-torso | a-torso
  shoulder: 'average',      // straight | average | sloped
  posture: 'neutral',       // neutral | upright | rounded
  activity: 'moderate',     // sedentary | light | moderate | vigorous
  /* résultats */
  prediction: null
};

const fmt = v => (v===undefined||v===null) ? '-' : v;
const setBar = () => { $('#bar').style.width = `${(step/TOTAL)*100}%`; $('#sn').textContent = step; };
const updateJson = () => { $('#jsonBox').textContent = JSON.stringify(state, null, 2); };

/* 3) Fallback santé si la lib n’expose pas les fonctions attendues */
const has = (obj, k) => obj && typeof obj[k] === 'function';

const BMI = (h, w) => {
  if (has(Fitness, 'BMI')) return Fitness.BMI(h, w);
  return w / Math.pow(h/100, 2);
};
const BMR = (sex, age, h, w) => {
  if (has(Fitness, 'BMR')) return Fitness.BMR(sex, age, h, w);
  // Mifflin-St Jeor
  const base = 10*w + 6.25*h - 5*age + (sex==='male' ? 5 : -161);
  return base;
};
const TDEE = (sex, age, h, w, act='moderate') => {
  if (has(Fitness, 'TDEE')) return Fitness.TDEE(sex, age, h, w, act);
  const af = ({sedentary:1.2, light:1.375, moderate:1.55, vigorous:1.725})[act] || 1.55;
  return BMR(sex, age, h, w) * af;
};

/* 4) UI render par étapes (SVG inline pour rester sans assets) */
const svg = title => `
<svg class="illus" viewBox="0 0 960 420" xmlns="http://www.w3.org/2000/svg">
  <rect x="20" y="20" width="920" height="380" rx="12" fill="#f7f9fd" stroke="#21304e" stroke-width="6"/>
  <text x="40" y="220" font-size="28" fill="#21304e" font-family="Inter,Arial,sans-serif">${title}</text>
</svg>`;

const render = () => {
  let html = '';
  if (step === 1) {
    html = `
      <h1>CRÉEZ UNE TAILLE UNIQUE POUR VOTRE CHEMISE</h1>
      <p class="helper">Ça prend quelques secondes — flux inspiré Tailorstore.</p>
      ${svg('Étape 1 – Bases')}
      <div style="display:flex;gap:16px;margin:8px 4px 12px 4px">
        <label class="input"><input type="radio" name="unit" value="cm" ${state.unit==='cm'?'checked':''}/> Centimètres</label>
        <label class="input"><input type="radio" name="unit" value="in" ${state.unit==='in'?'checked':''}/> Pouces</label>
      </div>
      <div class="grid-2">
        <div>
          <label>Âge</label>
          <div class="input"><input id="age" type="range" min="16" max="80" value="${state.age}" /><span class="value" id="ageVal">${state.age}</span> ans</div>
        </div>
        <div>
          <label>Votre taille</label>
          <div class="input"><input id="height" type="range" min="150" max="210" value="${state.height_cm}" /><span class="value" id="hVal">${state.height_cm}</span> cm</div>
        </div>
        <div>
          <label>Poids</label>
          <div class="input"><input id="weight" type="range" min="45" max="140" value="${state.weight_kg}" /><span class="value" id="wVal">${state.weight_kg}</span> kg</div>
        </div>
        <div>
          <label>Pointure (EU)</label>
          <div class="input"><input id="shoe" type="range" min="38" max="48" value="${state.shoe_eu}" /><span class="value" id="sVal">${state.shoe_eu}</span></div>
        </div>
      </div>
      <div class="banner">GARANTIE D’AJUSTEMENT SANS RISQUE — si ça ne va pas, on en envoie un autre (aucun retour nécessaire).</div>
    `;
  } else if (step === 2) {
    html = `
      <h1>VOTRE AJUSTEMENT PARFAIT COMMENCE ICI.</h1>
      <p class="helper">Quelle forme ressemble le plus à ton corps ?</p>
      ${svg('Étape 2 – Forme du corps')}
      <div class="cards">
        <button class="cardbtn" data-group="body_shape" data-val="balanced"><b>Équilibré</b><small>Poitrine ≈ Taille</small></button>
        <button class="cardbtn selected" data-group="body_shape" data-val="v-torso"><b>V-torse</b><small>Poitrine &gt; Taille</small></button>
        <button class="cardbtn" data-group="body_shape" data-val="a-torso"><b>A-torse</b><small>Taille &gt; Poitrine</small></button>
      </div>
    `;
  } else if (step === 3) {
    html = `
      <h1>DÉFINISSONS LA FORME DE TES ÉPAULES.</h1>
      ${svg('Étape 3 – Épaules')}
      <div class="cards">
        <button class="cardbtn" data-group="shoulder" data-val="straight"><b>Droite</b></button>
        <button class="cardbtn selected" data-group="shoulder" data-val="average"><b>Moyenne</b></button>
        <button class="cardbtn" data-group="shoulder" data-val="sloped"><b>Penché</b></button>
      </div>
    `;
  } else if (step === 4) {
    html = `
      <h1>POSTURE & ACTIVITÉ</h1>
      <p class="helper">Ces paramètres influencent les aisances et longueurs.</p>
      <div class="cards">
        <button class="cardbtn selected" data-group="posture" data-val="neutral"><b>Neutre</b></button>
        <button class="cardbtn" data-group="posture" data-val="upright"><b>Redressée</b></button>
        <button class="cardbtn" data-group="posture" data-val="rounded"><b>Roulée</b></button>
      </div>
      <div class="cards" style="margin-top:8px">
        <button class="cardbtn" data-group="activity" data-val="sedentary"><b>Faible</b></button>
        <button class="cardbtn selected" data-group="activity" data-val="moderate"><b>Moyenne</b></button>
        <button class="cardbtn" data-group="activity" data-val="vigorous"><b>Élevée</b></button>
      </div>
    `;
  } else if (step === 5) {
    const p = state.prediction || {};
    html = `
      <h1>RÉSULTATS</h1>
      <div class="result">
        <div class="kv"><b>Col :</b> ${fmt(p.neck_cm)} cm</div>
        <div class="kv"><b>Poitrine :</b> ${fmt(p.chest_cm)} cm</div>
        <div class="kv"><b>Taille :</b> ${fmt(p.waist_cm)} cm</div>
        <div class="kv"><b>Hanches :</b> ${fmt(p.hip_cm)} cm</div>
        <div class="kv"><b>Manche :</b> ${fmt(p.sleeve_cm)} cm</div>
        <div class="kv"><b>Longueur :</b> ${fmt(p.shirt_length_cm)} cm</div>
        <div class="kv"><b>BMI :</b> ${fmt(p.bmi)}</div>
        <div class="kv"><b>BMR :</b> ${fmt(p.bmr)} kcal</div>
        <div class="kv"><b>TDEE :</b> ${fmt(p.tdee)} kcal</div>
      </div>
    `;
  } else if (step === 6) {
    html = `
      <h1>VALIDATION</h1>
      <p class="helper">Téléchargez ou copiez votre JSON de mesures.</p>
      <div class="result">
        <pre class="kv" id="finalJson" style="grid-column:span 2">${JSON.stringify(state,null,2)}</pre>
      </div>
    `;
  }

  $('#content').innerHTML = html;
  bindStep();
  setBar();
  updateJson();
};

/* 5) Bind des interactions par étape */
const bindStep = () => {
  if (step === 1) {
    // unités
    document.querySelectorAll("input[name='unit']").forEach(r => {
      r.addEventListener('change', e => { state.unit = e.target.value; updateJson(); });
    });
    // sliders
    const bind = (id, key, out) => {
      const el = document.getElementById(id), lab = document.getElementById(out);
      const update = () => { state[key] = +el.value; lab.textContent = el.value; updateJson(); };
      el.addEventListener('input', update); update();
    };
    bind('age','age','ageVal');
    bind('height','height_cm','hVal');
    bind('weight','weight_kg','wVal');
    bind('shoe','shoe_eu','sVal');
  } else {
    // boutons type radio (cartes)
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

/* 6) Calculs (mesures + santé) */
async function compute() {
  const h = state.height_cm;
  const w = state.weight_kg;
  const age = state.age;

  // Heuristique Tailor-like (cm)
  let neck = 0.145*h;
  let chest = 0.54*h;
  let waist = 0.46*h;
  let hip   = 0.53*h;
  let sleeve = 0.445*h + 2.0;
  let shirtLen = 0.455*h;

  // Ajustements morpho
  if (state.body_shape === 'v-torso') { chest += 4; waist -= 3; }
  if (state.body_shape === 'a-torso') { waist += 4; hip += 3; }
  if (state.shoulder === 'sloped')   { sleeve += 1.2; chest += 1; }
  if (state.posture === 'upright')   { shirtLen -= 1.0; }
  if (state.posture === 'rounded')   { shirtLen += 1.2; }
  if (state.activity === 'vigorous') { chest += 1.0; sleeve += 0.6; }
  if (age > 45) { chest += 0.8; waist += 1.0; }

  // Santé via lib (ou fallback)
  const heightForCalc = state.unit === 'in' ? state.height_cm * 2.54 : state.height_cm;
  const weightForCalc = w;

  const bmiVal = BMI(heightForCalc, weightForCalc);                          // kg/cm
  const bmrVal = BMR('male', age, heightForCalc, weightForCalc);
  const tdeeVal = TDEE('male', age, heightForCalc, weightForCalc, state.activity);

  state.prediction = {
    neck_cm: +neck.toFixed(1),
    chest_cm: +chest.toFixed(1),
    waist_cm: +waist.toFixed(1),
    hip_cm:   +hip.toFixed(1),
    sleeve_cm: +sleeve.toFixed(1),
    shirt_length_cm: +shirtLen.toFixed(1),
    bmi: +bmiVal.toFixed(2),
    bmr: Math.round(bmrVal),
    tdee: Math.round(tdeeVal)
  };
  updateJson();
}

/* 7) Actions globales */
$('#back').addEventListener('click', () => {
  if (step > 1) { step--; render(); }
});
$('#next').addEventListener('click', async () => {
  if (step === 4) { await compute(); }
  if (step < TOTAL) { step++; render(); }
});
$('#jsonBtn').addEventListener('click', () => {
  document.querySelector('aside.json').scrollIntoView({behavior:'smooth'});
});
$('#copyJson').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
  } catch { console.warn('Clipboard non disponible'); }
});
$('#dlJson').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'measurements.json'; a.click();
  URL.revokeObjectURL(url);
});

/* 8) Boot */
render();
