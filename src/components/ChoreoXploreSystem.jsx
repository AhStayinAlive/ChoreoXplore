import React from 'react';
import { useVisStore } from '../state/useVisStore';
import ChoreoXplore from './ChoreoXplore';
import Lines1D_Irina from './Lines1D_Irina';
import QuandCestMode from './QuandCestMode';
import PulsatingCircleMode from './PulsatingCircleMode';
import VerticalLinesMode from './VerticalLinesMode';
import WaterRippleMode from './WaterRippleMode';
import HeatWaveMode from './HeatWaveMode';
import FlowingMode from './FlowingMode';
import GentleWaveMode from './GentleWaveMode';

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
    case 'water_ripple':
      return <WaterRippleMode />;
    case 'heat_wave':
      return <HeatWaveMode />;
    case 'flowing':
      return <FlowingMode />;
    case 'gentle_wave':
      return <GentleWaveMode />;
    default:
      return <ChoreoXplore />;
  }
}

