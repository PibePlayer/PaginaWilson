import {
  NextRequest,
  NextResponse,
} from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";
import {
  syncMercadoLibreProducts,
  type MercadoLibreSyncOptions,
} from "@/lib/mercadolibre-sync";

export async function POST(
  request: NextRequest
) {
  const auth = await requireAdminApi(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    let body: MercadoLibreSyncOptions = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const result =
      await syncMercadoLibreProducts({
        prices: body.prices === true,
        descriptions:
          body.descriptions === true,
        discounts:
          body.discounts === true,

        images:
          body.images === true,
        stock:
          body.stock === true,
        productInfo:
          body.productInfo === true,
        category:
          body.category === true,
        attributes:
          body.attributes === true,

        quick:
          body.quick === true,

        missingDescriptionsOnly:
          body.missingDescriptionsOnly === true,
      });

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