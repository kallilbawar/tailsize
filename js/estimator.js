
import { clamp, mean, median, stdev, histMode, removeOutliersIQR, weightedMean, weightedStdev, trimmedWeightedMean } from './stats.js';

export const DEFAULT_FIELDS = [
  'neck_cm','chest_cm','waist_cm','hip_cm','shoulder_cm','sleeve_right_cm','sleeve_left_cm','bicep_cm','wrist_cm'
];

export const CONFIG = {
  H_TOL_START: 1.0, W_TOL_START: 3.0, A_TOL_START: 6.0,
  H_TOL_STEP: 0.5, W_TOL_STEP: 1.5, A_TOL_STEP: 4.0,
  H_TOL_MAX: 6.0, W_TOL_MAX: 12.0, A_TOL_MAX: 24.0,
  K_MIN: 30,
  S_H: 2.0, S_W: 4.0, S_A: 8.0
};

export function gaussian(x, s) { return Math.exp(-0.5 * Math.pow(x/s, 2)); }
export function distance(a, b, scale) {
  return Math.sqrt(
    Math.pow((a.height_cm - b.height_cm)/scale.S_H, 2) +
    Math.pow((a.weight_kg - b.weight_kg)/scale.S_W, 2) +
    Math.pow(((a.age ?? 0) - (b.age ?? 0))/scale.S_A, 2)
  );
}

export function knnWeighted(dataset, query, opts = {}) {
  const cfg = { ...CONFIG, ...(opts.cfg||{}) };
  const fields = opts.fields || DEFAULT_FIELDS;
  let hTol = cfg.H_TOL_START, wTol = cfg.W_TOL_START, aTol = cfg.A_TOL_START;
  const bmi = query.weight_kg / Math.pow(query.height_cm/100, 2);
  if (bmi >= 30) wTol = Math.max(wTol, 5);
  let subset = [];
  function filterOnce() {
    subset = dataset.filter(r => 
      Math.abs(r.height_cm - query.height_cm) <= hTol &&
      Math.abs(r.weight_kg - query.weight_kg) <= wTol &&
      (r.age == null || query.age == null || Math.abs(r.age - query.age) <= aTol) &&
      (query.sex ? (r.sex === query.sex) : true)
    );
  }
  filterOnce();
  while (subset.length < cfg.K_MIN && (hTol < cfg.H_TOL_MAX || wTol < cfg.W_TOL_MAX || aTol < cfg.A_TOL_MAX)) {
    hTol = Math.min(cfg.H_TOL_MAX, hTol + cfg.H_TOL_STEP);
    wTol = Math.min(cfg.W_TOL_MAX, wTol + cfg.W_TOL_STEP);
    aTol = Math.min(cfg.A_TOL_MAX, aTol + cfg.A_TOL_STEP);
    filterOnce();
  }
  if (!subset.length) subset = dataset;

  const weights = subset.map(r => gaussian(distance(r, query, cfg), 1));
  const summary = {};
  for (const field of fields) {
    const vs = subset.map(r => r[field]).filter(v => typeof v === 'number' && !Number.isNaN(v));
    const ws = subset.map((r, i) => (typeof r[field] === 'number' && !Number.isNaN(r[field])) ? weights[i] : 0);
    if (!vs.length) { summary[field] = { est: NaN, n: 0 }; continue; }
    const cleaned = removeOutliersIQR(vs);
    const cleanedWs = cleaned.map(v => ws[vs.indexOf(v)] || 0);
    const est = trimmedWeightedMean(cleaned, cleanedWs, 0.1);
    const sd  = weightedStdev(cleaned, cleanedWs);
    summary[field] = { est, sd, n: cleaned.length, median: median(cleaned), mean: mean(cleaned), mode: histMode(cleaned, Math.ceil(Math.sqrt(cleaned.length))) };
  }
  return { subsetSize: subset.length, summary, tolerances: {hTol, wTol, aTol} };
}

export function applyMorphologyAdjustments(base, morpho) {
  const out = { ...base };
  const TARGET_RATIO = { rectangle: 1.02, vshape: 1.14, apple: 0.96, pear: 1.00 };
  const r = (out.chest_cm && out.waist_cm) ? (out.chest_cm / out.waist_cm) : 1.0;
  const target = TARGET_RATIO[morpho.shape || 'rectangle'] || 1.02;
  if (out.chest_cm && out.waist_cm) {
    const maxAdj = 0.12;
    if (Math.abs(r - target) > 0.02) {
      const sum = out.chest_cm + out.waist_cm;
      let newChest = (sum * target) / (1 + target);
      let newWaist = sum - newChest;
      const chestCap = out.chest_cm * (1 + Math.sign(newChest - out.chest_cm) * maxAdj);
      const waistCap = out.waist_cm * (1 + Math.sign(newWaist - out.waist_cm) * maxAdj);
      newChest = Math.min(Math.max(newChest, Math.min(out.chest_cm, chestCap)), Math.max(out.chest_cm, chestCap));
      newWaist = Math.min(Math.max(newWaist, Math.min(out.waist_cm, waistCap)), Math.max(out.waist_cm, waistCap));
      out.chest_cm = newChest; out.waist_cm = newWaist;
    }
  }
  const SHOULDER_FACTOR = { straight: 1.02, average: 1.0, sloped: 0.97 };
  const SLEEVE_FACTOR   = { straight: 0.995, average: 1.0, sloped: 1.01 };
  if (out.shoulder_cm) out.shoulder_cm *= (SHOULDER_FACTOR[morpho.shoulders || 'average'] || 1.0);
  if (out.sleeve_right_cm) out.sleeve_right_cm *= (SLEEVE_FACTOR[morpho.shoulders || 'average'] || 1.0);
  if (out.sleeve_left_cm) out.sleeve_left_cm *= (SLEEVE_FACTOR[morpho.shoulders || 'average'] || 1.0);
  return out;
}

export function buildEstimate(dataset, input, opts={}) {
  if (!dataset || !dataset.length) throw new Error('Dataset vide');
  const { summary, subsetSize, tolerances } = knnWeighted(dataset, {
    sex: input.sex || 'M', height_cm: input.height_cm, weight_kg: input.weight_kg, age: input.age
  }, opts);
  const result = {};
  for (const f of DEFAULT_FIELDS) { const s = summary[f] || {}; result[f] = s.est; }
  if (!result.sleeve_left_cm && result.sleeve_right_cm) result.sleeve_left_cm = result.sleeve_right_cm;
  if (!result.sleeve_right_cm && result.sleeve_left_cm) result.sleeve_right_cm = result.sleeve_left_cm;
  const adjusted = applyMorphologyAdjustments({ ...result, height_cm: input.height_cm }, { shape: input.bodyShape || 'rectangle', shoulders: input.shoulderSlope || 'average' });
  const meta = { subsetSize, tolerances, bmi: input.weight_kg / Math.pow(input.height_cm/100, 2) };
  return { estimate: adjusted, meta, raw: summary };
}
