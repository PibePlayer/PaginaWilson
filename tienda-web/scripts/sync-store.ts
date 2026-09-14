import {
  syncMercadoLibreProducts,
} from "../src/lib/mercadolibre-sync";

import {
  syncCatalogKv,
} from "./sync-catalog-kv";

async function main() {
  const start =
    performance.now();

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "       SYNC COMPLETO DEL STORE"
  );
  console.log(
    "========================================"
  );
  console.log("");

  console.log(
    `[STORE SYNC] MongoDB DB: ${
      process.env.MONGODB_DB_NAME
    }`
  );

  /*
   * ========================================
   * 1. MERCADOLIBRE → MONGODB
   * ========================================
   */

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "   PASO 1/2 — MERCADOLIBRE → MONGODB"
  );
  console.log(
    "========================================"
  );
  console.log("");

  const meliStart =
    performance.now();

  const meliResult =
    await syncMercadoLibreProducts({
      prices: true,
      descriptions: true,
      discounts: true,
      images: true,
      stock: true,
      productInfo: true,
      category: true,
      attributes: true,
    });

  console.log("");

  console.log(
    `[STORE SYNC] MercadoLibre → MongoDB terminado en ${(
      performance.now() -
      meliStart
    ).toFixed(1)} ms`
  );

  console.log(
    "[STORE SYNC] Resultado MercadoLibre:"
  );

  console.log(
    meliResult
  );

  /*
   * ========================================
   * 2. MONGODB → CLOUDFLARE KV
   * ========================================
   */

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "   PASO 2/2 — MONGODB → CLOUDFLARE KV"
  );
  console.log(
    "========================================"
  );
  console.log("");

  const kvStart =
    performance.now();

  await syncCatalogKv();

  console.log("");

  console.log(
    `[STORE SYNC] MongoDB → KV terminado en ${(
      performance.now() -
      kvStart
    ).toFixed(1)} ms`
  );

  /*
   * ========================================
   * FINAL
   * ========================================
   */

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "       SYNC COMPLETO FINALIZADO"
  );
  console.log(
    "========================================"
  );

  console.log(
    `[STORE SYNC] Tiempo total: ${(
      performance.now() -
      start
    ).toFixed(1)} ms`
  );

  console.log(
    "========================================"
  );
}

main().catch(
  (error) => {
    console.error("");
    console.error(
      "========================================"
    );
    console.error(
      "       ERROR EN SYNC DEL STORE"
    );
    console.error(
      "========================================"
    );
    console.error(error);

    process.exit(1);
  }
);