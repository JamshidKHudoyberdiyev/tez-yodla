// Mock for expo-audio in tests
declare const jest: any;

export const createAudioPlayer = jest.fn(() => ({
  isLoaded: true,
  play: jest.fn(),
  pause: jest.fn(),
  remove: jest.fn(),
  seekTo: jest.fn(async () => {}),
  setPlaybackRate: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
}));

export const setIsAudioActiveAsync = jest.fn(async () => {});
