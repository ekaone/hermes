/**
 * Returns true if `pattern` matches `event`.
 *
 * Exact patterns (no `*`) use strict equality.
 * `*` matches any single dot-free segment: `user.*` matches `user.created`
 * but not `user.a.b`.
 */
export function matchesWildcard(pattern: string, event: string): boolean {
  if (!pattern.includes("*")) {
    return pattern === event;
  }
  const regex = new RegExp(
    "^" + pattern.replace(/\./g, "\\.").replace(/\*/g, "[^.]+") + "$"
  );
  return regex.test(event);
}
