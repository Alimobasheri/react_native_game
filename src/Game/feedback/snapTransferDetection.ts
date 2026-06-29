import type { SkillFeedbackTuning } from '@/config/skillFeedback';
import {
  centerDeltaCols,
  gapsOverlap,
  type GapTopology,
} from '@/Game/feedback/gapTopology';
import { swimmerColDeltaAbs, swimmerSteerSpanCols } from '@/Game/feedback/gapPathAnalysis';
import { computeHygiene01 } from '@/Game/feedback/hygieneScoring';
import type {
  RowCrossSnapshot,
  SkillPraiseEvent,
  StitchSampler,
} from '@/Game/feedback/skillFeedbackTypes';

export type SnapTransferContext = {
  history: readonly RowCrossSnapshot[];
  current: RowCrossSnapshot;
  speedNorm: number;
  difficulty01: number;
  anchorX: number;
  anchorY: number;
  tuning: SkillFeedbackTuning;
  stitchSampler: StitchSampler;
};

const pickSnapTierWithHygiene = (
  tiers: SkillFeedbackTuning['families']['snap_transfer']['tiers'],
  speedNorm: number,
  difficulty01: number,
  hadPinhole: boolean,
  hygiene01: number,
  tierUpgradeMin: number
): { tierIndex: number; tier: (typeof tiers)[number] } | null => {
  'worklet';
  if (tiers.length === 0) return null;

  let best: { tierIndex: number; tier: (typeof tiers)[number] } = {
    tierIndex: 0,
    tier: tiers[0],
  };

  for (let i = 1; i < tiers.length; i++) {
    const tier = tiers[i];
    const speedMin = tier.speedMin ?? 0;
    const diffMin = tier.diffMin ?? 0;
    if (speedNorm < speedMin || difficulty01 < diffMin) continue;
    if (tier.requirePinhole && !hadPinhole) continue;
    if (hygiene01 < tierUpgradeMin) continue;
    best = { tierIndex: i, tier };
  }

  return best;
};

const findPinholeFlareSnap = (
  history: readonly RowCrossSnapshot[],
  current: RowCrossSnapshot,
  cfg: SkillFeedbackTuning['families']['snap_transfer'],
  sampler: StitchSampler
): { pinhole: GapTopology; flare: GapTopology; pinholeRow: RowCrossSnapshot } | null => {
  'worklet';
  const currentTopology = current.topology;
  if (!currentTopology.gaps.length) return null;
  const all = history.concat([current]);
  if (all.length < 2) return null;

  const currentTopo = all[all.length - 1].topology;
  let flare: GapTopology | null = null;
  let flareRow: RowCrossSnapshot | null = null;
  let pinhole: GapTopology | null = null;
  let pinholeRow: RowCrossSnapshot | null = null;

  for (let f = all.length - 2; f >= 0; f--) {
    const topo = all[f].topology;
    if (topo.width >= cfg.flareMinWidth) {
      flare = topo;
      flareRow = all[f];
      break;
    }
  }
  if (!flare || !flareRow) return null;

  for (let p = all.length - 2; p >= 0; p--) {
    const topo = all[p].topology;
    if (topo.width <= cfg.pinholeMaxWidth) {
      if (gapsOverlap(topo.gaps, flare.gaps)) {
        pinhole = topo;
        pinholeRow = all[p];
        break;
      }
    }
  }
  if (!pinhole || !pinholeRow) return null;

  const deltaCenter = Math.abs(centerDeltaCols(currentTopo, flare));
  const deltaLeft = Math.abs(currentTopo.left - flare.left);
  const topologySnapDelta = Math.max(deltaCenter, deltaLeft);
  const swimmerSnapDelta = Math.max(
    swimmerColDeltaAbs(current, pinholeRow),
    swimmerSteerSpanCols(sampler)
  );
  if (
    topologySnapDelta < cfg.snapMinCenterDeltaCols ||
    swimmerSnapDelta < cfg.snapMinCenterDeltaCols
  ) {
    return null;
  }

  return { pinhole, flare, pinholeRow };
};

export const detectSnapTransfer = (
  ctx: SnapTransferContext
): SkillPraiseEvent | null => {
  'worklet';
  const cfg = ctx.tuning.families.snap_transfer;
  if (!cfg.enabled) return null;
  if (ctx.current.contact.pinned || !ctx.current.crossQualified) return null;

  const match = findPinholeFlareSnap(
    ctx.history,
    ctx.current,
    cfg,
    ctx.stitchSampler
  );
  if (!match) return null;

  const lookback = cfg.lookbackUniqueRows + 1;
  const hygiene01 = computeHygiene01(
    ctx.history.concat([ctx.current]),
    lookback,
    ctx.stitchSampler,
    ctx.tuning
  );
  const tierUpgradeMin = ctx.tuning.hygiene.tierUpgradeMin;

  const picked = pickSnapTierWithHygiene(
    cfg.tiers,
    ctx.speedNorm,
    ctx.difficulty01,
    true,
    hygiene01,
    tierUpgradeMin
  );
  if (!picked) return null;

  return {
    familyId: 'snap_transfer',
    momentId: 'pinhole_flare_snap',
    copy: picked.tier.copy,
    tierIndex: picked.tierIndex,
    bonusMin: picked.tier.bonusMin,
    bonusMax: picked.tier.bonusMax,
    priority: cfg.priority,
    anchorX: ctx.anchorX,
    anchorY: ctx.anchorY,
    hygiene01,
  };
};
