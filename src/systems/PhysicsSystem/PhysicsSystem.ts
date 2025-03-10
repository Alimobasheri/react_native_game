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
import { Entities, Entity, uid } from '@/containers/ReactNativeSkiaGameEngine';
import { BUOYANT_VEHICLE_SINKED_EVENT } from '@/constants/events';
import {
  getDefaultLayer,
  getForceAtPoint,
  getOriginalWaterSurfaceY,
  getWaterSurfaceAndMaxHeightAtPoint,
} from '@/Game/Entities/Sea/worklets';
import { makeMutable, runOnJS, runOnUI } from 'react-native-reanimated';
import { IWaveSystemProps } from '@/Game/Entities/Wave/types';
import {
  createCleanCopy,
  createCleanCopyFromStructure,
  createSharedCopy,
  SharedValueTree,
  structs,
} from './functions';

/**
 * Along the x axis of body bounds, find the slope of water surface and applies it to the buoyant body's vehicle to show it rotating to water surface
 * @param submergedDepth How much of body is merged into water
 * @param body Matter Body of the buoyant to apply angle to
 * @param sea The sea instance to get sea height at points
 */
const applyAngleByWave = (
  submergedDepth: number,
  body: SharedValueTree<Matter.Body>,
  sea: SeaSystemProps,
  setAngle: (angle: number) => void
): void => {
  'worklet';
  if (submergedDepth > 0) {
    const bodyLength = body.value.bounds.max.x - body.value.bounds.min.x;
    const numberOfPoints = 5; // Number of points to sample along the body's length
    let totalSlope = 0;

    for (let i = 0; i <= numberOfPoints; i++) {
      const pointX =
        body.value.bounds.min.x + (i * bodyLength) / numberOfPoints;
      totalSlope += getWaterSurfaceAndMaxHeightAtPoint(sea, pointX).y;
    }

    const x2 = body.value.bounds.min.x;
    const x1 = body.value.bounds.max.x;
    const y2 = getWaterSurfaceAndMaxHeightAtPoint(sea, x2).maxWaveHeight;
    const y1 = getWaterSurfaceAndMaxHeightAtPoint(sea, x1).maxWaveHeight;
    const averageSlope = (y2 - y1) / (x2 - x1);
    const targetAngle = Math.atan(averageSlope);
    const diffAngle = targetAngle - body.value.angle;
    if (Math.abs(diffAngle) > 0.01) {
      runOnJS(setAngle)(body.value.angle + diffAngle * 0.5);
    }
  }
};

const performanceArr: number[] = [];

export class PhysicsSystem implements IPhysicsSystem {
  protected _engine: Matter.Engine;
  protected _render = 0;
  protected _curr = 0;
  bodiesMap: Map<
    number,
    { JSBody: Matter.Body; UIBody: SharedValueTree<Matter.Body> }
  > = new Map();
  _statesMap: Map<number, any> = new Map();
  buoyantUiWorklet: any;
  sinkUiWorklet: any;
  applyFrictionUiWorklet: any;
  constructor() {
    this._engine = Matter.Engine.create();
    this.buoyantUiWorklet = runOnUI(this.applyBuoyantForce);
    this.sinkUiWorklet = runOnUI(this.applySinkStatus);
    this.applyFrictionUiWorklet = runOnUI(this.applyFriction);

    Matter.Events.on(this._engine, 'afterUpdate', () => {
      const start = global.nativePerformanceNow();
      Matter.Composite.allBodies(this._engine.world).forEach((body) => {
        const shared = this.bodiesMap.get(body.id)?.UIBody;
        if (!shared) return;
        shared.value = createCleanCopyFromStructure(
          body,
          structs.get(`${body.id}`)
        );
      });
      const performance = global.nativePerformanceNow() - start;
      if (performanceArr.length === 10) {
        performanceArr.shift();
      }
      performanceArr.push(performance);
      const averagePerformance =
        performanceArr.length > 0
          ? performanceArr.reduce((a, b) => a + b, 0) / performanceArr.length
          : 0;
      // console.log(averagePerformance);
    });
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

  createBodyCopy(JSBody: Matter.Body) {
    const UIBody = createSharedCopy(JSBody);
    this.bodiesMap.set(JSBody.id, { JSBody, UIBody });
    return UIBody;
  }

  public addBodyToWorld(
    body: Matter.Body,
    sharedBodyCopy: SharedValueTree<Matter.Body>
  ): void {
    Matter.World.add(this._engine.world, body);
    this.bodiesMap.set(body.id, { JSBody: body, UIBody: sharedBodyCopy });
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

      if (!buoyantVehicle.body) return;
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

      let onSinked = () => {
        buoyantVehicle.isSinked = true;
        args.dispatcher.emitEvent(BUOYANT_VEHICLE_SINKED_EVENT(buoyantVehicle));
      };
      this.sinkUiWorklet(
        buoyantVehicle.sharedBody,
        buoyantVehicle.size,
        seaProps,
        onSinked
      );

      let matterBodySet = (key: string, value: any) => {
        if (!buoyantVehicle.body) return;
        Matter.Body.set(buoyantVehicle.body, key, value);
      };

      this.applyFrictionUiWorklet(
        buoyantVehicle.sharedBody,
        seaProps,
        buoyantVehicle.size,
        matterBodySet
      );

      let applyMatterForce = (
        position: Matter.Vector,
        force: Matter.Vector
      ) => {
        if (!buoyantVehicle.body) return;
        Matter.Body.applyForce(buoyantVehicle.body, position, force);
      };

      let setAngle = (angle: number) => {
        if (!buoyantVehicle.body) return;
        Matter.Body.setAngle(buoyantVehicle.body, angle);
      };

      this.buoyantUiWorklet(
        args,
        buoyantVehicle.sharedBody,
        buoyantVehicle.size,
        seaProps,
        applyMatterForce,
        setAngle
      );
      setTimeout(() => {
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
  protected applyBuoyantForce(
    args: RNGE_System_Args,
    body: SharedValueTree<Matter.Body>,
    size: number[],
    sea: SeaSystemProps,
    applyMatterForce: (position: Matter.Vector, force: Matter.Vector) => void,
    setAngle: (angle: number) => void
  ): void {
    'worklet';
    const waterSurfaceYAtPoint = getWaterSurfaceAndMaxHeightAtPoint(
      sea,
      body.value.position.x
    );
    const { submergedArea, submergedDepth } = getSubmergedArea(
      body,
      size,
      waterSurfaceYAtPoint
    );
    if (submergedArea > 0) {
      applyAngleByWave(submergedDepth, body, sea, setAngle);
      for (let i = 0; i <= 4; i++) {
        const x = i * (size[0] / 4) + body.value.bounds.min.x;
        if (x > body.value.bounds.max.x) break;
        const force = getForceAtPoint(sea.waves, x);
        const y = getWaterSurfaceAndMaxHeightAtPoint(sea, x).y;
        if (y > body.value.bounds.max.y) break;
        const pointWidth =
          (body.value.bounds.max.x - body.value.bounds.min.x) / 4;
        force.y = force.y * pointWidth;
        const seaForce = { force, position: { x, y } };
        runOnJS(applyMatterForce)(seaForce.position, seaForce.force);
      }

      const clampedSubmergedArea = Math.max(
        0,
        Math.min(Math.exp(submergedArea / (body.value.area * 0.25)), 1.5)
      );

      const antiGravityForce = {
        x: 0,
        y: -1 * body.value.mass * clampedSubmergedArea * 0.001,
      };
      // Matter.Body.value.applyForce(body, body.value.position, antiGravityForce);
      runOnJS(applyMatterForce)(
        { x: body.value.position.x, y: body.value.position.y },
        antiGravityForce
      );
    }
    //@ts-ignore
    body = null;
    // @ts-ignore
    sea = null;
  }

  protected applySinkStatus(
    body: SharedValueTree<Matter.Body>,
    size: number[],
    sea: SeaSystemProps,
    onSinked: () => void
  ): void {
    'worklet';
    if (!body) return;
    if (
      (body.value.bounds.min.y >= size[1] * size[0] * 1.5 &&
        body &&
        getWaterSurfaceAndMaxHeightAtPoint(sea, body.value.position.x).y >=
          getOriginalWaterSurfaceY(sea)) ||
      (body &&
        body.value.position.y <
          getWaterSurfaceAndMaxHeightAtPoint(sea, body.value.position.x).y -
            3 * size[1]) ||
      Math.abs(body.value.angle) > 5
    ) {
      // console.log('====sinked', body.label);
      runOnJS(onSinked)();
      // buoyantVehicle.isAttacking = false;
    }
    //@ts-ignore
    body = null;
  }

  protected applyFriction(
    body: SharedValueTree<Matter.Body>,
    sea: SeaSystemProps,
    size: number[],
    matterSetBody: (key: string, value: any) => void
  ): void {
    'worklet';
    if (!body) return;
    const waterSurfaceYAtPoint = getWaterSurfaceAndMaxHeightAtPoint(
      sea,
      body.value.position.x
    );
    const { submergedArea } = getSubmergedArea(
      body,
      size,
      waterSurfaceYAtPoint
    );
    if (submergedArea > 0) {
      runOnJS(matterSetBody)('frictionAir', 0.05);
    } else if (
      body.value.position.y <
      waterSurfaceYAtPoint.y - (size[1] / 2) * 8
    ) {
      runOnJS(matterSetBody)('frictionAir', 0.08);
    } else if (
      body.value.position.y <
      waterSurfaceYAtPoint.y - (size[1] / 2) * 2
    ) {
      runOnJS(matterSetBody)('frictionAir', 0.05);
    } else if (submergedArea < size[0] * size[1] * 0.2) {
      runOnJS(matterSetBody)('frictionAir', 0.05);
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
