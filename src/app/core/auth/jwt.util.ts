/** Decode JWT payload (middle segment) without verifying signature — UI-only scope checks. */
export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const first = token.indexOf('.');
    const second = token.indexOf('.', first + 1);
    if (first < 0 || second < 0) return null;
    const b64 = token.slice(first + 1, second).replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      [...atob(padded)]
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function jwtScopes(payload: Record<string, unknown> | null): string[] {
  if (!payload) return [];
  const scope = payload['scope'];
  if (typeof scope === 'string' && scope.length > 0) {
    return scope.split(/\s+/).filter(Boolean);
  }
  if (Array.isArray(scope)) {
    return scope.filter((s): s is string => typeof s === 'string');
  }
  return [];
}
