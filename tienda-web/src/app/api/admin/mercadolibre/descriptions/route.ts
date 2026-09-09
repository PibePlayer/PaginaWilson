import {
  NextRequest,
  NextResponse,
} from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";
import {
  getProductDescriptionStats,
} from "@/lib/mercadolibre-sync";

export async function GET(
  request: NextRequest
) {
  const auth =
    await requireAdminApi(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const stats =
      await getProductDescriptionStats();

    const response =
      NextResponse.json({
        success: true,
        stats,
      });

    await auth.refreshCookie(
      response
    );

    return response;
  } catch (error) {
    console.error(
      "Description stats error:",
      error
    );

    const response =
      NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not load description statistics",
        },
        {
          status: 500,
        }
      );

    await auth.refreshCookie(
      response
    );

    return response;
  }
}