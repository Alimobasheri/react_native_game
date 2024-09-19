require('react-native-reanimated').setUpTests();

let mockId = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => {
    mockId++;
    return 'unique-id-mock' + mockId;
  }), // Mocking uuid to return a consistent value
}));
