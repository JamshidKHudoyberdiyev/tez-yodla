import {
  isWordLike,
  toAudioSlug,
  getLocalWordAudio,
  hasLocalAudio,
  playNativeWordAudio,
  stopNativeAudio,
  setStudioVoiceEnabled,
  isStudioVoiceEnabled,
} from './audioService';
import { createAudioPlayer } from 'expo-audio';

describe('audioService', () => {
  beforeEach(() => {
    setStudioVoiceEnabled(true);
    jest.clearAllMocks();
  });

  afterEach(() => {
    stopNativeAudio();
  });

  describe('isWordLike', () => {
    it('detects single or double words as word-like', () => {
      expect(isWordLike('apple')).toBe(true);
      expect(isWordLike('ice cream')).toBe(true);
      expect(isWordLike('bus stop')).toBe(true);
      expect(isWordLike('  hello  ')).toBe(true);
    });

    it('rejects sentences and long texts', () => {
      expect(isWordLike('The weather is beautiful today.')).toBe(false);
      expect(isWordLike('Hello! How are you?')).toBe(false);
      expect(isWordLike('one two three four five six seven eight')).toBe(false);
      expect(isWordLike('')).toBe(false);
    });
  });

  describe('toAudioSlug', () => {
    it('converts words to slug format', () => {
      expect(toAudioSlug('apple')).toBe('apple');
      expect(toAudioSlug('Ice Cream')).toBe('ice-cream');
      expect(toAudioSlug('take off')).toBe('take-off');
      expect(toAudioSlug('good-bye')).toBe('good-bye');
      expect(toAudioSlug("don't")).toBe('don-t');
    });
  });

  describe('getLocalWordAudio', () => {
    it('returns local audio asset for known words', () => {
      const audioUs = getLocalWordAudio('apple', 'us');
      expect(audioUs).toBeDefined();

      const audioUk = getLocalWordAudio('apple', 'uk');
      expect(audioUk).toBeDefined();
    });

    it('returns null for sentences', () => {
      expect(getLocalWordAudio('This is a full sentence.', 'us')).toBeNull();
    });

    it('returns null for non-existent words', () => {
      expect(getLocalWordAudio('someunknownwordxyz123', 'us')).toBeNull();
    });
  });

  describe('setStudioVoiceEnabled', () => {
    it('toggles studio voice mode correctly', () => {
      setStudioVoiceEnabled(false);
      expect(isStudioVoiceEnabled()).toBe(false);
      setStudioVoiceEnabled(true);
      expect(isStudioVoiceEnabled()).toBe(true);
    });
  });

  describe('playNativeWordAudio', () => {
    it('returns false when studio voice is disabled', async () => {
      setStudioVoiceEnabled(false);
      const played = await playNativeWordAudio('apple', 'us');
      expect(played).toBe(false);
    });

    it('returns false for unknown words (delegates to expo-speech)', async () => {
      const played = await playNativeWordAudio('unknowncustomwordxyz', 'us');
      expect(played).toBe(false);
    });

    it('plays local audio for known words and sets playback rate', async () => {
      const played = await playNativeWordAudio('apple', 'us', 0.85);
      expect(played).toBe(true);
      expect(createAudioPlayer).toHaveBeenCalled();
    });

    it('triggers onFinish when audio finishes playing', async () => {
      let statusCallback: ((status: any) => void) | undefined;
      const mockPlayer = {
        play: jest.fn(),
        pause: jest.fn(),
        remove: jest.fn(),
        playbackRate: 1,
        shouldCorrectPitch: true,
        addListener: jest.fn((event: string, cb: (status: any) => void) => {
          if (event === 'playbackStatusUpdate') {
            statusCallback = cb;
          }
          return { remove: jest.fn() };
        }),
      };
      (createAudioPlayer as jest.Mock).mockReturnValueOnce(mockPlayer);

      const onFinish = jest.fn();
      const played = await playNativeWordAudio('apple', 'us', 1, { onFinish });
      expect(played).toBe(true);

      // Simulate finish status
      statusCallback?.({ didJustFinish: true });
      expect(onFinish).toHaveBeenCalled();
    });

    it('triggers onError when playback error occurs', async () => {
      let statusCallback: ((status: any) => void) | undefined;
      const mockPlayer = {
        play: jest.fn(),
        pause: jest.fn(),
        remove: jest.fn(),
        playbackRate: 1,
        shouldCorrectPitch: true,
        addListener: jest.fn((event: string, cb: (status: any) => void) => {
          if (event === 'playbackStatusUpdate') {
            statusCallback = cb;
          }
          return { remove: jest.fn() };
        }),
      };
      (createAudioPlayer as jest.Mock).mockReturnValueOnce(mockPlayer);

      const onError = jest.fn();
      const played = await playNativeWordAudio('apple', 'us', 1, { onError });
      expect(played).toBe(true);

      // Simulate error status
      statusCallback?.({ error: 'Player decode error' });
      expect(onError).toHaveBeenCalledWith('Player decode error');
    });
  });
});

describe('hasLocalAudio', () => {
  it("lug'atdagi so'z uchun true, gap va noma'lum so'z uchun false", () => {
    expect(hasLocalAudio('apple')).toBe(true);
    expect(hasLocalAudio('This is a full sentence.')).toBe(false);
    expect(hasLocalAudio('someunknownwordxyz123')).toBe(false);
  });
});
