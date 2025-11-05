import React from 'react';
import { useVisStore } from '../state/useVisStore';
import HandFluidEffect from './HandFluidEffect';
import HandSmokeEffect from './HandSmokeEffect';
import HandFluidDistortion from './HandFluidDistortion';
import HandParticleTrailEffect from './HandParticleTrailEffect';
import HandNoiseDistortion from './HandNoiseDistortion';
import HandEnergyLines from './HandEnergyLines';

export default function HandEffectRouter({ fluidTexture, fluidCanvas, smokeTexture, smokeTextureInstance }) {
  const params = useVisStore(s => s.params);
  const isActive = useVisStore(s => s.isActive);
  
  const handEffect = params.handEffect || { type: 'none', handSelection: 'none' };
  
  // Check if Opaline Wave or Opaline Film is in motion-reactive mode
  const isOpalineWaveMotionMode = params.mode === 'opaline_wave' && 
    (params.opalineWave?.motionReactive ?? true);
  const isOpalineFilmMode = params.mode === 'opaline_film' &&
    (params.opalineFilm?.handReactivity !== 'off');
  
  // Don't render hand effects if:
  // - no effect selected or visuals disabled
  // - Opaline Wave/Film is in motion-reactive mode (it uses hand tracking for the visual itself)
  if (handEffect.type === 'none' || handEffect.handSelection === 'none' || !isActive || 
      isOpalineWaveMotionMode || isOpalineFilmMode) {
    return null;
  }
  
  switch (handEffect.type) {
    case 'ripple':
      return <HandFluidEffect fluidTexture={fluidTexture} fluidCanvas={fluidCanvas} />;
    case 'smoke':
      return <HandSmokeEffect smokeTexture={smokeTexture} smokeTextureInstance={smokeTextureInstance} />;
    case 'fluidDistortion':
      return <HandFluidDistortion />;
    case 'particleTrail':
      return <HandParticleTrailEffect />;
    case 'noiseDistortion':
      return <HandNoiseDistortion />;
    case 'energyLines':
      return <HandEnergyLines />;
    default:
      return null;
  }
}
