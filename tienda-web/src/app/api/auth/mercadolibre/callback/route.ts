import { NextRequest, NextResponse } from "next/server";
import { withDatabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.json(
      {
        error: "MercadoLibre authorization failed",
        details: error,
      },
      { status: 400 }
    );
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing authorization code or state" },
      { status: 400 }
    );
  }

  const savedState = request.cookies.get("ml_oauth_state")?.value;
  const codeVerifier = request.cookies.get("ml_code_verifier")?.value;

console.log("OAuth state:", {
  received: state,
  saved: savedState,
  hasVerifier: !!codeVerifier,
});

  if (!savedState || state !== savedState) {
    return NextResponse.json(
      { error: "Invalid OAuth state" },
      { status: 400 }
    );
  }

  if (!codeVerifier) {
    return NextResponse.json(
      { error: "Missing PKCE code verifier" },
      { status: 400 }
    );
  }

  const clientId = process.env.MERCADOLIBRE_CLIENT_ID;
  const clientSecret = process.env.MERCADOLIBRE_CLIENT_SECRET;
  const redirectUri = process.env.MERCADOLIBRE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: "MercadoLibre OAuth is not configured" },
      { status: 500 }
    );
  }

  const tokenResponse = await fetch(
    "https://api.mercadolibre.com/oauth/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    }
  );

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    console.error("MercadoLibre token error:", tokenData);

    return NextResponse.json(
      {
        error: "Could not obtain MercadoLibre token",
      },
      { status: 500 }
    );
  }

  await withDatabase(async (db) => {
    await db.collection("integrations").updateOne(
      {
        provider: "mercadolibre",
        userId: tokenData.user_id,
      },
      {
        $set: {
          provider: "mercadolibre",
          userId: tokenData.user_id,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: new Date(
            Date.now() + tokenData.expires_in * 1000
          ),
          updatedAt: new Date(),
        },
      },
      {
        upsert: true,
      }
    );
  });

  return NextResponse.json({
    success: true,
    message: "MercadoLibre authorization successful",
    user_id: tokenData.user_id,
    expires_in: tokenData.expires_in,
  });
}
