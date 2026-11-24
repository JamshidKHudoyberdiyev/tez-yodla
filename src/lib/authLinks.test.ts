import { accountLabelOf, cleanCode, providerOf, telegramLink } from './authLinks';

describe('providerOf', () => {
  it('Telegram — app_metadata.telegram_id', () => {
    expect(providerOf({ app_metadata: { provider: 'email', telegram_id: 123 } })).toBe('telegram');
  });
  it('qolganlari — Google', () => {
    expect(providerOf({ app_metadata: { provider: 'google' } })).toBe('google');
  });
});

describe('accountLabelOf', () => {
  it('Google — email', () => {
    expect(accountLabelOf({ email: 'a@b.uz' }, 'google')).toBe('a@b.uz');
  });
  it('Telegram — ism va username (texnik email ko\'rsatilmaydi)', () => {
    expect(accountLabelOf({ email: '123@telegram.tezyodla.app', user_metadata: { name: 'Jamshid', preferred_username: 'jamshid_x' } }, 'telegram')).toBe('Jamshid · @jamshid_x');
  });
  it('Telegram — ma\'lumot yo\'q', () => {
    expect(accountLabelOf({ user_metadata: {} }, 'telegram')).toBe('Telegram');
  });
});

describe('telegram yordamchilari', () => {
  it('bot havolasi', () => {
    expect(telegramLink('TezYodlaBot', 'abc_123')).toBe('https://t.me/TezYodlaBot?start=abc_123');
  });
  it('kodni tozalash', () => {
    expect(cleanCode(' 74 873 ')).toBe('74873');
    expect(cleanCode('1234567')).toBe('12345');
  });
});
