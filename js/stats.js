
export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function mean(xs){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:NaN;}
export function median(xs){if(!xs.length) return NaN; const s=[...xs].sort((a,b)=>a-b); const m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2;}
export function variance(xs){if(xs.length<2) return 0; const m=mean(xs); return xs.reduce((a,x)=>a+(x-m)*(x-m),0)/(xs.length-1);}
export function stdev(xs){return Math.sqrt(variance(xs));}
export function quantile(sortedXs, q){if(!sortedXs.length) return NaN; const pos=(sortedXs.length-1)*q; const base=Math.floor(pos); const rest=pos-base; return sortedXs[base]+(sortedXs[base+1]-sortedXs[base])*rest||sortedXs[base];}
export function iqr(xs){const s=[...xs].sort((a,b)=>a-b); const q1=quantile(s,0.25); const q3=quantile(s,0.75); return [q1,q3,q3-q1];}
export function histMode(xs, bins){if(!xs.length) return NaN; const mn=Math.min(...xs), mx=Math.max(...xs); const b=bins||Math.ceil(Math.sqrt(xs.length)); const w=(mx-mn)/Math.max(1,b); const hist=new Array(b).fill(0); xs.forEach(x=>{const i=Math.min(b-1,Math.max(0,Math.floor((x-mn)/(w||1)))); hist[i]+=1;}); let mi=0; for(let i=1;i<hist.length;i++) if(hist[i]>hist[mi]) mi=i; return mn+(mi+0.5)*w;}
export function mad(xs){if(!xs.length) return NaN; const m=median(xs); return median(xs.map(x=>Math.abs(x-m)));}
export function removeOutliersIQR(xs, f=1.5){ if(xs.length<4) return xs; const s=[...xs].sort((a,b)=>a-b); const [q1,q3,iq]=iqr(s); const lo=q1-f*iq, hi=q3+f*iq; return xs.filter(x=>x>=lo && x<=hi); }
export function weightedMean(values, weights){const sw=weights.reduce((a,b)=>a+b,0); if(sw===0) return NaN; let acc=0; for(let i=0;i<values.length;i++) acc+=values[i]*weights[i]; return acc/sw;}
export function weightedStdev(values, weights){const mu=weightedMean(values,weights); const sw=weights.reduce((a,b)=>a+b,0); if(sw===0) return 0; let v=0; for(let i=0;i<values.length;i++) v+=weights[i]*Math.pow(values[i]-mu,2); return Math.sqrt(v/sw);}
export function trimmedWeightedMean(values, weights, t=0.1){const pairs=values.map((v,i)=>({v,w:weights[i]})).sort((a,b)=>a.v-b.v); const n=pairs.length, k=Math.floor(n*t); const s=pairs.slice(k,n-k); return weightedMean(s.map(p=>p.v), s.map(p=>p.w));}
