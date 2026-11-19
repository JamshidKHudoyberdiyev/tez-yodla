// Mock for expo-audio in tests
declare const jest: any;

export const createAudioPlayer = (typeof jest !== 'undefined' && jest.fn)
  ? jest.fn(() => ({
      play: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
      playbackRate: 1,
      shouldCorrectPitch: true,
      addListener: jest.fn((_event: string, _callback: (status: any) => void) => ({
        remove: jest.fn(),
      })),
    }))
  : () => ({
      play: () => {},
      pause: () => {},
      remove: () => {},
      playbackRate: 1,
      shouldCorrectPitch: true,
      addListener: () => ({ remove: () => {} }),
    });

export const setIsAudioActiveAsync = (typeof jest !== 'undefined' && jest.fn)
  ? jest.fn(async () => {})
  : async () => {};
