
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, group;

export function init3D(container) {
  const W = container.clientWidth || 600;
  const H = container.clientHeight || 520;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f1e);
  camera = new THREE.PerspectiveCamera(45, W/H, 0.1, 2000);
  camera.position.set(0, 140, 350);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(W, H);
  container.appendChild(renderer.domElement);
  const hemi = new THREE.HemisphereLight(0x8899ff, 0x223355, 0.6); scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9); dir.position.set(120, 180, 120); scene.add(dir);
  const grid = new THREE.GridHelper(800, 20, 0x2f3651, 0x1c233a); grid.position.y = -120; scene.add(grid);
  controls = new THREE.OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.target.set(0,60,0);
  window.addEventListener('resize', ()=>{ const W2=container.clientWidth||W, H2=container.clientHeight||H; camera.aspect=W2/H2; camera.updateProjectionMatrix(); renderer.setSize(W2,H2); });
  (function a(){ requestAnimationFrame(a); controls.update(); renderer.render(scene,camera); })();
}

function c2r(c, s=0.9) { return (c/(2*Math.PI))*s; }

function buildTorso({ chest_cm, waist_cm, hip_cm, shoulder_cm, height_cm }, bellyDepth=0, scale=0.9) {
  const chestR=c2r(chest_cm, scale), waistR=c2r(waist_cm, scale), hipR=c2r(hip_cm||waist_cm*1.03, scale);
  const shoulderHalf=(shoulder_cm/2)*scale;
  const yTop=0,yChest=-25,yMid=-60,yHip=-95,yBottom=-120;
  const pts=[new THREE.Vector2(shoulderHalf*0.6,yTop), new THREE.Vector2(chestR,yChest), new THREE.Vector2(waistR,yMid), new THREE.Vector2(hipR,yHip), new THREE.Vector2(hipR*0.9,yBottom)];
  const geom=new THREE.LatheGeometry(pts, 96);
  if (bellyDepth>0){
    const pos=geom.attributes.position; const v=new THREE.Vector3();
    for(let i=0;i<pos.count;i++){ v.set(pos.getX(i), pos.getY(i), pos.getZ(i)); const ang=Math.atan2(v.x,v.z);
      const front=Math.max(0,Math.cos(ang)); const waistW=1-Math.min(1,Math.abs(v.y-yMid)/45); const d=bellyDepth*front*waistW; v.z+=d; pos.setXYZ(i,v.x,v.y,v.z); }
    pos.needsUpdate=true; geom.computeVertexNormals();
  }
  const mat=new THREE.MeshStandardMaterial({ color:0xbec7ff, metalness:0.05, roughness:0.85, transparent:true, opacity:0.9 });
  const mesh=new THREE.Mesh(geom, mat); mesh.position.y=40; return mesh;
}

function buildHead(scale=0.9){ const r=c2r(56,scale); const m=new THREE.Mesh(new THREE.SphereGeometry(r*0.95,32,16), new THREE.MeshStandardMaterial({ color:0xe5e7eb, roughness:0.9, metalness:0.0, transparent:true, opacity:0.95 })); m.position.y=110; return m; }

function buildArm(length_cm, upperCirc_cm, lowerCirc_cm, shoulderHalf_cm, side=1, scale=0.9, shoulderSlope='average'){
  const topR=c2r(upperCirc_cm,scale), botR=c2r(lowerCirc_cm,scale)*0.7, len=length_cm*scale*0.85;
  const arm=new THREE.Mesh(new THREE.CylinderGeometry(botR, topR, len, 24), new THREE.MeshStandardMaterial({ color:0xcad2ff, roughness:0.85, metalness:0.05, transparent:true, opacity:0.9 }));
  arm.position.set(side*shoulderHalf_cm*scale*0.95, 55, 0); arm.rotation.z=THREE.MathUtils.degToRad(6*-side);
  const slopeMap={straight:-4, average:-10, sloped:-16}; arm.rotation.x=THREE.MathUtils.degToRad(slopeMap[shoulderSlope]||-10); return arm;
}

export function update3D(meas, opts={}){
  if(!scene) return;
  if(group){ scene.remove(group); group.traverse(o=>{ if(o.geometry) o.geometry.dispose(); if(o.material) o.material.dispose(); }); }
  group = new THREE.Group();
  const { chest_cm, waist_cm, hip_cm, shoulder_cm, sleeve_right_cm, sleeve_left_cm, bicep_cm=35, wrist_cm=17, height_cm }=meas;
  const bmi = meas.weight_kg && meas.height_cm ? (meas.weight_kg/Math.pow(meas.height_cm/100,2)) : 0;
  const ratio = (waist_cm&&chest_cm)?(waist_cm/chest_cm):1.0;
  let bellyDepth = 0; if (ratio>1.0) bellyDepth=(ratio-1.0)*48; bellyDepth += Math.max(0,(bmi-26))*0.8; bellyDepth=Math.min(bellyDepth,20);
  const torso=buildTorso({ chest_cm, waist_cm, hip_cm, shoulder_cm, height_cm }, bellyDepth);
  const head=buildHead();
  const shoulderHalf=shoulder_cm/2; const armR=bicep_cm||(0.11*chest_cm); const armLen=sleeve_right_cm||sleeve_left_cm||(0.30*height_cm);
  const right=buildArm(armLen, armR, wrist_cm||17, shoulderHalf, +1, 0.9, opts.shoulders||'average');
  const left=buildArm(armLen, armR, wrist_cm||17, shoulderHalf, -1, 0.9, opts.shoulders||'average');
  group.add(torso, head, right, left); scene.add(group);
}
