import { BUOYANTS_GROUP, ENTITIES_KEYS } from '@/constants/configs';
import { RNGE_Entities, RNGE_System_Args } from '../types';
import { BuoyantVehicleProps, IPhysicsSystem } from './types';
import { Vehicle } from '@/Game/Entities/Vehicle/Vehicle';
import {
  ISea,
  SeaSystemProps,
  SurfacePointMap,
} from '@/Game/Entities/Sea/types';
import Matter from 'matter-js';
import { getVerticleBounds } from '@/utils/getVerticalBounds';
import { getSubmergedArea, getSubmergedDepthAtX } from '@/utils/submergedDepth';
import { Point2D, WaterSurfacePoint } from '@/types/globals';
import { VEHICLE_TYPE_IDENTIFIERS } from '@/constants/vehicle';
import { Sea } from '@/Game/Entities/Sea/Sea';
import { GameLoopSystem } from '../GameLoopSystem/GameLoopSystem';
import { Entities, Entity } from '@/containers/ReactNativeSkiaGameEngine';
import { BUOYANT_VEHICLE_SINKED_EVENT } from '@/constants/events';
import {
  getDefaultLayer,
  getForceAtPoint,
  getOriginalWaterSurfaceY,
  getWaterSurfaceAndMaxHeightAtPoint,
} from '@/Game/Entities/Sea/worklets';
import { runOnJS, runOnUI } from 'react-native-reanimated';
import { IWaveSystemProps } from '@/Game/Entities/Wave/types';

/**
 * Along the x axis of body bounds, find the slope of water surface and applies it to the buoyant body's vehicle to show it rotating to water surface
 * @param submergedDepth How much of body is merged into water
 * @param body Matter Body of the buoyant to apply angle to
 * @param sea The sea instance to get sea height at points
 */
const applyAngleByWave = (
  submergedDepth: number,
  body: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    positionX: number;
    positionY: number;
    area: number;
    mass: number;
    angle: number;
  },
  sea: SeaSystemProps,
  setAngle: (angle: number) => void
): void => {
  'worklet';
  if (submergedDepth > 0) {
    const bodyLength = body.maxX - body.minX;
    const numberOfPoints = 5; // Number of points to sample along the body's length
    let totalSlope = 0;

    for (let i = 0; i <= numberOfPoints; i++) {
      const pointX = body.minX + (i * bodyLength) / numberOfPoints;
      totalSlope += getWaterSurfaceAndMaxHeightAtPoint(sea, pointX).y;
    }

    const x2 = body.minX;
    const x1 = body.maxX;
    const y2 = getWaterSurfaceAndMaxHeightAtPoint(sea, x2).maxWaveHeight;
    const y1 = getWaterSurfaceAndMaxHeightAtPoint(sea, x1).maxWaveHeight;
    const averageSlope = (y2 - y1) / (x2 - x1);
    const targetAngle = Math.atan(averageSlope);
    const diffAngle = targetAngle - body.angle;
    if (Math.abs(diffAngle) > 0.01) {
      runOnJS(setAngle)(body.angle + diffAngle * 0.5);
    }
  }
};

export class PhysicsSystem implements IPhysicsSystem {
  protected _engine: Matter.Engine;
  protected _render = 0;
  protected _curr = 0;
  buoyantUiWorklet: any;
  sinkUiWorklet: any;
  constructor() {
    this._engine = Matter.Engine.create();
    this.buoyantUiWorklet = runOnUI(this.applyBuoyantForce);
    this.sinkUiWorklet = runOnUI(this.applySinkStatus);
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
      } = props;

      let seaProps: SeaSystemProps = {
        layers: sea.layers.map((layer) => ({
          layers: [],
          waves: layer.waves.map((wave) => wave.props),
          y: layer.y,
          width: layer.width,
          height: layer.height,
          layersCount: layer.layersCount,
          mainLayerIndex: layer.mainLayerIndex,
        })),
        waves: sea.layers[sea.mainLayerIndex].waves.map((wave) => wave.props),
        y: sea.y,
        width: sea.width,
        height: sea.height,
        layersCount: sea.layersCount,
        mainLayerIndex: sea.mainLayerIndex,
      };

      let bodyProps = {
        minX: body.bounds.min.x,
        maxX: body.bounds.max.x,
        minY: body.bounds.min.y,
        maxY: body.bounds.max.y,
        positionX: body.position.x,
        positionY: body.position.y,
        area: body.area,
        mass: body.mass,
        angle: body.angle,
        label: body.label,
      };

      let onSinked = () => {
        buoyantVehicle.isSinked = true;
        args.dispatcher.emitEvent(BUOYANT_VEHICLE_SINKED_EVENT(buoyantVehicle));
      };
      this.sinkUiWorklet(bodyProps, size, seaProps, onSinked);

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

      let applyMatterForce = (position: Matter.Vector, force: Matter.Vector) =>
        Matter.Body.applyForce(body, position, force);

      let setAngle = (angle: number) => Matter.Body.setAngle(body, angle);

      this.buoyantUiWorklet(
        args,
        bodyProps,
        size,
        submergedDepth,
        submergedArea,
        seaProps,
        applyMatterForce,
        setAngle
      );
      setTimeout(() => {
        //@ts-ignore
        bodyProps = null;
        //@ts-ignore
        seaProps = null;
        //@ts-ignore
        applyMatterForce = null;
        //@ts-ignore
        onSinked = null;
        //@ts-ignore
        setAngle = null;
      }, 100);
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
      submergedDepth,
      submergedArea,
    };
  }
  protected applyBuoyantForce(
    args: RNGE_System_Args,
    body: {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
      positionX: number;
      positionY: number;
      area: number;
      mass: number;
      angle: number;
      label: string;
    },
    size: number[],
    submergedDepth: number,
    submergedArea: number,
    sea: SeaSystemProps,
    applyMatterForce: (position: Matter.Vector, force: Matter.Vector) => void,
    setAngle: (angle: number) => void
  ): void {
    'worklet';
    if (submergedArea > 0) {
      applyAngleByWave(submergedDepth, body, sea, setAngle);
      for (let i = 0; i <= 4; i++) {
        const x = i * (size[0] / 4) + body.minX;
        if (x > body.maxX) break;
        const force = getForceAtPoint(sea.waves, x);
        const y = getWaterSurfaceAndMaxHeightAtPoint(sea, x).y;
        if (y > body.maxY) break;
        const pointWidth = (body.maxX - body.minX) / 4;
        force.y = force.y * pointWidth;
        const seaForce = { force, position: { x, y } };
        runOnJS(applyMatterForce)(seaForce.position, seaForce.force);
      }

      const clampedSubmergedArea = Math.max(
        0,
        Math.min(Math.exp(submergedArea / (body.area * 0.25)), 1.5)
      );

      const antiGravityForce = {
        x: 0,
        y: -1 * body.mass * clampedSubmergedArea * 0.001,
      };
      // Matter.Body.applyForce(body, body.position, antiGravityForce);
      runOnJS(applyMatterForce)(
        { x: body.positionX, y: body.positionY },
        antiGravityForce
      );
    }
    //@ts-ignore
    body = null;
    // @ts-ignore
    sea = null;
  }

  protected applySinkStatus(
    body: {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
      positionX: number;
      positionY: number;
      area: number;
      mass: number;
      angle: number;
      label: string;
    },
    size: number[],
    sea: SeaSystemProps,
    onSinked: () => void
  ): void {
    'worklet';
    if (!body) return;
    if (
      (body.minY >= size[1] * size[0] * 1.5 &&
        body &&
        getWaterSurfaceAndMaxHeightAtPoint(sea, body?.positionX).y >=
          getOriginalWaterSurfaceY(sea)) ||
      (body &&
        body?.positionY <
          getWaterSurfaceAndMaxHeightAtPoint(sea, body?.positionX).y -
            3 * size[1]) ||
      Math.abs(body.angle) > 5
    ) {
      // console.log('====sinked', body.label);
      runOnJS(onSinked)();
      // buoyantVehicle.isAttacking = false;
    }
    //@ts-ignore
    body = null;
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
