import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/require-admin-api";
import { withDatabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const integration = await withDatabase(async (db) => {
      return db.collection("integrations").findOne(
        {
          provider: "mercadolibre",
        },
        {
          projection: {
            _id: 0,
            provider: 1,
            userId: 1,
            accessToken: 1,
            refreshToken: 1,
            expiresAt: 1,
          },
        }
      );
    });

    const hasAccessToken =
      typeof integration?.accessToken === "string" &&
      integration.accessToken.length > 0;

    const hasRefreshToken =
      typeof integration?.refreshToken === "string" &&
      integration.refreshToken.length > 0;

    const expiresAt =
      integration?.expiresAt instanceof Date
        ? integration.expiresAt
        : integration?.expiresAt
          ? new Date(integration.expiresAt)
          : null;

    const connected =
      hasAccessToken &&
      (!expiresAt || expiresAt.getTime() > Date.now());

    const expired =
      hasAccessToken &&
      !!expiresAt &&
      expiresAt.getTime() <= Date.now() &&
      hasRefreshToken;

    const response = NextResponse.json({
      success: true,
      connected,
      expired,
      userId: integration?.userId ?? null,
      expiresAt: expiresAt?.toISOString() ?? null,
    });

    await auth.refreshCookie(response);

    return response;
  } catch (error) {
    console.error(
      "MercadoLibre status error:",
      error
    );

    const response = NextResponse.json(
      {
        success: false,
        error:
          "Could not determine MercadoLibre connection status",
      },
      {
        status: 500,
      }
    );

    await auth.refreshCookie(response);

    return response;
  }
}