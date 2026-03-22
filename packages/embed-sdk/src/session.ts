/**
 * Session management — stores the embed token and session state in memory.
 * The token is never written to localStorage/cookies to avoid XSS leakage.
 */
import type { VidyAISession, InitOptions, Feature } from './types';

let _session: VidyAISession | null = null;

const DEFAULT_API_URL = 'https://api.vidyai.in';

export function initSession(opts: InitOptions): void {
  if (!opts.embedToken || !opts.embedToken.startsWith('et_')) {
    throw new Error('[VidyAI] embedToken must start with "et_". Get one from POST /api/v1/embed/session on your backend.');
  }
  _session = {
    embedToken: opts.embedToken,
    apiUrl: (opts.apiUrl || DEFAULT_API_URL).replace(/\/$/, ''),
    theme: opts.theme || 'light',
    language: opts.language || 'en',
    accentColor: opts.accentColor || '#6366f1',
    features: [],        // filled after /mcp validation
    studentId: '',       // filled after token validation
  };
}

export function getSession(): VidyAISession {
  if (!_session) {
    throw new Error('[VidyAI] Call VidyAI.init({ embedToken }) before using any widget.');
  }
  return _session;
}

export function setSessionMeta(features: Feature[], studentId: string): void {
  if (_session) {
    _session.features = features;
    _session.studentId = studentId;
  }
}

export function hasFeature(feature: Feature): boolean {
  if (!_session) return false;
  return _session.features.length === 0 || _session.features.includes(feature);
}

export function clearSession(): void {
  _session = null;
}
