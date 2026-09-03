import {
  NextRequest,
  NextResponse,
} from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";
import { syncMercadoLibreProducts } from "@/lib/mercadolibre-sync";

export async function POST(
  request: NextRequest
) {
  const auth =
    await requireAdminApi(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const result =
      await syncMercadoLibreProducts();

    const response =
      NextResponse.json({
        success: true,
        ...result,
      });

    await auth.refreshCookie(response);

    return response;
  } catch (error) {
    console.error(
      "MercadoLibre sync error:",
      error
    );

    const response =
      NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Synchronization failed",
        },
        {
          status: 500,
        }
      );

    await auth.refreshCookie(response);

    return response;
  }
}