import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import {
  RenderComponentData,
  RenderComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  ObstacleRowComponentData,
  ObstacleRowComponentName,
} from '@/Game/ecs-components/ObstacleRowComponent';
import {
  HazardBandLeadComponentData,
  HazardBandLeadComponentName,
} from '@/Game/ecs-components/HazardBandLead';
import { HazardBandMemberComponentName } from '@/Game/ecs-components/HazardBandMember';
import { restoreOrangeOnlyHazardRowRender } from '@/Game/render/appendHazardSteelToRowRender';
import {
  RemoveEntityBatchRequest,
  RemoveEntityBatchRequestType,
} from '@/containers/ReactNativeSkiaGameEngine/internal/events/entity';

export const purgePlatformShaftHazardsAndEffectiveGaps = (args: {
  ecs: ECS;
  components: Record<string, ComponentStore<unknown>>;
  sceneKey: string;
  eventQueue: { addEvent: (event: RemoveEntityBatchRequest) => void };
}): void => {
  'worklet';
  const { ecs, components } = args;

  const leadStore = components[HazardBandLeadComponentName];
  const renderStore = components[RenderComponentName];
  const rowStoreForPurge = components[ObstacleRowComponentName] as
    | ComponentStore<ObstacleRowComponentData>
    | undefined;
  if (leadStore) {
    leadStore.forEach((leadEnt: Entity) => {
      const lead = leadStore.get(leadEnt) as HazardBandLeadComponentData | undefined;
      if (lead) {
        if (renderStore && rowStoreForPurge) {
          const renderData = renderStore.get(leadEnt) as RenderComponentData | undefined;
          const leadRow = rowStoreForPurge.get(leadEnt);
          if (renderData && leadRow) {
            const restored = restoreOrangeOnlyHazardRowRender({
              existingLayers: renderData.renderLayers ?? [],
              rowY: leadRow.y,
            });
            ecs.updateComponent<RenderComponentData>(leadEnt, RenderComponentName, (render) => {
              render.renderLayers = restored.renderLayers;
              render.position = { ...render.position, y: restored.positionY };
              render.isDirty = true;
            });
          }
        }
        for (let i = 0; i < lead.memberRowEntityIds.length; i++) {
          const memberEnt = lead.memberRowEntityIds[i];
          if (components[HazardBandMemberComponentName]?.get(memberEnt)) {
            ecs.removeComponent(memberEnt, HazardBandMemberComponentName);
          }
        }
      }
      ecs.removeComponent(leadEnt, HazardBandLeadComponentName);
    });
  }

  const rowStore = components[ObstacleRowComponentName] as
    | ComponentStore<ObstacleRowComponentData>
    | undefined;
  if (rowStore) {
    rowStore.forEach((rowEntity: Entity, rowData: ObstacleRowComponentData) => {
      if (
        !rowData.effectiveGaps &&
        !rowData.effectiveSolidColumnCentersX &&
        !rowData.effectivePressSlabAabb
      ) {
        return;
      }
      ecs.updateComponent<ObstacleRowComponentData>(
        rowEntity,
        ObstacleRowComponentName,
        (row) => {
          row.effectiveGaps = undefined;
          row.effectiveSolidColumnCentersX = undefined;
          row.effectivePressSlabAabb = undefined;
        }
      );
    });
  }
};
