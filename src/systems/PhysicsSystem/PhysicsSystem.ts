import { ENTITIES_KEYS } from "@/constants/configs";
import { RNGE_Entities, RNGE_System_Args } from "../types";
import { BuoyantVehicleProps, IPhysicsSystem } from "./types";
import { Vehicle } from "@/Game/Entities/Vehicle/Vehicle";
import { ISea, SurfacePointMap } from "@/Game/Entities/Sea/types";
import Matter from "matter-js";
import { getVerticleBounds } from "@/utils/getVerticalBounds";
import { getSubmergedArea } from "@/utils/submergedDepth";
import { Point2D, WaterSurfacePoint } from "@/types/globals";
import { VEHICLE_TYPE_IDENTIFIERS } from "@/constants/vehicle";
import { Sea } from "@/Game/Entities/Sea/Sea";
import { GameLoopSystem } from "../GameLoopSystem/GameLoopSystem";

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

  protected update(entities: RNGE_Entities, args: RNGE_System_Args): void {
    const { time } = args;
    Matter.Engine.update(this._engine, time.delta);
    this.updateBuoyantVehicles(entities, args);
  }

  protected updateBuoyantVehicles(
    entities: RNGE_Entities,
    args: RNGE_System_Args
  ): void {
    const sea: Sea = entities[ENTITIES_KEYS.SEA_GROUP].entities["sea"];
    const buoyantVehicles = this.findBuoyantVehicles(entities);
    buoyantVehicles.forEach((buoyantVehicle) => {
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

      this.applySinkStatus(buoyantVehicle, size, submergedArea, sea);

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
        body,
        size,
        submergedDepth,
        submergedArea,
        sea,
        combinedSlope
      );
    });
  }

  protected findBuoyantVehicles(entities: RNGE_Entities): Vehicle[] {
    return Object.keys(entities[ENTITIES_KEYS.SEA_GROUP].entities)
      .map((key) => entities[ENTITIES_KEYS.SEA_GROUP].entities[key])
      .filter((entity) => entity.isBuoyant);
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
    sea: ISea,
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

    const { waterSurfacePoints } = sea;

    let waterSurfaceYAtPoint = waterSurfacePoints.get(body.position.x);
    if (!waterSurfaceYAtPoint)
      waterSurfaceYAtPoint = sea.getWaterSurfaceAndMaxHeightAtPoint(
        body.position.x
      );
    const combinedSlope = sea.getWaterSlopeAtPoint(body.position.x);

    const { submergedDepth, submergedArea } = getSubmergedArea(
      buoyantVehicleBottomY,
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
    body: Matter.Body,
    size: number[],
    submergedDepth: number,
    submergedArea: number,
    sea: Sea,
    combinedSlope: number
  ): void {
    if (
      sea.getOriginalWaterSurfaceY() -
        sea.getWaterSurfaceAndMaxHeightAtPoint(body.position.x).y >
        40 &&
      submergedDepth > -10
    ) {
      Matter.Body.setVelocity(body, {
        x: body.velocity.x,
        y: body.velocity.y > 0 ? 0 : body.velocity.y,
      });
      const originalWaterSurfaceY = sea.getOriginalWaterSurfaceY();
      const densityOfWater = 0.02; // Lower density to achieve smaller forces
      const sizeFactor = 1 / Math.sqrt(size[0] * size[1]); // Larger size results in less buoyancy force

      const buoyancyForceMagnitude = densityOfWater * 9.8 * sizeFactor;

      const buoyancyForce = -Math.max(buoyancyForceMagnitude, 0.001);
      // Calculate points on the vehicle body
      const pointsCount = 5; // Number of points along the hull
      const vehiclePoints = this.calculateVehiclePoints(
        body,
        size,
        pointsCount
      );

      // Get corresponding water surface points and submersion status
      const { heights: waterSurfacePoints, submersion } =
        this.getWaterSurfacePoints(sea, vehiclePoints);
      // Apply forces at each submerged point
      vehiclePoints.forEach((point, index) => {
        const heightDiff = originalWaterSurfaceY - waterSurfacePoints[index];
        const waveHeightAtPoint = Math.sqrt(heightDiff > 0 ? heightDiff : 0);

        const localBuoyancyForce =
          (buoyancyForce / vehiclePoints.length) *
          (1 + Math.sqrt(waveHeightAtPoint));
        const localBuoyancyForceX =
          (index < pointsCount / 2 ? 1 : -1) *
          localBuoyancyForce *
          (0.1 + 0.1 * Math.sqrt(waveHeightAtPoint));
        Matter.Body.applyForce(
          body,
          {
            x: point.x,
            y: point.y + body.position.y,
          },
          {
            x: localBuoyancyForceX,
            y: localBuoyancyForce,
          }
        );
      });
    } else if (submergedDepth > 0) {
      const positionY =
        sea.layers[sea.mainLayerIndex].getWaterSurfaceAndMaxHeightAtPoint(
          body.position.x
        ).y -
        size[1] / 3;

      const position = {
        x: body.position.x,
        y: positionY,
      };
      Matter.Body.setPosition(body, position);
      this.applyAngleByWave(submergedDepth, body, sea);
    }
  }

  protected applySinkStatus(
    buoyantVehicle: Vehicle,
    size: number[],
    submergedArea: number,
    sea: Sea
  ): void {
    if (!buoyantVehicle.body) return;
    if (
      (submergedArea >= size[1] * size[0] * 1.5 &&
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
      buoyantVehicle.isSinked = true;
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
    if (submergedDepth > 0) {
      Matter.Body.set(body, "frictionAir", 0.05);
    } else if (body.position.y < waterSurfaceYAtPoint.y - (size[1] / 2) * 8) {
      Matter.Body.set(body, "frictionAir", 0.08);
    } else if (body.position.y < waterSurfaceYAtPoint.y - (size[1] / 2) * 2) {
      Matter.Body.set(body, "frictionAir", 0.05);
    } else if (submergedArea < size[0] * size[1] * 0.2) {
      Matter.Body.set(body, "frictionAir", 0.05);
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
        Matter.Body.setAngle(body, body.angle + diffAngle * 1);
      }
    }
  }
}
