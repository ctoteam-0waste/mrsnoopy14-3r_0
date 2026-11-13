// Bookings handed from one screen to the next, kept in memory. Only the id goes in
// the route params: on the web params become the URL, where an object turns into
// "?booking=[object Object]" and is lost on refresh or when the link is shared.
const cache = new Map<string, any>();

export function rememberBooking(booking: any): string | undefined {
  const id = booking?._id || booking?.id;
  if (!id) return undefined;
  cache.set(String(id), booking);
  return String(id);
}

export const cachedBooking = (id?: string) => (id ? cache.get(id) : undefined);

export const isBookingObjectId = (id?: string) => !!id && /^[a-f0-9]{24}$/i.test(id);
