// PayPal sandbox client (K5).
// Docs: https://developer.paypal.com/docs/api/orders/v2/

const BASE_URL = process.env.PAYPAL_BASE_URL ?? "https://api-m.sandbox.paypal.com";

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getPayPalToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set (see .env.example)");
  }

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`PayPal auth failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

export async function createOrder(
  amountUsd: string,
  description: string,
): Promise<{ orderId: string; approveUrl: string }> {
  const token = await getPayPalToken();

  const res = await fetch(`${BASE_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          description,
          amount: { currency_code: "USD", value: amountUsd },
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`PayPal create order failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const approveUrl = data.links?.find((l: any) => l.rel === "approve" || l.rel === "payer-action")?.href;
  if (!approveUrl) {
    throw new Error(`PayPal order created but no approve link found: ${JSON.stringify(data.links)}`);
  }
  return { orderId: data.id, approveUrl };
}

export async function captureOrder(orderId: string): Promise<{ status: string }> {
  // Demo mode: skip the sandbox buyer-approval + capture round-trip entirely.
  // Order creation stays real either way, so the API usage is genuine.
  if (process.env.PAYPAL_SIMULATE === "1") {
    console.log(`[paypal] simulated capture for order ${orderId}`);
    return { status: "COMPLETED" };
  }

  const token = await getPayPalToken();

  const res = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`PayPal capture failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  return { status: data.status };
}
