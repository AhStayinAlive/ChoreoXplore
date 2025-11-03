import React from 'react';
import { useVisStore } from '../state/useVisStore';
import HandFluidEffect from './HandFluidEffect';
import HandSmokeEffect from './HandSmokeEffect';
import HandFluidDistortion from './HandFluidDistortion';

export default function HandEffectRouter({ smokeTexture, smokeTextureInstance }) {
  const params = useVisStore(s => s.params);
  const isActive = useVisStore(s => s.isActive);
  
  const handEffect = params.handEffect || { type: 'none', handSelection: 'none' };
  
  // Don't render if no effect selected or visuals disabled
  if (handEffect.type === 'none' || handEffect.handSelection === 'none' || !isActive) {
    return null;
  }
  
  switch (handEffect.type) {
    case 'ripple':
      return <HandFluidEffect />;
    case 'smoke':
      return <HandSmokeEffect smokeTexture={smokeTexture} smokeTextureInstance={smokeTextureInstance} />;
    case 'fluidDistortion':
      return <HandFluidDistortion />;
    default:
      return null;
  }
}
