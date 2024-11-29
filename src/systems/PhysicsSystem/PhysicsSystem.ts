import { BUOYANTS_GROUP, ENTITIES_KEYS } from '@/constants/configs';
import { RNGE_Entities, RNGE_System_Args } from '../types';
import { BuoyantVehicleProps, IPhysicsSystem } from './types';
import { Vehicle } from '@/Game/Entities/Vehicle/Vehicle';
import { ISea, SurfacePointMap } from '@/Game/Entities/Sea/types';
import Matter from 'matter-js';
import { getVerticleBounds } from '@/utils/getVerticalBounds';
import { getSubmergedArea, getSubmergedDepthAtX } from '@/utils/submergedDepth';
import { Point2D, WaterSurfacePoint } from '@/types/globals';
import { VEHICLE_TYPE_IDENTIFIERS } from '@/constants/vehicle';
import { Sea } from '@/Game/Entities/Sea/Sea';
import { GameLoopSystem } from '../GameLoopSystem/GameLoopSystem';
import { Entities, Entity } from '@/containers/ReactNativeSkiaGameEngine';
import { BUOYANT_VEHICLE_SINKED_EVENT } from '@/constants/events';

export class PhysicsSystem implements IPhysicsSystem {
  protected _engine: Matter.Engine;
  protected _render = 0;
  constructor() {
    this._engine = Matter.Engine.create();
  }
  systemInstance(entities: RNGE_Entities, args: RNGE_System_Args) {
    this.update(entities, args);
    return entities;
  }
  systemInstanceRNSGE(entities: Entities, args: RNGE_System_Args) {
    this.update(entities, args);
  }
  systemManager(entities: RNGE_Entities, args: RNGE_System_Args) {
    const physicsSystem: IPhysicsSystem =
      entities[ENTITIES_KEYS.PHYSICS_SYSTEM_INSTANCE];
    return physicsSystem.systemInstance(entities, args);
  }

  public addBodyToWorld(body: Matter.Body): void {
    Matter.World.add(this._engine.world, body);
  }

  public removeBodyFromWorld(body: Matter.Body): void {
    Matter.World.remove(this._engine.world, body);
  }

  protected update(entities: Entities, args: RNGE_System_Args): void {
    const { time } = args;
    this.updateBuoyantVehicles(entities, args);
    Matter.Engine.update(this._engine);
  }

  protected updateBuoyantVehicles(
    entities: Entities,
    args: RNGE_System_Args
  ): void {
    const seaEntity: Entity<Sea> | undefined = entities.getEntityByLabel(
      ENTITIES_KEYS.SEA
    );
    if (!seaEntity) return;
    const buoyantVehicles = this.findBuoyantVehicles(entities);
    buoyantVehicles.forEach((buoyantVehicleEntity) => {
      const buoyantVehicle = buoyantVehicleEntity.data;
      const sea = seaEntity.data;
      if (buoyantVehicle.isSinked || !buoyantVehicle.isInitialized) return;
      const props = this.getBuoyantVehicleProps(buoyantVehicle, sea, args);

      if (!props) return;

      const {
        body,
        size,
        submergedArea,
        submergedDepth,
        waterSurfaceYAtPoint,
        combinedSlope,
        acceleration,
      } = props;

      this.applySinkStatus(args, buoyantVehicle, size, submergedArea, sea);

      this.applyFriction(
        body,
        size,
        submergedDepth,
        submergedArea,
        waterSurfaceYAtPoint
      );

      // const surfacePoints = this.getSurfacePoints(
      //   body,
      //   size,
      //   submergedDepth,
      //   sea
      // );

      this.applyBuoyantForce(
        args,
        body,
        size,
        submergedDepth,
        submergedArea,
        sea,
        combinedSlope
      );
    });
  }

  protected findBuoyantVehicles(entities: Entities): Entity<Vehicle>[] {
    return entities.getEntitiesByGroup(BUOYANTS_GROUP);
  }

  protected calculateVehiclePoints(
    body: Matter.Body,
    size: number[],
    pointsCount: number
  ): Matter.Vector[] {
    const points = [];
    for (let i = 0; i < pointsCount; i++) {
      const offsetX =
        (i - (pointsCount - 1) / 2) * (size[0] / (pointsCount - 1));
      const angle = body.angle;
      const x =
        (body.position.x + offsetX) * Math.cos(angle) -
        (size[1] / 2) * Math.sin(angle);
      const y =
        body.position.y * Math.sin(angle) + (size[1] / 2) * Math.cos(angle);
      points.push({ x, y });
    }
    return points;
  }

  protected getWaterSurfacePoints(
    sea: Sea,
    vehiclePoints: Matter.Vector[]
  ): { heights: number[]; submersion: boolean[] } {
    const heights: number[] = [];
    const submersion: boolean[] = [];
    vehiclePoints.forEach((point) => {
      const waterSurfaceY = sea.getWaterSurfaceAndMaxHeightAtPoint(point.x).y;
      heights.push(waterSurfaceY);
      submersion.push(point.y > waterSurfaceY);
    });
    return { heights, submersion };
  }

  protected getSurfacePoints(
    body: Matter.Body,
    size: number[],
    submergedDepth: number,
    sea: Sea
  ): WaterSurfacePoint[] {
    const pointsCount = 5; // Number of points along the hull
    const points: WaterSurfacePoint[] = [];
    for (let i = 0; i < pointsCount; i++) {
      const offsetX =
        (i - (pointsCount - 1) / 2) * (size[0] / (pointsCount - 1));
      const point: Point2D = {
        x: body.position.x + offsetX,
        y: body.position.y + submergedDepth / 2,
      };
      const waterSurfaceAtPoint = sea.getWaterSurfaceAndMaxHeightAtPoint(
        point.x
      );
      points.push(waterSurfaceAtPoint);
    }
    return points;
  }
  protected getBuoyantVehicleProps(
    buoyantVehicle: Vehicle,
    sea: Sea,
    args: RNGE_System_Args
  ): BuoyantVehicleProps | undefined {
    const { body, size } = buoyantVehicle;
    if (!body) return;
    const { bottomY: buoyantVehicleBottomY } = getVerticleBounds(body, size);

    let waterSurfaceYAtPoint = sea.getWaterSurfaceAndMaxHeightAtPoint(
      body.position.x
    );
    if (!waterSurfaceYAtPoint)
      waterSurfaceYAtPoint = sea.getWaterSurfaceAndMaxHeightAtPoint(
        body.position.x
      );
    const combinedSlope = sea.getWaterSlopeAtPoint(body.position.x);

    const { submergedDepth, submergedArea } = getSubmergedArea(
      body,
      size,
      waterSurfaceYAtPoint
    );

    return {
      body,
      size,
      buoyantVehicleBottomY,
      waterSurfaceYAtPoint,
      combinedSlope,
      submergedDepth,
      submergedArea,
      acceleration: buoyantVehicle.getAcceleration(args.time.delta),
    };
  }
  protected applyBuoyantForce(
    args: RNGE_System_Args,
    body: Matter.Body,
    size: number[],
    submergedDepth: number,
    submergedArea: number,
    sea: Sea,
    combinedSlope: number
  ): void {
    if (submergedArea > 0) {
      this.applyAngleByWave(submergedDepth, body, sea);
      for (let i = 0; i <= 30; i++) {
        const x = i * (size[0] / 30) + body.bounds.min.x;
        if (x > body.bounds.max.x) break;
        const force = sea.getForceAtPoint(x);
        const y = sea.getWaterSurfaceAndMaxHeightAtPoint(x).y;
        if (y > body.bounds.max.y) break;
        const pointWidth = (body.bounds.max.x - body.bounds.min.x) / 30;
        force.y = force.y * pointWidth;
        const seaForce = { force, position: { x, y } };
        Matter.Body.applyForce(body, seaForce.position, seaForce.force);
      }
      const xAcceleration = sea.getForceAtPoint(body.position.x).x;

      const clampedSubmergedArea = Matter.Common.clamp(
        Math.exp(submergedArea / (body.area * 0.25)),
        0,
        1.5
      );

      const antiGravityForce = Matter.Vector.create(
        0,
        -1 * body.mass * clampedSubmergedArea * 0.001
      );
      Matter.Body.applyForce(body, body.position, antiGravityForce);
    }
  }

  protected applySinkStatus(
    args: RNGE_System_Args,
    buoyantVehicle: Vehicle,
    size: number[],
    submergedArea: number,
    sea: Sea
  ): void {
    if (!buoyantVehicle.body) return;
    if (
      (buoyantVehicle.body.bounds.min.y >= size[1] * size[0] * 1.5 &&
        buoyantVehicle.body &&
        sea.getWaterSurfaceAndMaxHeightAtPoint(buoyantVehicle.body?.position.x)
          .y >= sea.getOriginalWaterSurfaceY()) ||
      (buoyantVehicle.body &&
        buoyantVehicle.body?.position.y <
          sea.getWaterSurfaceAndMaxHeightAtPoint(
            buoyantVehicle.body?.position.x
          ).y -
            3 * size[1]) ||
      Math.abs(buoyantVehicle.body.angle) > 5
    ) {
      console.log('====sinked', buoyantVehicle.body.label);
      buoyantVehicle.isSinked = true;
      args.dispatcher.emitEvent(BUOYANT_VEHICLE_SINKED_EVENT(buoyantVehicle));
      // buoyantVehicle.isAttacking = false;
    }
  }

  protected applyFriction(
    body: Matter.Body,
    size: number[],
    submergedDepth: number,
    submergedArea: number,
    waterSurfaceYAtPoint: WaterSurfacePoint
  ): void {
    if (!body) return;
    if (submergedArea > 0) {
      Matter.Body.set(body, 'frictionAir', 0.05);
    } else if (body.position.y < waterSurfaceYAtPoint.y - (size[1] / 2) * 8) {
      Matter.Body.set(body, 'frictionAir', 0.08);
    } else if (body.position.y < waterSurfaceYAtPoint.y - (size[1] / 2) * 2) {
      Matter.Body.set(body, 'frictionAir', 0.05);
    } else if (submergedArea < size[0] * size[1] * 0.2) {
      Matter.Body.set(body, 'frictionAir', 0.05);
    }
  }

  /**
   * Along the x axis of body bounds, find the slope of water surface and applies it to the buoyant body's vehicle to show it rotating to water surface
   * @param submergedDepth How much of body is merged into water
   * @param body Matter Body of the buoyant to apply angle to
   * @param sea The sea instance to get sea height at points
   */
  protected applyAngleByWave(
    submergedDepth: number,
    body: Matter.Body,
    sea: Sea
  ): void {
    if (submergedDepth > 0) {
      const bodyLength = body.bounds.max.x - body.bounds.min.x;
      const numberOfPoints = 5; // Number of points to sample along the body's length
      let totalSlope = 0;

      for (let i = 0; i <= numberOfPoints; i++) {
        const pointX = body.bounds.min.x + (i * bodyLength) / numberOfPoints;
        totalSlope += sea.getWaterSurfaceAndMaxHeightAtPoint(pointX).y;
      }

      const x2 = body.bounds.min.x;
      const x1 = body.bounds.max.x;
      const y2 = sea.getWaterSurfaceAndMaxHeightAtPoint(x2).maxWaveHeight;
      const y1 = sea.getWaterSurfaceAndMaxHeightAtPoint(x1).maxWaveHeight;
      const averageSlope = (y2 - y1) / (x2 - x1);
      const targetAngle = Math.atan(averageSlope);
      const diffAngle = targetAngle - body.angle;
      if (Math.abs(diffAngle) > 0.01) {
        Matter.Body.setAngle(body, body.angle + diffAngle * 0.5);
      }
    }
  }
}
