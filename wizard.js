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
  const svgHtml = fitVizSVG(p);

  $('#content').innerHTML = `
    <div id="wrapper">
      <section class="panel">
        <h1>VÉRIFICATION VISUELLE</h1>
        <p class="helper">Confirme que les proportions te semblent correctes.</p>
        ${svgHtml}
        <div style="margin-top:10px">
          <button id="confirm" class="btn">Confirmer</button>
        </div>
      </section>

      <aside class="panel aside">
        <h3 style="margin:0 0 12px">Mesures & Métriques</h3>
        <div class="metric-grid" style="margin-bottom:14px">
          <div class="chip"><b>Col</b><small>${fmt(p.neck_cm)} cm</small></div>
          <div class="chip"><b>Poitrine</b><small>${fmt(p.chest_cm)} cm</small></div>
          <div class="chip"><b>Taille</b><small>${fmt(p.waist_cm)} cm</small></div>
          <div class="chip"><b>Hanches</b><small>${fmt(p.hip_cm)} cm</small></div>
          <div class="chip"><b>Manche</b><small>${fmt(p.sleeve_cm)} cm</small></div>
          <div class="chip"><b>Longueur</b><small>${fmt(p.shirt_length_cm)} cm</small></div>
          <div class="chip"><b>BMI</b><small>${fmt(p.bmi)}</small></div>
          <div class="chip"><b>BMR</b><small>${fmt(p.bmr)} kcal</small></div>
          <div class="chip"><b>TDEE</b><small>${fmt(p.tdee)} kcal</small></div>
          <div class="chip"><b>Body Fat</b><small>${fmt(p.body_fat_pct)}%</small></div>
          <div class="chip"><b>WHtR</b><small>${fmt(p.whtr)}</small></div>
          <div class="chip"><b>FFMI</b><small>${fmt(p.ffmi)}</small></div>
        </div>

        <div class="code" id="jsonBox"></div>
        <div style="margin-top:10px">
          <button id="copyJson" class="btn ghost">Copier</button>
          <button id="dlJson" class="btn">Télécharger</button>
        </div>
      </aside>
    </div>
  `;

  // animation douce des transforms
  const addT = sel => document.querySelector(sel)?.style && (document.querySelector(sel).style.transition = 'transform .28s ease');
  addT('#band-chest'); addT('#band-waist'); addT('#band-hip');
  addT('#armL-scaler'); addT('#armR-scaler'); addT('#neck');

  applyMorph(p);
  setBar(); updateJson();

  $('#confirm')?.addEventListener('click', () => { step = 6; render(); });
  // (copy / download restent branchés ailleurs, sinon rebinde-les ici)
  return;
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
/* ---------- VISUEL SVG (haut du corps) ---------- */

// Géo fixe (repères dans le SVG)
const GEO = {
  w: 320, h: 360,
  cx: 160,
  chest: { cx:160, cy:120 },
  waist: { cx:160, cy:160 },
  hip:   { cx:160, cy:200 },
  torsoTopY: 70, torsoBottomY: 235,
  armPivotL: { x: 80,  y: 100 },
  armPivotR: { x: 240, y: 100 }
};

// Gabarit SVG avec groupes identifiables
function fitVizSVG(p) {
  const val = k => (p && p[k]!=null) ? p[k] : '-';
  return `
<svg id="fitviz" class="human" viewBox="0 0 360 380" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="torsoGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f3f7fc"/>
      <stop offset="100%" stop-color="#e8eef4"/>
    </linearGradient>
  </defs>

  <!-- tête + cou -->
  <circle cx="180" cy="38" r="18" class="sil"/>
  <rect x="168" y="56" width="24" height="12" rx="5" class="sil"/>

  <!-- torse -->
  <g id="torso">
    <path class="sil" fill="url(#torsoGrad)" d="
      M 100 72
      Q 135 50 180 50
      Q 225 50 260 72
      L 260 250
      Q 225 262 180 262
      Q 135 262 100 250 Z"/>
  </g>

  <!-- Bras pivot -->
  <g id="armL">
    <g transform="translate(110,100)">
      <g id="armL-scaler" transform="translate(-110,-100)">
        <rect x="98" y="100" width="24" height="95" rx="10" class="sil"/>
      </g>
    </g>
  </g>
  <g id="armR">
    <g transform="translate(250,100)">
      <g id="armR-scaler" transform="translate(-250,-100)">
        <rect x="238" y="100" width="24" height="95" rx="10" class="sil"/>
      </g>
    </g>
  </g>

  <!-- PILL Poitrine -->
  <g id="band-chest" transform="">
    <rect x="120" y="112" width="120" height="20" rx="10" class="pill"/>
    <text x="180" y="126" text-anchor="middle" class="lbl">Poitrine: ${val('chest_cm')} cm</text>
  </g>

  <!-- PILL Taille -->
  <g id="band-waist" transform="">
    <rect x="128" y="152" width="104" height="20" rx="10" class="pill"/>
    <text x="180" y="166" text-anchor="middle" class="lbl">Taille: ${val('waist_cm')} cm</text>
  </g>

  <!-- PILL Hanches -->
  <g id="band-hip" transform="">
    <rect x="124" y="192" width="112" height="20" rx="10" class="pill"/>
    <text x="180" y="206" text-anchor="middle" class="lbl">Hanches: ${val('hip_cm')} cm</text>
  </g>

  <!-- Règles latérales -->
  <g id="sleeve">
    <line x1="60" y1="100" x2="60" y2="195" class="tick"/>
    <text x="54" y="150" transform="rotate(-90 54 150)" class="lbl">Manche: ${val('sleeve_cm')} cm</text>
  </g>
  <g id="shirt-length">
    <line x1="300" y1="86" x2="300" y2="262" class="tick"/>
    <line x1="300" y1="136" x2="330" y2="136" class="tick"/>
    <line x1="300" y1="176" x2="330" y2="176" class="tick"/>
    <line x1="300" y1="216" x2="330" y2="216" class="tick"/>
    <text x="335" y="176" class="lbl">Long.: ${val('shirt_length_cm')} cm</text>
  </g>

  <!-- Col -->
  <g id="neck">
    <line x1="198" y1="38" x2="240" y2="38" class="tick"/>
    <text x="244" y="41" class="lbl">Col: ${val('neck_cm')} cm</text>
  </g>
</svg>`;
}


// REF pour calculer les ratios de morphing (basés sur tes heuristiques)
const REF = (() => {
  const H = 178;
  return {
    height: H,
    neck: 0.145*H,
    chest: 0.54*H,
    waist: 0.46*H,
    hip:   0.53*H,
    sleeve: 0.445*H + 2,
    shirt: 0.455*H
  };
})();

// Applique les morphings (scale autour d’un pivot)
function applyMorph(p) {
  const svg = document.getElementById('fitviz');
  if (!svg || !p) return;

  // Scales horizontaux (bandes)
  const sxChest = p.chest_cm / REF.chest;
  const sxWaist = p.waist_cm / REF.waist;
  const sxHip   = p.hip_cm   / REF.hip;

  const chestG = svg.querySelector('#band-chest');
  const waistG = svg.querySelector('#band-waist');
  const hipG   = svg.querySelector('#band-hip');

  const tx = (cx, cy, sx) => `translate(${cx},${cy}) scale(${sx},1) translate(${-cx},${-cy})`;

  if (chestG) chestG.setAttribute('transform', tx(GEO.chest.cx, GEO.chest.cy, sxChest));
  if (waistG) waistG.setAttribute('transform', tx(GEO.waist.cx, GEO.waist.cy, sxWaist));
  if (hipG)   hipG.setAttribute('transform', tx(GEO.hip.cx,   GEO.hip.cy,   sxHip));

  // Longueur de manche (scaleY des bras autour du pivot épaule)
  const sArm = p.sleeve_cm / REF.sleeve;
  const armL = svg.querySelector('#armL-scaler');
  const armR = svg.querySelector('#armR-scaler');
  const ty = (px, py, sy) => `translate(${px},${py}) scale(1,${sy}) translate(${-px},${-py})`;
  if (armL) armL.setAttribute('transform', ty(GEO.armPivotL.x, GEO.armPivotL.y, sArm));
  if (armR) armR.setAttribute('transform', ty(GEO.armPivotR.x, GEO.armPivotR.y, sArm));

  // Longueur de chemise (déplacer le bas)
  const sShirt = p.shirt_length_cm / REF.shirt;
  const newBottom = GEO.torsoTopY + (GEO.torsoBottomY - GEO.torsoTopY) * sShirt;
  const lenLine = svg.querySelector('#shirt-length line');
  const lenText = svg.querySelector('#shirt-length text');
  if (lenLine) lenLine.setAttribute('y2', newBottom);
  if (lenText) lenText.setAttribute('y', (GEO.torsoTopY + newBottom)/2);

  // Option: neck — petite variation horizontale
  const sNeck = Math.min(1.2, Math.max(0.85, p.neck_cm / REF.neck));
  const neck = svg.querySelector('#neck');
  if (neck) neck.setAttribute('transform', tx(195, 38, sNeck));
}
