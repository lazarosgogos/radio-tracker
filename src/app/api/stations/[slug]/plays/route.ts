import { NextResponse } from "next/server";
import { getStationArchive } from "@/lib/site-data";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const payload = await getStationArchive(slug);

  return NextResponse.json(payload, {
    status: payload.station ? 200 : 404,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
