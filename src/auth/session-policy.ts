const MOBILE_SESSION_MODE = 'mobile_pwa';
const mobileSessionUaPattern = /Android|iPhone|iPad|iPod|Mobile/i;

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
  session?: Record<string, any>;
};

const readHeader = (
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string,
) => {
  const value = headers?.[name];
  if (Array.isArray(value)) return value[0] || '';
  return (value || '').toString();
};

export const isMobileSessionRequest = (req: RequestLike) => {
  const ua = readHeader(req.headers, 'user-agent');
  const clientHintMobile = readHeader(req.headers, 'sec-ch-ua-mobile')
    .trim()
    .toLowerCase();
  const clientHintPlatform = readHeader(req.headers, 'sec-ch-ua-platform')
    .trim()
    .toLowerCase();
  const requestedMode = readHeader(req.headers, 'x-myglobal-session-mode')
    .trim()
    .toLowerCase();
  return (
    requestedMode === MOBILE_SESSION_MODE ||
    mobileSessionUaPattern.test(ua) ||
    clientHintMobile === '?1' ||
    clientHintPlatform.includes('android') ||
    clientHintPlatform.includes('ios')
  );
};

export const resolveSessionMaxAgeMs = (
  req: RequestLike,
  standardMaxAgeMs: number,
  mobileLongMaxAgeMs: number,
) => {
  const currentWallet = (req.session?.wallet || '').toString().trim();
  const useLongSession = isMobileSessionRequest(req) && Boolean(currentWallet || req.session?.challenge);
  return useLongSession
    ? Math.max(standardMaxAgeMs, mobileLongMaxAgeMs)
    : standardMaxAgeMs;
};
