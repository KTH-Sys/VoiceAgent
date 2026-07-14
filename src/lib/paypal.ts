// PayPal sandbox client (K5).
// Docs: https://developer.paypal.com/docs/api/orders/v2/

const BASE_URL = process.env.PAYPAL_BASE_URL ?? "https://api-m.sandbox.paypal.com";

export async function getPayPalToken(): Promise<string> {
  // TODO(K5): POST /v1/oauth2/token with basic auth (client_id:client_secret)
  void BASE_URL;
  throw new Error("Not implemented: PayPal auth (K5)");
}

export async function createOrder(amountUsd: string, description: string): Promise<{ orderId: string; approveUrl: string }> {
  // TODO(K5): POST /v2/checkout/orders
  void amountUsd;
  void description;
  throw new Error("Not implemented: PayPal create order (K5)");
}

export async function captureOrder(orderId: string): Promise<{ status: string }> {
  // TODO(K5): POST /v2/checkout/orders/{orderId}/capture
  void orderId;
  throw new Error("Not implemented: PayPal capture (K5)");
}
