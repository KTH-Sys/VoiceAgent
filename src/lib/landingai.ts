// LandingAI Agentic Document Extraction client (A3 schema → KTH integration).
// Docs: https://docs.landing.ai/ade — test schemas in the Visual Playground first.

import type { TravelerProfile } from "./store";

export async function extractTravelerDocument(file: Blob): Promise<TravelerProfile> {
  // TODO: POST the passport/ID image to the ADE API with the extraction schema
  // Allison settles in the Visual Playground (A3): fullName, passportNumber,
  // dateOfBirth, passportExpiry.
  void file;
  throw new Error("Not implemented: LandingAI document extraction (A3)");
}
