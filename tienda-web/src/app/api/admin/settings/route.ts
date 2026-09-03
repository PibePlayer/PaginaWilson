import {
  NextRequest,
  NextResponse,
} from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";
import { withDatabase } from "@/lib/db";
import {
  getMeliDiscountPercent,
  setMeliDiscountPercent,
} from "@/lib/settings";

export async function GET(
  request: NextRequest
) {
  const auth =
    await requireAdminApi(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const discountPercent =
      await withDatabase(
        async (db) =>
          getMeliDiscountPercent(db)
      );

    const response =
      NextResponse.json({
        success: true,
        discountPercent,
      });

    await auth.refreshCookie(response);

    return response;
  } catch (error) {
    console.error(
      "Admin settings GET error:",
      error
    );

    const response =
      NextResponse.json(
        {
          success: false,
          error:
            "No se pudo obtener la configuración.",
        },
        {
          status: 500,
        }
      );

    await auth.refreshCookie(response);

    return response;
  }
}

export async function PUT(
  request: NextRequest
) {
  const auth =
    await requireAdminApi(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body =
      await request.json();

    const discountPercent =
      Number(body.discountPercent);

    if (
      !Number.isFinite(
        discountPercent
      ) ||
      discountPercent < 0 ||
      discountPercent > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El descuento debe estar entre 0 y 100.",
        },
        {
          status: 400,
        }
      );
    }

    await withDatabase(
      async (db) =>
        setMeliDiscountPercent(
          db,
          discountPercent
        )
    );

    const response =
      NextResponse.json({
        success: true,
        discountPercent,
      });

    await auth.refreshCookie(response);

    return response;
  } catch (error) {
    console.error(
      "Admin settings PUT error:",
      error
    );

    const response =
      NextResponse.json(
        {
          success: false,
          error:
            "No se pudo guardar la configuración.",
        },
        {
          status: 500,
        }
      );

    await auth.refreshCookie(response);

    return response;
  }
}