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
  systemManger(entities: RNGE_Entities, args: RNGE_System_Args) {
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
    this.updateBuoyantVehicles(entities, args);
    Matter.Engine.update(this._engine, time.delta);
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

      this.applyAngleByWave(submergedDepth, body, sea);
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
    // if (
    //   sea.getWaterSurfaceAndMaxHeightAtPoint(body.position.x).y -
    //     sea.getOriginalWaterSurfaceY() >
    //   0
    // )
    //   console.log(
    //     "======",
    //     sea.getWaterSurfaceAndMaxHeightAtPoint(body.position.x).y -
    //       sea.getOriginalWaterSurfaceY(),
    //     submergedDepth
    //   );
    if (
      sea.getOriginalWaterSurfaceY() -
        sea.getWaterSurfaceAndMaxHeightAtPoint(body.position.x).y >
        5 &&
      submergedDepth > -10
    ) {
      const originalWaterSurfaceY = sea.getOriginalWaterSurfaceY();
      const densityOfWater = 0.0001; // Lower density to achieve smaller forces
      const sizeFactor = Math.log(size[0] * size[1] * 0.1); // Larger size results in more buoyancy force

      // if (!body.label.startsWith(ENTITIES_KEYS.BOAT_LABEL)) {
      //   console.log("========");
      //   console.log(
      //     "🚀 ~ PhysicsSystem ~ sea.getWaterSurfaceAndMaxHeightAtPoint(body.position.x).maxWaveHeight:",
      //     sea.getOriginalWaterSurfaceY() -
      //       sea.getWaterSurfaceAndMaxHeightAtPoint(body.position.x).y,
      //     sizeFactor
      //   );
      // }

      const maxWaveHeightFactor =
        1 +
        Math.sqrt(
          sea.getWaterSurfaceAndMaxHeightAtPoint(body.position.x).y -
            sea.getOriginalWaterSurfaceY()
        );

      const buoyancyForceMagnitude = densityOfWater * 9.8 * sizeFactor;
      // console.log(
      //   "🚀 ~ PhysicsSystem ~ buoyancyForceMagnitude:",
      //   buoyancyForceMagnitude
      // );

      // // Adjust force scaling using logarithmic factor for better balance
      // const sizeScalingFactor = Math.log(size[0] * size[1] + 1) * 0.1;
      // const adjustedBuoyancyForce = buoyancyForceMagnitude / sizeScalingFactor;
      const buoyancyForce = -Math.min(buoyancyForceMagnitude, 0.5);
      // console.log("🚀 ~ PhysicsSystem ~ buoyancyForce:", buoyancyForce);
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
          (buoyancyForce / vehiclePoints.length) * (1 + waveHeightAtPoint);
        // if (!body.label.startsWith(ENTITIES_KEYS.BOAT_LABEL)) {
        //   console.log(
        //     "🚀 ~ PhysicsSystem ~ vehiclePoints.forEach ~ waveHeightAtPoint:",
        //     waveHeightAtPoint,
        //     waterSurfacePoints[index],
        //     originalWaterSurfaceY
        //   );
        //   console.log(
        //     "🚀 ~ PhysicsSystem ~ vehiclePoints.forEach ~ localBuoyancyForce:",
        //     localBuoyancyForce
        //   );
        // }
        Matter.Body.applyForce(
          body,
          {
            x: point.x,
            y: point.y + body.position.y,
          },
          {
            x: 0,
            y: localBuoyancyForce,
          }
        );
      });
    } else if (submergedDepth > 0) {
      const positionY =
        sea.getWaterSurfaceAndMaxHeightAtPoint(body.position.x).y - size[1] / 2;

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
      (submergedArea >= size[1] * size[0] &&
        buoyantVehicle.body &&
        sea.getWaterSurfaceAndMaxHeightAtPoint(buoyantVehicle.body?.position.x)
          .y >= sea.getOriginalWaterSurfaceY()) ||
      (buoyantVehicle.body &&
        buoyantVehicle.body?.position.y <
          sea.getWaterSurfaceAndMaxHeightAtPoint(
            buoyantVehicle.body?.position.x
          ).y -
            3 * size[1]) ||
      Math.abs(buoyantVehicle.body.angle) > 0.5
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
        totalSlope += sea.getWaterSlopeAtPoint(pointX);
      }

      const averageSlope = totalSlope / (numberOfPoints + 1);
      const targetAngle = Math.atan(averageSlope);
      const diffAngle = body.angle - targetAngle;

      if (Math.abs(diffAngle) > 0 && Math.abs(body.angle) > 0) {
        Matter.Body.setAngle(body, body.angle + diffAngle * 0.01);
      }
    }
  }
}
