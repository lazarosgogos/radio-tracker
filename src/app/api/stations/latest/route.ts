import { NextResponse } from "next/server";
import { getStationSummaries } from "@/lib/site-data";

export async function GET() {
  const payload = await getStationSummaries();

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
