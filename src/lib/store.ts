// In-memory demo state. No database — this is a 6-hour hackathon build.
// Everything lives for the lifetime of the dev server process.

export interface TravelerProfile {
  fullName?: string;
  passportNumber?: string;
  dateOfBirth?: string;
  passportExpiry?: string;
}

export interface Trip {
  id: string;
  flight?: unknown; // selected Sabre flight offer
  hotel?: unknown; // selected Sabre hotel offer
  traveler?: TravelerProfile;
  paymentStatus: "unpaid" | "pending" | "paid";
  paypalOrderId?: string;
  paypalApproveUrl?: string; // surfaced as the on-screen "Approve with PayPal" button
  disrupted: boolean;
  confirmationNumber?: string;
}

const trips = new Map<string, Trip>();

export function getTrip(id: string): Trip {
  let trip = trips.get(id);
  if (!trip) {
    trip = { id, paymentStatus: "unpaid", disrupted: false };
    trips.set(id, trip);
  }
  return trip;
}

export function updateTrip(id: string, patch: Partial<Trip>): Trip {
  const trip = { ...getTrip(id), ...patch };
  trips.set(id, trip);
  return trip;
}
