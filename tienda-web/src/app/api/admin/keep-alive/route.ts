import {
  NextRequest,
  NextResponse,
} from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";

export async function POST(
  request: NextRequest
) {
  const auth =
    await requireAdminApi(request);

  if (!auth.authorized) {
    return auth.response;
  }

  const response =
    NextResponse.json({
      success: true,
    });

  await auth.refreshCookie(response);

  return response;
}