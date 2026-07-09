import { planCornerStackFlow } from '@/Game/path/platformShaft/shaftScheduler/cornerStackFlowPlan';
import type {
  DeriveShaftFlowContext,
  ShaftFlowPlan,
} from '@/Game/path/platformShaft/shaftScheduler/shaftFlowTypes';
import { isCornerStackFlow } from '@/Game/path/platformShaft/shaftScheduler/shaftFlowTypes';

/** Plan per-row hazard phases for the given shaft flow kind. */
export const planShaftFlow = (ctx: DeriveShaftFlowContext): ShaftFlowPlan | null => {
  'worklet';
  if (isCornerStackFlow(ctx.flowKind)) {
    return planCornerStackFlow(ctx.pathRows, {
      columns: ctx.columns,
      shaftStartRow: ctx.shaftStartRow,
      wideGapCols: ctx.wideGapCols,
      difficulty01: ctx.difficulty01,
      minResidualGapCols: ctx.minResidualGapCols,
    });
  }
  return null;
};
