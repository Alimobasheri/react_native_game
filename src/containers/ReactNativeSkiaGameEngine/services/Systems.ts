import EventEmitter from 'react-native/Libraries/vendor/emitter/EventEmitter';
import { Entities } from './Entities';
import { RNGE_System_Args } from '@/systems/types';
import { uid } from './Entity';

export type system = (entities: Entities, args: RNGE_System_Args) => void;

export type AddSystemOptions = {
  sceneId?: string;
};

/**
 * The `Systems` class is responsible for managing and executing an array of systems (user-defined functions)
 * that are run in every frame to update entities within the game engine.
 *
 * This class allows for registering new systems and running them sequentially in each update cycle.
 *
 * @extends EventEmitter
 */
export class Systems extends EventEmitter {
  /**
   * A map of scene IDs to arrays of systems.
   *
   * @type {Map<string, system[]>}
   * @protected
   */
  protected mapSceneIdToSystems: Map<string, system[]> = new Map();

  /**
   * A map of system IDs to systems.
   *
   * @type {Map<string, system>}
   * @protected
   */
  protected _systemsMap: Map<string, system> = new Map();

  /**
   * Creates an instance of the `Systems` class.
   */
  constructor() {
    super();
  }

  /**
   * Registers a new system to be executed in each frame update.
   *
   * @param {system} system - The user-defined function that will be added to the list of systems.
   * @param {AddSystemOptions} [options] - Additional options to configure the system.
   * @return {string} The unique identifier of the added system.
   */
  public addSystem(system: system, options: AddSystemOptions = {}): string {
    const systemId = uid();
    this._systemsMap.set(systemId, system);

    if (options.sceneId) {
      if (!this.mapSceneIdToSystems.has(options.sceneId)) {
        this.mapSceneIdToSystems.set(options.sceneId, []);
      }
      this.mapSceneIdToSystems.get(options.sceneId)!.push(system);
    }

    return systemId;
  }

  /**
   * Removes a system or systems based on the provided identifier.
   *
   * @param {string | { sceneId: string }} identifier - The system ID or an object containing the scene ID.
   */
  public removeSystem(identifier: string | { sceneId: string }) {
    if (typeof identifier === 'string') {
      // Remove by system ID
      const system = this._systemsMap.get(identifier);
      if (system) {
        this._systemsMap.delete(identifier);

        // Remove from mapSceneIdToSystems as well
        for (const [sceneId, systems] of this.mapSceneIdToSystems.entries()) {
          const index = systems.indexOf(system);
          if (index !== -1) {
            systems.splice(index, 1);
            if (systems.length === 0) {
              this.mapSceneIdToSystems.delete(sceneId);
            }
            break;
          }
        }
      }
    } else if (identifier.sceneId) {
      // Remove all systems associated with the scene ID
      const systems = this.mapSceneIdToSystems.get(identifier.sceneId);
      if (systems) {
        for (const system of systems) {
          for (const [systemId, mappedSystem] of this._systemsMap.entries()) {
            if (mappedSystem === system) {
              this._systemsMap.delete(systemId);
              break;
            }
          }
        }
        this.mapSceneIdToSystems.delete(identifier.sceneId);
      }
    }
  }

  /**
   * Executes all registered systems sequentially.
   * This method is called in every frame to update the entities.
   *
   * @param {Entities} entities - The collection of entities that the systems will update.
   * @param {RNGE_System_Args} args - Additional arguments that are passed to each system during execution.
   */
  public update(entities: Entities, args: RNGE_System_Args) {
    for (const system of this._systemsMap.values()) {
      system(entities, args);
    }
  }
}
