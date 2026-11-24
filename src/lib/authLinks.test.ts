import { accountLabelOf, parseCallback } from './authLinks';

describe('parseCallback', () => {
  it('boshqa havolalarni e\'tiborsiz qoldiradi', () => {
    expect(parseCallback('yodla://home')).toBeNull();
  });
  it('code ni ajratadi', () => {
    expect(parseCallback('yodla://auth-callback?code=abc-123')).toEqual({ code: 'abc-123' });
  });
  it('# ichidagi xatoni ajratadi', () => {
    expect(parseCallback('yodla://auth-callback#error=access_denied&error_description=User+cancelled')).toEqual({ error: 'User cancelled' });
  });
  it('bo\'sh qaytish — xato', () => {
    expect(parseCallback('yodla://auth-callback')).toEqual({ error: 'unknown' });
  });
});

describe('accountLabelOf', () => {
  it('Google — email', () => {
    expect(accountLabelOf({ email: 'a@b.uz' }, 'google')).toBe('a@b.uz');
  });
  it('Telegram — ism va username', () => {
    expect(accountLabelOf({ email: '', user_metadata: { name: 'Jamshid', preferred_username: 'jamshid_x' } }, 'telegram')).toBe('Jamshid · @jamshid_x');
  });
  it('Telegram — ma\'lumot yo\'q', () => {
    expect(accountLabelOf({ user_metadata: {} }, 'telegram')).toBe('Telegram');
  });
});
