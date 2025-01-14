import { runOnUI, SharedValue } from 'react-native-reanimated';
import { v4 as uuidv4 } from 'uuid';
import { uid } from './Entity';

export interface AnimationConfig {
  duration?: number;
  delay?: number;
  easing?: (t: number) => number;
  loop?: number;
  loopInterval?: number; // New property for interval between loops
  yoyo?: boolean;
  retainFinalValue?: boolean;
  label?: string;
  groups?: string[];
  removeOnComplete?: boolean;
  throttle?: number;
  onDone?: () => void;
}

export interface Animation {
  update: (
    currentTime: number,
    sharedValue: SharedValue<any>,
    progress: number,
    isBackward: boolean,
    onAnimate: (done: boolean) => void
  ) => void;
}

export interface AnimationFilter {
  id?: string;
  label?: string;
  group?: string;
}

export interface ActiveAnimation {
  id: string;
  sharedValue: SharedValue<any>;
  originalValue: any;
  animation: Animation;
  startTime: SharedValue<number | null>;
  accumulatedTime: SharedValue<number>;
  isRunning: SharedValue<boolean>;
  config: AnimationConfig;
  direction: SharedValue<1 | -1>;
  loopCount: SharedValue<number>;
  lastUpdateTime: SharedValue<number>;
  waitingForNextLoop: SharedValue<boolean>; // New property to track if waiting for the next loop
  loopStartTime: SharedValue<number>; // New property to track the start time of the next loop
}

export type RegisterAnimationArg = Omit<ActiveAnimation, 'id'>;

class Animations {
  private allAnimations: Map<string, ActiveAnimation> = new Map();
  private activeAnimations: Map<string, ActiveAnimation> = new Map(); // Store animations by ID
  private mapLabelToAnimationId: Map<string, string> = new Map(); // Store label -> animation ID
  private mapGroupToAnimations: Map<string, ActiveAnimation[]> = new Map(); // Store group -> animations

  // Registers a new animation with optional label and groups
  registerAnimation(animation: RegisterAnimationArg) {
    const id = uid(); // Generate a unique ID for the animation
    const now = global.nativePerformanceNow();

    const newAnimation: ActiveAnimation = {
      id,
      ...animation,
    };

    this.allAnimations.set(id, newAnimation);
    if (newAnimation.isRunning) {
      this.activeAnimations.set(id, newAnimation);
    }

    // If the animation has a label, associate it with the animation ID
    if (newAnimation.config.label) {
      this.mapLabelToAnimationId.set(newAnimation.config.label, id);
    }

    // If the animation belongs to groups, associate it with those groups
    if (newAnimation.config.groups) {
      newAnimation.config.groups.forEach((group) => {
        if (!this.mapGroupToAnimations.has(group)) {
          this.mapGroupToAnimations.set(group, []);
        }
        this.mapGroupToAnimations.get(group)?.push(newAnimation);
      });
    }

    return newAnimation;
  }

  private findAnimations(
    filter: AnimationFilter
  ): ActiveAnimation | ActiveAnimation[] | undefined {
    const { id, label, group } = filter;

    if (id) {
      return this.getAnimationById(id); // Return a single animation by ID
    } else if (label) {
      return this.getAnimationByLabel(label); // Return a single animation by label
    } else if (group) {
      return this.getAnimationsByGroup(group); // Return an array of animations by group
    }

    return undefined;
  }

  // Helper method to remove an animation from all maps (activeAnimations, labels, groups)
  public removeAnimationFromMaps(animationObj: ActiveAnimation) {
    // Remove from activeAnimations
    this.activeAnimations.delete(animationObj.id);
    this.allAnimations.delete(animationObj.id);

    // Remove from label map
    if (animationObj.config.label) {
      this.mapLabelToAnimationId.delete(animationObj.config.label);
    }

    // Remove from group map
    if (animationObj.config.groups) {
      animationObj.config.groups.forEach((group) => {
        const groupAnimations = this.mapGroupToAnimations.get(group);
        if (groupAnimations) {
          const index = groupAnimations.indexOf(animationObj);
          if (index !== -1) {
            groupAnimations.splice(index, 1);
            if (groupAnimations.length === 0) {
              this.mapGroupToAnimations.delete(group);
            }
          }
        }
      });
    }
  }

  // Pauses an animation or animations based on id, label, or group
  pauseAnimation(filter: AnimationFilter) {
    const now = global.nativePerformanceNow();
    const animations = this.findAnimations(filter);

    if (Array.isArray(animations)) {
      animations.forEach((animationObj) => {
        if (animationObj.isRunning.value) {
          animationObj.isRunning.value = false;
          animationObj.accumulatedTime.value +=
            now - (animationObj.startTime.value || now); // Accumulate elapsed time
          this.activeAnimations.delete(animationObj.id);
        }
      });
    } else if (animations && animations.isRunning.value) {
      animations.isRunning.value = false;
      animations.accumulatedTime.value +=
        now - (animations.startTime.value || now);
      this.activeAnimations.delete(animations.id);
    }
  }

  // Resumes an animation or animations based on id, label, or group
  resumeAnimation(filter: AnimationFilter) {
    const now = global.nativePerformanceNow();
    const animations = this.findAnimations(filter);

    if (Array.isArray(animations)) {
      animations.forEach((animationObj) => {
        if (!animationObj.isRunning.value) {
          animationObj.isRunning.value = true;
          animationObj.startTime.value = now; // Set the new start time but progress from accumulatedTime
          this.activeAnimations.set(animationObj.id, animationObj);
        }
      });
    } else if (animations && !animations.isRunning.value) {
      animations.isRunning.value = true;
      animations.startTime.value = now;
      this.activeAnimations.set(animations.id, animations);
    }
  }

  // Stops an animation or animations and resets to the original value based on id, label, or group
  stopAnimation(filter: AnimationFilter) {
    const animations = this.findAnimations(filter);

    if (Array.isArray(animations)) {
      animations.forEach((animationObj) => {
        animationObj.sharedValue.value = animationObj.originalValue; // Reset to original value
        animationObj.isRunning.value = false;
        this.activeAnimations.delete(animationObj.id);
      });
    } else if (animations) {
      animations.sharedValue.value = animations.originalValue; // Reset to original value
      animations.isRunning.value = false;
      this.activeAnimations.delete(animations.id);
    }
  }

  // Updates all running animations at each frame
  // Updates all running animations at each frame
  updateAnimations({ now }: { now: number }) {
    this.activeAnimations.forEach((animationObj) => {
      const {
        sharedValue,
        animation,
        accumulatedTime,
        isRunning,
        config,
        direction,
        loopCount,
        lastUpdateTime,
        waitingForNextLoop,
        loopStartTime,
      } = animationObj;
      // Throttle check
      const { throttle, loopInterval = 0 } = config;
      if (animationObj.startTime.value === null)
        animationObj.startTime.value === now;
      if (throttle && now - lastUpdateTime.value < throttle) {
        return; // Skip update if within throttle time
      }

      if (!isRunning.value) {
        return; // Skip if the animation is paused
      }

      if (waitingForNextLoop.value) {
        // If the animation is waiting for the next loop, check if the interval has passed
        if (now - loopStartTime.value >= loopInterval) {
          animationObj.waitingForNextLoop.value = false;
          animationObj.startTime.value = now;
          animationObj.accumulatedTime.value = 0;
          animationObj.waitingForNextLoop.value = false;
        } else {
          return; // Skip until the interval has passed
        }
      }

      const {
        duration = 500,
        delay = 0,
        loop = 1,
        yoyo = false,
        retainFinalValue = true,
        removeOnComplete = true,
        onDone = () => {},
      } = config;

      const elapsed =
        accumulatedTime.value +
        (now - (animationObj.startTime.value as number)) -
        (loopCount.value === 0 ? delay : 0); // Total time elapsed, including paused time
      // Calculate progress
      let progress = elapsed / duration;
      if (progress > 1) {
        progress = 1;
      }

      // Adjust progress based on direction (yoyo behavior)
      if (direction.value === -1) {
        progress = 1 - progress; // Reverse the progress if in backward mode (yoyo)
      }
      const onAnimateDone = (done: boolean) => {
        // Handle completion of one animation cycle
        if (done) {
          onDone();
          if (direction.value === 1) animationObj.loopCount.value += 1; // Increment loop count

          // Handle looping
          if (
            loop === -1 ||
            animationObj.loopCount.value < loop ||
            (animationObj.loopCount.value === loop && yoyo)
          ) {
            // If yoyo is enabled, reverse the direction for the next loop
            if (yoyo) {
              animationObj.direction.value =
                animationObj.direction.value === 1 ? -1 : 1;
            }

            // Set waiting for the next loop if loopInterval is specified
            if (loopInterval > 0) {
              animationObj.waitingForNextLoop.value = true;
              animationObj.loopStartTime.value = now;
            } else {
              // Reset the start time for the next loop
              animationObj.startTime.value = now;
              animationObj.accumulatedTime.value = 0; // Reset accumulated time
            }
          } else {
            // Handle end of animation after all loops
            if (!retainFinalValue) {
              sharedValue.value = animationObj.originalValue; // Revert to original value if needed
              this.stopAnimation({ id: animationObj.id });
            }
            if (removeOnComplete) {
              this.removeAnimationFromMaps(animationObj);
            }
          }
        }
      };

      animation.update(
        now,
        sharedValue,
        progress,
        direction.value === -1,
        onAnimateDone
      );
      animationObj.lastUpdateTime.value = now;
    });
  }

  // Getters for retrieving animations by ID, label, or group

  getAnimationById(id: string): ActiveAnimation | undefined {
    return this.allAnimations.get(id);
  }

  getAnimationByLabel(label: string): ActiveAnimation | undefined {
    const animationId = this.mapLabelToAnimationId.get(label);
    if (!animationId) return undefined;
    return this.getAnimationById(animationId);
  }

  getAnimationsByGroup(group: string): ActiveAnimation[] {
    return this.mapGroupToAnimations.get(group) || [];
  }
}

export default Animations;
