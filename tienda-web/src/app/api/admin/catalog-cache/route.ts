import {
  NextRequest,
  NextResponse,
} from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";
import {
  getCachedCatalogProducts,
  rebuildCatalogProducts,
  invalidateCatalogProducts,
} from "@/lib/catalog-cache";

export async function GET(
  request: NextRequest
) {
  const auth = await requireAdminApi(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const products =
      await getCachedCatalogProducts();

    const response = NextResponse.json({
      success: true,
      exists: products !== null,
      count: products?.length ?? 0,
      products: products ?? [],
    });

    await auth.refreshCookie(response);

    return response;
  } catch (error) {
    console.error(
      "Catalog cache GET error:",
      error
    );

    const response = NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to read catalog cache",
      },
      {
        status: 500,
      }
    );

    await auth.refreshCookie(response);

    return response;
  }
}

export async function POST(
  request: NextRequest
) {
  const auth = await requireAdminApi(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const products =
      await rebuildCatalogProducts();

    const response = NextResponse.json({
      success: true,
      count: products.length,
      message:
        "Catalog cache rebuilt successfully",
    });

    await auth.refreshCookie(response);

    return response;
  } catch (error) {
    console.error(
      "Catalog cache POST error:",
      error
    );

    const response = NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to rebuild catalog cache",
      },
      {
        status: 500,
      }
    );

    await auth.refreshCookie(response);

    return response;
  }
}

export async function DELETE(
  request: NextRequest
) {
  const auth = await requireAdminApi(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    await invalidateCatalogProducts();

    const response = NextResponse.json({
      success: true,
      message:
        "Catalog cache invalidated successfully",
    });

    await auth.refreshCookie(response);

    return response;
  } catch (error) {
    console.error(
      "Catalog cache DELETE error:",
      error
    );

    const response = NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to invalidate catalog cache",
      },
      {
        status: 500,
      }
    );

    await auth.refreshCookie(response);

    return response;
  }
}