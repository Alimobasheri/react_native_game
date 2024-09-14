import { SharedValue } from 'react-native-reanimated';
import { v4 as uuidv4 } from 'uuid';

export interface AnimationConfig {
  duration?: number;
  easing?: (t: number) => number;
  loop?: number;
  yoyo?: boolean;
  retainFinalValue?: boolean;
  label?: string; // Optional label for animation
  groups?: string[]; // Optional groups for the animation
}

export interface Animation {
  update: (sharedValue: SharedValue<any>, progress: number) => boolean;
}

export interface AnimationFilter {
  id?: string;
  label?: string;
  group?: string;
}

export interface ActiveAnimation {
  id: string; // Unique ID for each animation
  sharedValue: SharedValue<any>;
  originalValue: any;
  animation: Animation;
  startTime: number;
  accumulatedTime: number;
  isRunning: boolean;
  config: AnimationConfig;
  direction: 1 | -1;
  loopCount: number;
}

class Animations {
  private activeAnimations: Map<string, ActiveAnimation> = new Map(); // Store animations by ID
  private mapLabelToAnimationId: Map<string, string> = new Map(); // Store label -> animation ID
  private mapGroupToAnimations: Map<string, ActiveAnimation[]> = new Map(); // Store group -> animations

  // Registers a new animation with optional label and groups
  registerAnimation(
    sharedValue: SharedValue<any>,
    animation: Animation,
    config: AnimationConfig = {},
    isRunning = true
  ) {
    const id = uuidv4(); // Generate a unique ID for the animation
    const now = global.nativePerformanceNow();

    const newAnimation: ActiveAnimation = {
      id,
      sharedValue,
      originalValue: sharedValue.value,
      animation,
      startTime: now,
      accumulatedTime: 0,
      isRunning,
      config,
      direction: 1,
      loopCount: 0,
    };

    this.activeAnimations.set(id, newAnimation);

    // If the animation has a label, associate it with the animation ID
    if (config.label) {
      this.mapLabelToAnimationId.set(config.label, id);
    }

    // If the animation belongs to groups, associate it with those groups
    if (config.groups) {
      config.groups.forEach((group) => {
        if (!this.mapGroupToAnimations.has(group)) {
          this.mapGroupToAnimations.set(group, []);
        }
        this.mapGroupToAnimations.get(group)?.push(newAnimation);
      });
    }
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
  private removeAnimationFromMaps(animationObj: ActiveAnimation) {
    // Remove from activeAnimations
    this.activeAnimations.delete(animationObj.id);

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
        if (animationObj.isRunning) {
          animationObj.isRunning = false;
          animationObj.accumulatedTime += now - animationObj.startTime; // Accumulate elapsed time
        }
      });
    } else if (animations && animations.isRunning) {
      animations.isRunning = false;
      animations.accumulatedTime += now - animations.startTime;
    }
  }

  // Resumes an animation or animations based on id, label, or group
  resumeAnimation(filter: AnimationFilter) {
    const now = global.nativePerformanceNow();
    const animations = this.findAnimations(filter);

    if (Array.isArray(animations)) {
      animations.forEach((animationObj) => {
        if (!animationObj.isRunning) {
          animationObj.isRunning = true;
          animationObj.startTime = now; // Set the new start time but progress from accumulatedTime
        }
      });
    } else if (animations && !animations.isRunning) {
      animations.isRunning = true;
      animations.startTime = now;
    }
  }

  // Stops an animation or animations and resets to the original value based on id, label, or group
  stopAnimation(filter: AnimationFilter) {
    const animations = this.findAnimations(filter);

    if (Array.isArray(animations)) {
      animations.forEach((animationObj) => {
        animationObj.sharedValue.value = animationObj.originalValue; // Reset to original value
        this.removeAnimationFromMaps(animationObj); // Unregister the animation and remove from maps
      });
    } else if (animations) {
      animations.sharedValue.value = animations.originalValue; // Reset to original value
      this.removeAnimationFromMaps(animations); // Unregister the animation and remove from maps
    }
  }

  // Updates all running animations at each frame
  updateAnimations() {
    const now = global.nativePerformanceNow();
    this.activeAnimations.forEach((animationObj) => {
      const {
        sharedValue,
        animation,
        startTime,
        accumulatedTime,
        isRunning,
        config,
        direction,
        loopCount,
      } = animationObj;

      if (!isRunning) {
        return; // Skip if the animation is paused
      }

      const {
        duration = 500,
        loop = 1,
        yoyo = false,
        retainFinalValue = true,
      } = config;
      const elapsed = accumulatedTime + (now - startTime); // Total time elapsed, including paused time

      // Calculate progress
      let progress = elapsed / duration;
      if (progress > 1) {
        progress = 1;
      }

      // Adjust progress based on direction (yoyo behavior)
      if (direction === -1) {
        progress = 1 - progress; // Reverse the progress if in backward mode (yoyo)
      }

      const done = animation.update(sharedValue, progress);

      // Handle completion of one animation cycle
      if (done) {
        animationObj.loopCount += 1; // Increment loop count

        // Handle looping
        if (loop === -1 || animationObj.loopCount < loop) {
          // If yoyo is enabled, reverse the direction for the next loop
          if (yoyo) {
            animationObj.direction = animationObj.direction === 1 ? -1 : 1;
          }

          // Reset the start time for the next loop
          animationObj.startTime = global.nativePerformanceNow();
          animationObj.accumulatedTime = 0; // Reset accumulated time
        } else {
          // Handle end of animation after all loops
          if (!retainFinalValue) {
            sharedValue.value = animationObj.originalValue; // Revert to original value if needed
          }
          this.stopAnimation({ id: animationObj.id }); // Stop and remove animation
        }
      }
    });
  }

  // Getters for retrieving animations by ID, label, or group

  getAnimationById(id: string): ActiveAnimation | undefined {
    return this.activeAnimations.get(id);
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
