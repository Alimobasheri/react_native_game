import EventEmitter from 'react-native/Libraries/vendor/emitter/EventEmitter';
import { Entities } from './Entities';
import { RNGE_System_Args } from '@/systems/types';

export type system = (entities: Entities, args: RNGE_System_Args) => void;

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
   * An array of systems (user-defined functions) that will be executed in every frame.
   *
   * @type {system[]}
   * @protected
   */
  protected _systems: system[] = [];

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
   */
  public addSystem(system: system) {
    this._systems.push(system);
  }

  /**
   * Executes all registered systems sequentially.
   * This method is called in every frame to update the entities.
   *
   * @param {Entities} entities - The collection of entities that the systems will update.
   * @param {RNGE_System_Args} args - Additional arguments that are passed to each system during execution.
   */
  public update(entities: Entities, args: RNGE_System_Args) {
    for (const system of this._systems) {
      system(entities, args);
    }
  }
}
