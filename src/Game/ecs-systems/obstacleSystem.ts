import { ECS } from "@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs"
import { Entity } from "@/containers/ReactNativeSkiaGameEngine/services-ecs/entity"
import { ObstacleRowComponentData } from "../ecs-components/ObstacleRowComponent"
import { ObstacleComponentData } from "../ecs-components/ObstacleComponent"

export interface GetRowArgs {
  rowIndex: number,
  ecs: ECS,
  sceneEntity: Entity,
  prevRow: ObstacleRowComponentData | null,
  prevRowEntity: Entity | null,
  initialY: number,
  rowLength: number,
  leftX: number,
  obstacleDimension: {
    width: number,
    height: number
  }
}

export type TemplateCtx = Record<string, unknown>;

export interface TemplateInitArgs {
  ecs: ECS;
  sceneEntity: Entity;
  rowLength: number;
  leftX: number;
  obstacleDimension: {
    width: number;
    height: number;
  };
  initialY: number;
}

export interface RowPathTemplate {
  createCtx?: () => TemplateCtx;
  init?: (ctx: TemplateCtx, args: TemplateInitArgs) => void;
  getRowCount: (ctx: TemplateCtx) => number,
  getRow: (ctx: TemplateCtx, args: GetRowArgs) => Entity,
}