import { NextResponse } from "next/server";
import { syncMercadoLibreProducts } from "@/lib/mercadolibre-sync";

export async function GET() {
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