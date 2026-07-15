import { NextRequest, NextResponse } from "next/server";
import { captureOrder } from "@/lib/paypal";
import { updateTrip } from "@/lib/store";

// POST /api/pay/capture { tripId, orderId } — capture an approved PayPal order.
export async function POST(req: NextRequest) {
  try {
    const { tripId, orderId } = await req.json();
    const { status } = await captureOrder(orderId);
    const trip = updateTrip(tripId, { paymentStatus: "paid" });
    return NextResponse.json({ status, trip });
  } catch (err) {
    console.error("pay/capture:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
