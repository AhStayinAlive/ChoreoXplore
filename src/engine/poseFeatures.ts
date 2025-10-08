export type Joint = { x:number; y:number; z?:number; visibility?:number };
export type Pose = { landmarks: Joint[]; timestamp:number };

const v = (a:Joint,b:Joint)=>({x:b.x-a.x,y:b.y-a.y});
const dot=(a:any,b:any)=>a.x*b.x+a.y*b.y;
const mag=(a:any)=>Math.hypot(a.x,a.y);
const angle=(a:Joint,b:Joint,c:Joint)=>{
  const ab=v(b,a), cb=v(b,c);
  const d=dot(ab,cb)/(mag(ab)*mag(cb)+1e-6);
  return Math.acos(Math.max(-1,Math.min(1,d)));
};

export function computeMotionFeatures(p: Pose){
  const S=(i:number)=>p.landmarks[i];
  const L={ shoulder:S(11), elbow:S(13), wrist:S(15), hip:S(23), knee:S(25), ankle:S(27) };
  const R={ shoulder:S(12), elbow:S(14), wrist:S(16), hip:S(24), knee:S(26), ankle:S(28) };
  const elbowL=angle(L.shoulder,L.elbow,L.wrist);
  const elbowR=angle(R.shoulder,R.elbow,R.wrist);
  const kneeL=angle(L.hip,L.knee,L.ankle);
  const kneeR=angle(R.hip,R.knee,R.ankle);

  const shoulderSpan=Math.hypot(R.shoulder.x-L.shoulder.x,R.shoulder.y-L.shoulder.y);
  const bodyHeight=Math.hypot(((L.hip.x+R.hip.x)/2-(L.shoulder.x+R.shoulder.x)/2),
                              ((L.hip.y+R.hip.y)/2-(L.shoulder.y+R.shoulder.y)/2))+1e-6;
  const wristSpan=Math.hypot(R.wrist.x-L.wrist.x,R.wrist.y-L.wrist.y);
  const armSpan=(wristSpan+shoulderSpan)/(2*bodyHeight);

  let speed=0;
  // caller can compute temporal speed elsewhere; zero is OK
  const joints=[elbowL,elbowR,kneeL,kneeR];
  const sharpness=joints.map(a=>1-Math.min(1,Math.abs(Math.PI-a)/Math.PI))
                        .reduce((s,v)=>s+v,0)/joints.length;

  return { elbowL, elbowR, kneeL, kneeR, armSpan, speed, sharpness };
}

