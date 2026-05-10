import {
  isMobileSessionRequest,
  resolveSessionMaxAgeMs,
} from './session-policy.js';

describe('session policy', () => {
  it('treats desktop requests as short sessions', () => {
    const req = {
      headers: {
        'user-agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/136.0.0.0 Safari/537.36',
      },
      session: { wallet: 'TESTWALLET' },
    };
    expect(isMobileSessionRequest(req)).toBe(false);
    expect(resolveSessionMaxAgeMs(req, 10 * 60 * 1000, 180 * 24 * 60 * 60 * 1000)).toBe(
      10 * 60 * 1000,
    );
  });

  it('treats mobile requests as long sessions', () => {
    const req = {
      headers: {
        'user-agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 Version/18.3 Mobile/15E148 Safari/604.1',
      },
      session: { wallet: 'TESTWALLET' },
    };
    expect(isMobileSessionRequest(req)).toBe(true);
    expect(resolveSessionMaxAgeMs(req, 10 * 60 * 1000, 180 * 24 * 60 * 60 * 1000)).toBe(
      180 * 24 * 60 * 60 * 1000,
    );
  });

  it('accepts the forwarded mobile PWA header when the UA is ambiguous', () => {
    const req = {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/136.0.0.0 Safari/537.36',
        'x-myglobal-session-mode': 'mobile_pwa',
      },
      session: { challenge: 'abc123' },
    };
    expect(isMobileSessionRequest(req)).toBe(true);
    expect(resolveSessionMaxAgeMs(req, 10 * 60 * 1000, 180 * 24 * 60 * 60 * 1000)).toBe(
      180 * 24 * 60 * 60 * 1000,
    );
  });
});
