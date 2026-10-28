// Coordinates for the cities Relay serves, so tracking can show a real
// distance and draw a route. Trips themselves carry only city names.

export const CITIES: Record<string, { lat: number; lng: number }> = {
  Abuja: { lat: 9.0765, lng: 7.3986 },
  Accra: { lat: 5.6037, lng: -0.187 },
  Awka: { lat: 6.2104, lng: 7.0741 },
  Enugu: { lat: 6.4584, lng: 7.5464 },
  Houston: { lat: 29.7604, lng: -95.3698 },
  Ibadan: { lat: 7.3775, lng: 3.947 },
  Kano: { lat: 12.0022, lng: 8.592 },
  Lagos: { lat: 6.5244, lng: 3.3792 },
  London: { lat: 51.5072, lng: -0.1276 },
  Onitsha: { lat: 6.1413, lng: 6.8029 },
  'Port Harcourt': { lat: 4.8156, lng: 7.0498 },
};

/** Great-circle distance in km between two known cities, or null if either is unknown. */
export function distanceKm(from: string, to: string): number | null {
  const a = CITIES[from];
  const b = CITIES[to];
  if (!a || !b) return null;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
}
