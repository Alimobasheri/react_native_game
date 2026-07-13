---
trigger: always_on
description: React Native Worklets rules — thread boundaries, scheduling API, hoisting, and closure traps
---

# Worklets

## 1. Only call worklets from worklets

Functions marked with `'worklet'` run on the UI thread. A plain JS function called inside a worklet is **not** on the UI thread and will break or silently misbehave.

```typescript
// ❌ BAD — plain JS helper called inside a worklet
const bump = (n: number) => n + 1;
const onFrame = () => {
  'worklet';
  bump(count.value); // not a worklet
};

// ✅ GOOD — helper is also a worklet
const bump = (n: number) => {
  'worklet';
  return n + 1;
};
const onFrame = () => {
  'worklet';
  bump(count.value);
};

// ✅ GOOD — cross-thread via scheduleOnRN / scheduleOnUI (see §2)
```

## 2. Use scheduleOnRN / scheduleOnUI — not runOnJS / runOnUI

`runOnJS` and `runOnUI` from `react-native-reanimated` are **deprecated**. Import from `react-native-worklets`:

```typescript
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

// RN thread → UI thread
scheduleOnUI(addEvent, event);

// UI thread → RN thread
scheduleOnRN(callSubscriptionJS, event);
```

Canonical pattern: `useEventQueue` — worklet handlers call `scheduleOnRN` for JS callbacks; JS callers use `scheduleOnUI` to enter worklets.

## 3. Define before reference — no reliance on hoisting

Worklet compilation does **not** hoist like normal JS. Every function, constant, or helper referenced inside a worklet must be **defined above** its first use in the same scope.

```typescript
// ❌ BAD — helper used before declaration
const process = () => {
  'worklet';
  return normalize(x);
};
const normalize = (v: number) => {
  'worklet';
  return v * 0.5;
};

// ✅ GOOD — helpers defined first
const normalize = (v: number) => {
  'worklet';
  return v * 0.5;
};
const process = () => {
  'worklet';
  return normalize(x);
};
```

## 4. No outer-scope variables in default parameter values

Default param expressions are evaluated in a context where outer closures are **not** captured — they become `undefined`.

```typescript
const DEFAULT_SPEED = 120;

// ❌ BAD — DEFAULT_SPEED is undefined inside the worklet default
const step = (speed = DEFAULT_SPEED) => {
  'worklet';
  return speed;
};

// ✅ GOOD — default applied inside the body
const step = (speed?: number) => {
  'worklet';
  const s = speed ?? DEFAULT_SPEED;
  return s;
};
```
