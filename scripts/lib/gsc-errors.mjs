// Shared error type and secret redaction for the GSC collector/report pipeline.
//
// Every error message and diagnostic string that can reach a log is passed
// through redactSecrets() first. Authentication failures must be clear about
// what failed without ever printing tokens, service-account JSON, private
// keys, credential-bearing response bodies, or request endpoint query strings.

export class GscError extends Error {
  constructor(message, options = {}) {
    super(redactSecrets(String(message)));
    this.name = 'GscError';
    this.kind = options.kind ?? 'error'; // 'cli' | 'config' | 'auth' | 'transport' | 'parse'
    this.code = options.code ?? null;
    this.status = options.status ?? null;
    this.retryable = Boolean(options.retryable);
  }
}

const REDACTIONS = [
  // PEM private key blocks (also matches within escaped JSON strings poorly,
  // so the JSON rule below catches the escaped form).
  [/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g, '[redacted:private-key]'],
  [/"private_key"\s*:\s*"[^"]*"/g, '"private_key":"[redacted]"'],
  // Bare JWTs (header.payload.signature).
  [/\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}/g, '[redacted:jwt]'],
  [/Bearer\s+[A-Za-z0-9._~+/=-]{4,}/gi, 'Bearer [redacted]'],
  [/\bassertion=[^&\s"']+/gi, 'assertion=[redacted]'],
  [/("access_token"\s*:\s*")[^"]*"/gi, '$1[redacted]"'],
  [/\baccess_token=[^&\s"']+/gi, 'access_token=[redacted]'],
  [/("refresh_token"\s*:\s*")[^"]*"/gi, '$1[redacted]"'],
  [/("id_token"\s*:\s*")[^"]*"/gi, '$1[redacted]"'],
  [/("client_secret"\s*:\s*")[^"]*"/gi, '$1[redacted]"'],
  // Request endpoint query strings (may carry assertions or tokens).
  [/\?[^\s"'`)\]]+/g, '?[redacted:query]'],
];

export function redactSecrets(input) {
  let text = String(input ?? '');
  for (const [pattern, replacement] of REDACTIONS) {
    text = text.replace(pattern, replacement);
  }
  return text;
}

export function safeErrorMessage(error) {
  if (error instanceof GscError) return error.message; // already redacted
  return redactSecrets(error?.message ?? String(error));
}
