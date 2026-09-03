import {
  NextRequest,
  NextResponse,
} from "next/server";

import { withDatabase } from "@/lib/db";

import {
  ADMIN_COOKIE_NAME,
  createAdminSession,
  createAdminSessionCookie,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!verifyAdminPassword(password)) {
      return NextResponse.json(
        {
          success: false,
          error: "Contraseña incorrecta.",
        },
        {
          status: 401,
        }
      );
    }

    const session = await withDatabase(
      async (db) =>
        createAdminSession(db)
    );

    const response =
      NextResponse.json({
        success: true,
      });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: createAdminSessionCookie(
        session.token,
        session.expiresAt
      ),
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(
        session.expiresAt * 1000
      ),
    });

    return response;
  } catch (error) {
    console.error(
      "Admin login error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "No se pudo iniciar sesión.",
      },
      {
        status: 500,
      }
    );
  }
}