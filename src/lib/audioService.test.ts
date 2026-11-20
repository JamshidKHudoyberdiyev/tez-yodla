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

    it("so'zning joyiga siljiydi, tezlikni qo'yadi va o'ynatadi", async () => {
      const played = await playNativeWordAudio('apple', 'us', 0.85);
      expect(played).toBe(true);
      const player = (createAudioPlayer as jest.Mock).mock.results[0]?.value ?? lastPlayer();
      expect(player.setPlaybackRate).toHaveBeenCalledWith(0.85, 'high');
      expect(player.seekTo).toHaveBeenCalledWith(getLocalWordAudio('apple', 'us')![0] / 1000);
      expect(player.play).toHaveBeenCalled();
    });

    it("so'z oxiriga yetganda to'xtaydi va onFinish chaqiriladi", async () => {
      const onFinish = jest.fn();
      const played = await playNativeWordAudio('apple', 'us', 1, { onFinish });
      expect(played).toBe(true);
      const player = lastPlayer();
      const cb = player.addListener.mock.calls.at(-1)[1];
      const end = getLocalWordAudio('apple', 'us')![1] / 1000;
      cb({ currentTime: end - 0.05, didJustFinish: false });
      expect(onFinish).not.toHaveBeenCalled();
      cb({ currentTime: end + 0.2, didJustFinish: false });
      expect(onFinish).toHaveBeenCalledTimes(1);
      expect(player.pause).toHaveBeenCalled();
    });

    it("pleyer hali yuklanmagan bo'lsa — telefon ovoziga (false)", async () => {
      const player = lastPlayer();
      player.isLoaded = false;
      expect(await playNativeWordAudio('apple', 'us')).toBe(false);
      player.isLoaded = true;
    });
  });
});

/** Talaffuz uchun yaratilgan (keshdagi) pleyer */
function lastPlayer(): any {
  const r = (createAudioPlayer as jest.Mock).mock.results;
  return r[r.length - 1].value;
}

describe('hasLocalAudio', () => {
  it("lug'atdagi so'z uchun true, gap va noma'lum so'z uchun false", () => {
    expect(hasLocalAudio('apple')).toBe(true);
    expect(hasLocalAudio('This is a full sentence.')).toBe(false);
    expect(hasLocalAudio('someunknownwordxyz123')).toBe(false);
  });
});
