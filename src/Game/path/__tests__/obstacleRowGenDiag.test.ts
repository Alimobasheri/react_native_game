import { buildObstacleRowGenerationLogKey, buildSpawnDiagSnapshot } from '@/Game/path/obstacleRowGenDiag';
import type { MacroPhase } from '@/Game/path/macroPacing';

describe('buildObstacleRowGenerationLogKey', () => {
  it('uses coarse keys for chute and cathartic release', () => {
    expect(
      buildObstacleRowGenerationLogKey('directed', 'flow', { flowChuteRowCount: 3 }, 0)
    ).toBe('directed|flow|chute');
    expect(
      buildObstacleRowGenerationLogKey('directed', 'release', { releaseRestZoneRowsEmitted: 5 }, 0)
    ).toBe('directed|release|catharticRestZone');
  });

  it('switches at tension / climax stage boundaries', () => {
    const macro: MacroPhase = 'tension';
    expect(buildObstacleRowGenerationLogKey('directed', macro, { tensionStage: 'funnel' }, 0)).toBe(
      'directed|tension|funnel'
    );
    expect(buildObstacleRowGenerationLogKey('directed', macro, { tensionStage: 'paradox' }, 0)).toBe(
      'directed|tension|paradoxSplit'
    );
    expect(buildObstacleRowGenerationLogKey('directed', 'climax', { climaxStage: 'pinball' }, 0)).toBe(
      'directed|climax|pinball'
    );
  });

  it('buildSpawnDiagSnapshot matches branch key for template + ctx', () => {
    const snap = buildSpawnDiagSnapshot('directed', 'flow', { flowMode: 'chicane' }, 3);
    expect(snap.spawnDiagTemplateName).toBe('directed');
    expect(snap.spawnDiagBranchKey).toBe(
      buildObstacleRowGenerationLogKey('directed', 'flow', { flowMode: 'chicane' }, 3)
    );
  });
});
