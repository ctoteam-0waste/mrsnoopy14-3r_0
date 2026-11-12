// Coins to show for a booking: what was credited once it is completed, otherwise
// the estimate saved when it was booked (cancelled bookings keep their estimate).
// null when the booking has neither.
export function bookingCoins(booking: any): number | null {
  const positive = (v: unknown) => (typeof v === 'number' && v > 0 ? v : null);
  if (booking?.status === 'COMPLETED' && typeof booking.totalKarmaCoins === 'number') return booking.totalKarmaCoins;
  return positive(booking?.estimatedKarmaCoins) ?? positive(booking?.totalKarmaCoins);
}

export const formatBookingCoins = (coins: number | null) =>
  coins == null ? '—' : `+${coins.toLocaleString('en-IN')}`;
