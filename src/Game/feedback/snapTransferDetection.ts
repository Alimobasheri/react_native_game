import type { SkillFeedbackTuning } from '@/config/skillFeedback';
import {
  centerDeltaCols,
  gapsOverlap,
  type GapTopology,
} from '@/Game/feedback/gapTopology';
import type { RowCrossSnapshot, SkillPraiseEvent } from '@/Game/feedback/skillFeedbackTypes';

export type SnapTransferContext = {
  history: readonly RowCrossSnapshot[];
  current: RowCrossSnapshot;
  speedNorm: number;
  difficulty01: number;
  anchorX: number;
  anchorY: number;
  tuning: SkillFeedbackTuning;
};

const pickSnapTier = (
  tiers: SkillFeedbackTuning['families']['snap_transfer']['tiers'],
  speedNorm: number,
  difficulty01: number,
  hadPinhole: boolean
): { tierIndex: number; tier: (typeof tiers)[number] } | null => {
  'worklet';
  let best: { tierIndex: number; tier: (typeof tiers)[number] } | null = null;
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const speedMin = tier.speedMin ?? 0;
    const diffMin = tier.diffMin ?? 0;
    if (speedNorm < speedMin || difficulty01 < diffMin) continue;
    if (tier.requirePinhole && !hadPinhole) continue;
    best = { tierIndex: i, tier };
  }
  if (best) return best;
  if (tiers.length > 0) {
    return { tierIndex: 0, tier: tiers[0] };
  }
  return null;
};

const findPinholeFlareSnap = (
  history: readonly RowCrossSnapshot[],
  currentTopology: GapTopology,
  cfg: SkillFeedbackTuning['families']['snap_transfer']
): { pinhole: GapTopology; flare: GapTopology } | null => {
  'worklet';
  if (!currentTopology.gaps.length) return null;
  const entries = history.length > 0 ? history : [];
  const all = entries.concat([
    {
      topology: currentTopology,
      branchKey: '',
      crossedAtMs: 0,
      swimmerCol: 0,
      cleanCross: true,
    },
  ]);
  if (all.length < 2) return null;

  const current = all[all.length - 1].topology;
  let flare: GapTopology | null = null;
  let pinhole: GapTopology | null = null;

  for (let f = all.length - 2; f >= 0; f--) {
    const topo = all[f].topology;
    if (topo.width >= cfg.flareMinWidth) {
      flare = topo;
      break;
    }
  }
  if (!flare) return null;

  for (let p = all.length - 2; p >= 0; p--) {
    const topo = all[p].topology;
    if (topo.width <= cfg.pinholeMaxWidth) {
      if (gapsOverlap(topo.gaps, flare.gaps)) {
        pinhole = topo;
        break;
      }
    }
  }
  if (!pinhole || !flare) return null;

  const deltaCenter = Math.abs(centerDeltaCols(current, flare));
  const deltaLeft = Math.abs(current.left - flare.left);
  const snapDelta = Math.max(deltaCenter, deltaLeft);
  if (snapDelta < cfg.snapMinCenterDeltaCols) return null;

  return { pinhole, flare };
};

export const detectSnapTransfer = (
  ctx: SnapTransferContext
): SkillPraiseEvent | null => {
  'worklet';
  const cfg = ctx.tuning.families.snap_transfer;
  if (!cfg.enabled || !ctx.current.cleanCross) return null;

  const match = findPinholeFlareSnap(ctx.history, ctx.current.topology, cfg);
  if (!match) return null;

  const picked = pickSnapTier(
    cfg.tiers,
    ctx.speedNorm,
    ctx.difficulty01,
    true
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
  };
};
