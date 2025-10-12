import React from 'react';
import { useVisStore } from '../state/useVisStore';
import ChoreoXplore from './ChoreoXplore';
import Lines1D_Irina from './Lines1D_Irina';
import Surfaces2D_Ribbons from './Surfaces2D_Ribbons';
import Volumes3D_Bursts from './Volumes3D_Bursts';
import QuandCestMode from './QuandCestMode';
import PulsatingCircleMode from './PulsatingCircleMode';

export default function ChoreoXploreSystem() {
  const motion = useVisStore(s => s.motion);
  const music = useVisStore(s => s.music);
  const params = useVisStore(s => s.params);

  let mode = params.mode;
  if (mode === 'auto') {
    const sharp = motion?.sharpness ?? 0;
    const speed = motion?.speed ?? 0;
    const energy = music.energy ?? 0;
    mode = (speed > 0.001 && sharp < 0.35) ? 'surfaces' : (speed < 0.0004 && energy > 0.02) ? 'volumes' : 'lines';
  }

  switch (mode) {
    case 'lines':
      return <Lines1D_Irina />;
    case 'surfaces':
      return <Surfaces2D_Ribbons />;
    case 'volumes':
      return <Volumes3D_Bursts />;
    case 'quand_cest':
      return <QuandCestMode />;
    case 'pulsating_circle':
      return <PulsatingCircleMode />;
    default:
      return <ChoreoXplore />;
  }
}

