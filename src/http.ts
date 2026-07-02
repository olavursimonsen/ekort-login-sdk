import { EkortOAuthError } from './errors';

interface ParsedBody {
  raw: string;
  json: Record<string, unknown> | null;
}

export async function readBody(response: Response): Promise<ParsedBody> {
  let raw: string;
  try {
    raw = await response.text();
  } catch {
    raw = '';
  }
  let json: Record<string, unknown> | null = null;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        json = parsed as Record<string, unknown>;
      }
    } catch {
      json = null;
    }
  }
  return { raw, json };
}

export function toOAuthError(
  context: string,
  response: Response,
  body: ParsedBody
): EkortOAuthError {
  const error =
    typeof body.json?.error === 'string' ? body.json.error : undefined;
  const errorDescription =
    typeof body.json?.error_description === 'string'
      ? body.json.error_description
      : undefined;
  const detail = errorDescription ?? error ?? body.raw.slice(0, 200);
  const message = detail
    ? `${context} failed (${response.status}): ${detail}`
    : `${context} failed (${response.status})`;
  return new EkortOAuthError(message, {
    status: response.status,
    error,
    errorDescription,
    body: body.raw.slice(0, 1000),
  });
}
