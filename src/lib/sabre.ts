// Sabre test-environment client (K2/K3).
// Docs: https://developer.sabre.com/product-collection/hackathon-2026

const BASE_URL = process.env.SABRE_BASE_URL ?? "https://api.cert.platform.sabre.com";

let cachedToken: { token: string; expiresAt: number } | null = null;

/** OAuth2 client-credentials token, cached until expiry. */
export async function getSabreToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }
  // TODO(K2): POST /v2/auth/token with base64(clientId:clientSecret)
  throw new Error("Not implemented: Sabre auth (K2)");
}

export interface FlightSearchParams {
  origin: string; // IATA, e.g. "SFO"
  destination: string; // IATA, e.g. "DFW"
  departureDate: string; // YYYY-MM-DD
  returnDate?: string;
  preferredCarrier?: string; // e.g. "AA" for the American Airlines story
}

export async function searchFlights(params: FlightSearchParams): Promise<unknown[]> {
  // TODO(K2): Bargain Finder Max (or hackathon-2026 collection equivalent)
  void params;
  throw new Error("Not implemented: Sabre flight search (K2)");
}

export interface HotelSearchParams {
  cityCode: string; // e.g. "DFW"
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
}

export async function searchHotels(params: HotelSearchParams): Promise<unknown[]> {
  // TODO(K3): Sabre hotel search
  void params;
  throw new Error("Not implemented: Sabre hotel search (K3)");
}

export async function createBooking(tripId: string): Promise<{ confirmationNumber: string }> {
  // TODO(K7): create PNR; fall back to a mock confirmation if API access fights back
  void tripId;
  throw new Error("Not implemented: Sabre booking (K7)");
}
