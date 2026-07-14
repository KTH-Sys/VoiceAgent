import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/paypal";
import { updateTrip } from "@/lib/store";

// POST /api/pay { tripId, amountUsd, description } — create a PayPal sandbox order.
export async function POST(req: NextRequest) {
  try {
    const { tripId, amountUsd, description } = await req.json();
    const { orderId, approveUrl } = await createOrder(amountUsd, description);
    updateTrip(tripId, { paypalOrderId: orderId, paymentStatus: "pending" });
    return NextResponse.json({ orderId, approveUrl });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 501 });
  }
}
