const linear = (t: number) => {
  'worklet';
  return t;
};
const easeInQuad = (t: number) => {
  'worklet';
  return t * t;
};
const easeOutQuad = (t: number) => {
  'worklet';
  return t * (2 - t);
};
const easeInOutQuad = (t: number) => {
  'worklet';
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

export { linear, easeInQuad, easeOutQuad, easeInOutQuad };
