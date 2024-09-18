export const createMockSharedValue = (initialValue: any) => ({
  value: initialValue,
});

// Helper function to simulate time progression
export function advanceTime(delta: number, callback: Function) {
  jest.advanceTimersByTime(delta * 1000); // Convert seconds to milliseconds
  callback();
}
