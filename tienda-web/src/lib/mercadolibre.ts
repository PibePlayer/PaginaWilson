import { getDatabase } from "@/lib/db";

const ML_API_URL = "https://api.mercadolibre.com";

type MercadoLibreIntegration = {
  provider: "mercadolibre";
  userId: number;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  updatedAt: Date;
};

type MercadoLibreTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
};

export async function getMercadoLibreIntegration(): Promise<MercadoLibreIntegration> {
  const db = await getDatabase();

  const integration = await db.collection<MercadoLibreIntegration>(
    "integrations"
  ).findOne({
    provider: "mercadolibre",
  });

  if (!integration) {
    throw new Error("MercadoLibre is not connected");
  }

  return integration;
}

async function refreshMercadoLibreToken(
  integration: MercadoLibreIntegration
): Promise<string> {
  const clientId = process.env.MERCADOLIBRE_CLIENT_ID;
  const clientSecret = process.env.MERCADOLIBRE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("MercadoLibre OAuth credentials are not configured");
  }

  const response = await fetch(`${ML_API_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integration.refreshToken,
    }),
  });

  const data = (await response.json()) as Partial<MercadoLibreTokenResponse>;

  if (!response.ok || !data.access_token || !data.refresh_token) {
    console.error("MercadoLibre refresh token error:", {
      status: response.status,
      data,
    });

    throw new Error("Could not refresh MercadoLibre token");
  }

  const db = await getDatabase();

  await db.collection<MercadoLibreIntegration>("integrations").updateOne(
    {
      provider: "mercadolibre",
      userId: integration.userId,
    },
    {
      $set: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(
          Date.now() + (data.expires_in ?? 0) * 1000
        ),
        updatedAt: new Date(),
      },
    }
  );

  return data.access_token;
}

export async function getValidMercadoLibreAccessToken(): Promise<string> {
  const integration = await getMercadoLibreIntegration();

  // Renovamos con un margen de seguridad de 5 minutos.
  const expiresSoon =
    integration.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;

  if (!expiresSoon) {
    return integration.accessToken;
  }

  return refreshMercadoLibreToken(integration);
}

export async function mercadoLibreFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const accessToken = await getValidMercadoLibreAccessToken();

  const response = await fetch(`${ML_API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `MercadoLibre API error ${response.status}: ${errorText}`
    );
  }

  return response.json() as Promise<T>;
}