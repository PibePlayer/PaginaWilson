import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const clientId = process.env.MERCADOLIBRE_CLIENT_ID;
  const redirectUri = process.env.MERCADOLIBRE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "MercadoLibre OAuth is not configured" },
      { status: 500 }
    );
  }

  // PKCE
  const codeVerifier = crypto.randomBytes(32).toString("base64url");

  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  const state = crypto.randomBytes(32).toString("hex");

  const response = NextResponse.redirect(
    new URL(
      `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${encodeURIComponent(
        clientId
      )}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&code_challenge=${encodeURIComponent(
        codeChallenge
      )}&code_challenge_method=S256&state=${encodeURIComponent(state)}`
    )
  );

  // Guardamos temporalmente los valores necesarios para validar el callback.
  response.cookies.set("ml_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  response.cookies.set("ml_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}