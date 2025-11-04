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
import EmptyMode from './EmptyMode';
import SilkVeilMode from '../modes/SilkVeil/SilkVeilMode';
import LotusBloomMode from '../modes/LotusBloom/LotusBloomMode';
import PaperLanternsMode from '../modes/PaperLanterns/PaperLanternsMode';
import StainedGlassRoseMode from '../modes/StainedGlassRose/StainedGlassRoseMode';
import InkWaterMode from '../modes/InkWater/InkWaterMode';

export default function ChoreoXploreSystem() {
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
    case 'silk_veil':
      return <SilkVeilMode />;
    case 'lotus_bloom':
      return <LotusBloomMode />;
    case 'paper_lanterns':
      return <PaperLanternsMode />;
    case 'stained_glass_rose':
      return <StainedGlassRoseMode />;
    case 'ink_water':
      return <InkWaterMode />;
    case 'empty':
      return <EmptyMode />;
    default:
      return <ChoreoXplore />;
  }
}

