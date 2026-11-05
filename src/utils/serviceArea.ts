// Mirrors the backend's service-area check (50km from central Gurugram) so the
// map picker can warn the user before they fill the address form. The backend
// still enforces this independently on POST/PATCH /users/addresses — this is
// a UX nicety only, never the source of truth.
export const GURUGRAM_CENTER = { lat: 28.4595, lon: 77.0266 };
export const SERVICE_RADIUS_METERS = 50000;

export function isWithinServiceArea(lat: number, lon: number): boolean {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat - GURUGRAM_CENTER.lat);
  const dLon = toRad(lon - GURUGRAM_CENTER.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(GURUGRAM_CENTER.lat)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2;
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return distance <= SERVICE_RADIUS_METERS;
}
