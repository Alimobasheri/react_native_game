export const DEFAULT_PHASE_STEP = 0.2;
export const DEFAULT_TIME_STEP = 0.5;
export const DEFAULT_AMPLITUDE_MULTIPLIER = 0.97;
export const DEFAULT_FREQUEMCY_MULTIPLIER = 0.95;
export const DEFAULT_MINIMUM_AMPLITUDE = 5;

export const MAXIMUM_INITIAL_AMPLITUDE = 150;

export const MINIMUM_INITIAL_FREQUENCY = 5;
export const MAXIMUM_INITIAL_FREQUENCY = 10;

export const layerFlowConfigs = [
  {
    flowAmplitude: 0.4,
    flowFrequency: 16,
    flowSpeed: 0.4,
  },
  {
    flowAmplitude: 0.6,
    flowFrequency: 12,
    flowSpeed: 0.2,
  },
  {
    flowAmplitude: 0.1,
    flowFrequency: 6,
    flowSpeed: 0.12,
  },
];

// export const WATER_GRADIENT_COLORS = [
//   [
//     "rgba(173, 216, 230, 0.8)", // Light Blue
//     "rgba(135, 206, 250, 0.9)", // Sky Blue
//     "rgba(100, 149, 237, 0.95)", // Cornflower Blue
//   ],
//   [
//     "rgba(135, 206, 250, 0.8)", // Sky Blue
//     "rgba(70, 130, 180, 0.9)", // Steel Blue
//     "rgba(30, 144, 255, 0.95)", // Dodger Blue
//   ],

//   [
//     "rgba(70, 130, 180, 0.8)", // Steel Blue
//     "rgba(0, 191, 255, 0.9)", // Deep Sky Blue
//     "rgba(0, 128, 255, 0.95)", // Light Blue
//   ],
//   [
//     "rgba(100, 149, 237, 0.8)", // Cornflower Blue
//     "rgba(70, 130, 180,0.9)", // Steel Blue
//     "rgba(0, 191, 255, 0.95)", // Deep Sky Blue
//   ],
//   [
//     "rgba(30, 144, 255, 0.8)", // Dodger Blue
//     "rgba(0, 128, 255, 0.9)", // Light Blue
//     "rgba(0, 104, 139, 0.95)", // Dark Turquoise
//   ],
//   [
//     "rgba(0, 191, 255, 0.8)", // Deep Sky Blue
//     "rgba(0, 128, 255, 0.9)", // Light Blue
//     "rgba(0, 75, 120, 0.95)", // Darker Blue
//   ],
// ].reverse();

// export const WATER_GRADIENT_COLORS = [
//   ["rgba(179, 229, 252, 0.8)"], // #B3E5FC
//   ["rgba(129, 212, 250, 0.8)"], // #81D4FA
//   ["rgba(79, 195, 247, 0.8)"], // #4FC3F7
//   ["rgba(41, 182, 246, 0.8)"], // rgba(41, 182, 246, 0.8)
//   ["rgba(3, 169, 244, 0.8)"], // #03A9F4
//   ["rgba(2, 136, 209, 0.8)"], // #0288D1
// ].reverse();

export const WATER_GRADIENT_COLORS = [
  ['rgba(26, 66, 93, 0.8)'], // Dark version of #B3E5FC
  ['rgba(19, 61, 85, 0.8)'], // Dark version of #81D4FA
  ['rgba(11, 56, 77, 0.8)'], // Dark version of #4FC3F7
  ['rgba(7, 50, 73, 0.8)'], // Dark version of #29B6F6
  ['rgba(0, 45, 65, 0.8)'], // Dark version of #03A9F4
  ['rgba(0, 34, 52, 0.8)'], // Dark version of #0288D1
].reverse();
