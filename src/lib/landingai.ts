// LandingAI Agentic Document Extraction client (A3 integration).
// Docs: https://docs.landing.ai/ade — verify the schema in the Visual
// Playground first (Allison / A3), then keep this in sync.

import type { TravelerProfile } from "./store";

const BASE_URL = process.env.LANDINGAI_BASE_URL ?? "https://api.va.landing.ai";

// Extraction schema for passport/ID documents — mirror any changes Allison
// makes in the Visual Playground here.
const FIELDS_SCHEMA = {
  type: "object",
  properties: {
    fullName: { type: "string", description: "Traveler's full name as printed on the document" },
    passportNumber: { type: "string", description: "Passport or ID document number" },
    dateOfBirth: { type: "string", description: "Date of birth, YYYY-MM-DD" },
    passportExpiry: { type: "string", description: "Document expiry date, YYYY-MM-DD" },
  },
};

export async function extractTravelerDocument(file: Blob): Promise<TravelerProfile> {
  const apiKey = process.env.LANDINGAI_API_KEY;
  if (!apiKey) throw new Error("LANDINGAI_API_KEY is not set (see .env.example)");

  const form = new FormData();
  form.append("image", file, "document.jpg");
  form.append("fields_schema", JSON.stringify(FIELDS_SCHEMA));

  const res = await fetch(`${BASE_URL}/v1/tools/agentic-document-analysis`, {
    method: "POST",
    headers: { Authorization: `Basic ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`LandingAI extraction failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  // ADE returns extracted_schema when fields_schema is provided; fall back to
  // any object that carries our field names so schema tweaks don't break us.
  const extracted =
    data?.data?.extracted_schema ?? data?.extracted_schema ?? data?.data ?? data ?? {};

  return {
    fullName: extracted.fullName ?? extracted.full_name,
    passportNumber: extracted.passportNumber ?? extracted.passport_number,
    dateOfBirth: extracted.dateOfBirth ?? extracted.date_of_birth,
    passportExpiry: extracted.passportExpiry ?? extracted.passport_expiry,
  };
}
