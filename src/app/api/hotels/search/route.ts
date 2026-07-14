import { NextRequest, NextResponse } from "next/server";
import { searchHotels } from "@/lib/sabre";

// POST /api/hotels/search { cityCode, checkIn, checkOut }
export async function POST(req: NextRequest) {
  try {
    const params = await req.json();
    const hotels = await searchHotels(params);
    return NextResponse.json({ hotels });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 501 });
  }
}
