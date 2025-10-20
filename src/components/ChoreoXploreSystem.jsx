import React from 'react';
import { useVisStore } from '../state/useVisStore';
import ChoreoXplore from './ChoreoXplore';
import Lines1D_Irina from './Lines1D_Irina';
import QuandCestMode from './QuandCestMode';
import PulsatingCircleMode from './PulsatingCircleMode';
import VerticalLinesMode from './VerticalLinesMode';

export default function ChoreoXploreSystem() {
  const motion = useVisStore(s => s.motion);
  const music = useVisStore(s => s.music);
  const params = useVisStore(s => s.params);

  const mode = params.mode;

  switch (mode) {
    case 'lines':
      return <Lines1D_Irina />;
    case 'quand_cest':
      return <QuandCestMode />;
    case 'pulsating_circle':
      return <PulsatingCircleMode />;
    case 'vertical_lines':
      return <VerticalLinesMode />;
    default:
      return <ChoreoXplore />;
  }
}

