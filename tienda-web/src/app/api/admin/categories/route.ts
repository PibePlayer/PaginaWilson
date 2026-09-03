import {
  NextRequest,
  NextResponse,
} from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";
import { withDatabase } from "@/lib/db";
import type { Category } from "@/types/category";

export async function GET(
  request: NextRequest
) {
  const auth =
    await requireAdminApi(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const categories =
      await withDatabase(async (db) =>
        db
          .collection<Category>("categories")
          .find({})
          .sort({
            meliName: 1,
          })
          .toArray()
      );

    const response =
      NextResponse.json({
        success: true,
        categories: categories.map(
          (category) => ({
            categoryId:
              category.categoryId,
            meliName:
              category.meliName,
            name:
              category.name,
          })
        ),
      });

    await auth.refreshCookie(response);

    return response;
  } catch (error) {
    console.error(
      "Admin categories GET error:",
      error
    );

    const response =
      NextResponse.json(
        {
          success: false,
          error:
            "No se pudieron cargar las categorías.",
        },
        {
          status: 500,
        }
      );

    await auth.refreshCookie(response);

    return response;
  }
}

export async function PATCH(
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

    const categoryId =
      typeof body.categoryId === "string"
        ? body.categoryId.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    if (!categoryId || !name) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El ID y nombre de categoría son obligatorios.",
        },
        {
          status: 400,
        }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El nombre de categoría es demasiado largo.",
        },
        {
          status: 400,
        }
      );
    }

    await withDatabase(async (db) => {
      await db
        .collection<Category>("categories")
        .updateOne(
          {
            categoryId,
          },
          {
            $set: {
              name,
              updatedAt:
                new Date(),
            },
          }
        );
    });

    const response =
      NextResponse.json({
        success: true,
        categoryId,
        name,
      });

    await auth.refreshCookie(response);

    return response;
  } catch (error) {
    console.error(
      "Admin category PATCH error:",
      error
    );

    const response =
      NextResponse.json(
        {
          success: false,
          error:
            "No se pudo actualizar la categoría.",
        },
        {
          status: 500,
        }
      );

    await auth.refreshCookie(response);

    return response;
  }
}