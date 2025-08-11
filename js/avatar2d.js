
import { clamp } from './stats.js';
export function drawAvatar2D(target, meas) {
  const CtoW = (c) => (c / Math.PI) * 0.85;
  const WIDTH=360, HEIGHT=520, PAD=26;
  const chestW=CtoW(meas.chest_cm), waistW=CtoW(meas.waist_cm), hipW=CtoW(meas.hip_cm||meas.waist_cm*1.03);
  const maxW=Math.max(chestW, waistW, hipW);
  const scale=clamp((WIDTH-PAD*2)/Math.max(1,maxW), 0.6, 1.6);
  const cW=chestW*scale, wW=waistW*scale, hW=hipW*scale;
  const shoulders=(meas.shoulder_cm || (meas.chest_cm*0.43))*scale*2;
  const neck=meas.neck_cm || (meas.chest_cm*0.15);
  const neckW=CtoW(neck)*scale*0.7;
  const svg=[
    `<svg viewBox='0 0 ${WIDTH} ${HEIGHT}' width='100%' height='100%' xmlns='http://www.w3.org/2000/svg'>`,
    `<rect width='100%' height='100%' fill='none'/>`,
    `<line x1='${(WIDTH-shoulders)/2}' y1='100' x2='${(WIDTH+shoulders)/2}' y2='100' stroke='#8b95b7' stroke-width='1.6' stroke-dasharray='6 4'/>`,
    `<text x='${WIDTH/2}' y='90' fill='#cbd5ff' font-size='12' text-anchor='middle'>carrure ≈ ${Math.round(meas.shoulder_cm)} cm</text>`,
    pathTorse(WIDTH/2, 120, cW, wW, hW),
    `<ellipse cx='${WIDTH/2}' cy='100' rx='${(neckW/2).toFixed(1)}' ry='8' fill='#e5e7eb' opacity='.18' stroke='#9ca3af' stroke-width='1'/>`,
    guide(WIDTH/2-cW/2, 160, WIDTH/2+cW/2, 'poitrine', meas.chest_cm),
    guide(WIDTH/2-wW/2, 240, WIDTH/2+wW/2, 'taille', meas.waist_cm),
    guide(WIDTH/2-hW/2, 310, WIDTH/2+hW/2, 'hanches', meas.hip_cm),
    `</svg>`
  ].join('\n');
  target.innerHTML = svg;
}
function pathTorse(cx,y,cW,wW,hW){
  const xL=cx-cW/2,xR=cx+cW/2,xLW=cx-wW/2,xRW=cx+wW/2,xLH=cx-hW/2,xRH=cx+hW/2;
  return `<path d="M ${xL} ${y} C ${xL-10} ${y+30}, ${xLW-16} ${y+60}, ${xLW} ${y+90} C ${xLW} ${y+112}, ${xLH} ${y+140}, ${xLH} ${y+172} L ${xRH} ${y+172} C ${xRH} ${y+140}, ${xRW} ${y+112}, ${xRW} ${y+90} C ${xRW+16} ${y+60}, ${xR+10} ${y+30}, ${xR} ${y} Z" fill="#e5e7eb" opacity=".09" stroke="#a5b4fc" stroke-width="1.2"/>`;
}
function guide(x1,y,x2,label,cm){
  const mid=(x1+x2)/2;
  return `<line x1='${x1}' y1='${y}' x2='${x2}' y2='${y}' stroke='#94a3b8' stroke-width='1' stroke-dasharray='6 4'/>`+
         `<text x='${mid}' y='${y-6}' fill='#c7d2fe' font-size='12' text-anchor='middle'>${label} ≈ ${Math.round(cm)} cm</text>`;
}
