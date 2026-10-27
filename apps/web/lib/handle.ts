// Display helpers for public handles. Handles come from the API (users
// choose or are assigned them); the browser never derives one from an id.

/** djb2 — small, stable string hash. Only needs to be stable, not secure. */
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Avatar hue for a handle: same handle, same colour, everywhere. */
export function handleHue(handle: string): number {
  return hash(handle) % 360;
}

/** Two-letter monogram, e.g. "amber-otter-14" -> "AO". */
export function handleMonogram(handle: string): string {
  const parts = handle.split('-').filter((p) => /^[a-z]/.test(p));
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : handle.slice(0, 2);
  return letters.toUpperCase();
}
