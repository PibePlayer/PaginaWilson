import { NextRequest, NextResponse } from "next/server";
import { syncMercadoLibreProducts } from "@/lib/mercadolibre-sync";

export async function POST(request: NextRequest) {
  const syncSecret = process.env.ADMIN_SYNC_SECRET;
  const authorization = request.headers.get("authorization");

  if (!syncSecret) {
    console.error("ADMIN_SYNC_SECRET is not configured");

    return NextResponse.json(
      { success: false, error: "Synchronization is not configured" },
      { status: 503 }
    );
  }

  if (authorization !== `Bearer ${syncSecret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const result = await syncMercadoLibreProducts();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("MercadoLibre sync error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Synchronization failed",
      },
      { status: 500 }
    );
  }
}
