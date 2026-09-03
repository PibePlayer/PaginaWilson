import {
  NextRequest,
  NextResponse,
} from "next/server";

import { withDatabase } from "@/lib/db";

import {
  ADMIN_COOKIE_NAME,
  deleteAdminSession,
  readAdminSessionCookie,
} from "@/lib/admin-auth";

export async function POST(
  request: NextRequest
) {
  try {
    const cookie =
      request.cookies.get(
        ADMIN_COOKIE_NAME
      )?.value;

    const session =
      readAdminSessionCookie(cookie);

    if (session) {
      await withDatabase(
        async (db) =>
          deleteAdminSession(
            db,
            session.token
          )
      );
    }

    const response =
      NextResponse.redirect(
        new URL("/", request.url),
        303
      );

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error(
      "Admin logout error:",
      error
    );

    const response =
      NextResponse.redirect(
        new URL("/", request.url),
        303
      );

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });

    return response;
  }
}