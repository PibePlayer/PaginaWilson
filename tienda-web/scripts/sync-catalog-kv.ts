import { execFileSync } from "node:child_process";
import {
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { createMongoClient } from "../src/lib/mongodb";
import { getMeliDiscountPercent } from "../src/lib/settings";

import type { Product } from "../src/types/product";

const DB_NAME = process.env.MONGODB_DB_NAME;

if (!DB_NAME) {
  throw new Error(
    "MONGODB_DB_NAME no está definido"
  );
}

const CATALOG_PRODUCTS_KEY =
  "catalog:products";

const CATALOG_DISCOUNT_KEY =
  "catalog:discount";

const KV_BINDING = "CATALOG_CACHE";

/**
 * Detecta si estamos ejecutando Wrangler contra
 * un environment específico.
 *
 * Ejemplo:
 *
 * npm run sync:kv:sogue
 * → environment por defecto (SOGUE)
 *
 * npm run sync:kv:clickspro
 * → --env clickspro
 */
function getWranglerEnvArgs(): string[] {
  const envIndex =
    process.argv.indexOf("--env");

  if (
    envIndex !== -1 &&
    process.argv[envIndex + 1]
  ) {
    return [
      "--env",
      process.argv[envIndex + 1],
    ];
  }

  return [];
}

function getWranglerPath() {
  return process.platform === "win32"
    ? ".\\node_modules\\.bin\\wrangler.cmd"
    : "./node_modules/.bin/wrangler";
}

function runWrangler(
  args: string[]
) {
  const wrangler =
    getWranglerPath();

  const envArgs =
    getWranglerEnvArgs();

  execFileSync(
    wrangler,
    [
      ...args,
      ...envArgs,
    ],
    {
      stdio: "inherit",
      shell:
        process.platform === "win32",
    }
  );
}

export async function syncCatalogKv() {
  const start = performance.now();

  console.log(
    "========================================"
  );
  console.log(
    "   SYNC CATÁLOGO → CLOUDFLARE KV"
  );
  console.log(
    "========================================"
  );

  const wranglerEnvArgs =
    getWranglerEnvArgs();

  if (wranglerEnvArgs.length > 0) {
    console.log(
      `[SYNC] Wrangler environment: ${wranglerEnvArgs[1]}`
    );
  } else {
    console.log(
      "[SYNC] Wrangler environment: default (SOGUE)"
    );
  }

  console.log(
    `[SYNC] MongoDB database: ${DB_NAME}`
  );

  const client =
    createMongoClient();

  try {
    /*
     * ========================================
     * MONGODB
     * ========================================
     */

    console.log(
      "[SYNC] Conectando a MongoDB..."
    );

    const connectStart =
      performance.now();

    await client.connect();

    console.log(
      `[SYNC] MongoDB conectado en ${(
        performance.now() -
        connectStart
      ).toFixed(1)} ms`
    );

    const db =
      client.db(DB_NAME);

    console.log(
      "[SYNC] Obteniendo productos y descuento..."
    );

    const queryStart =
      performance.now();

    const [
      products,
      discountPercent,
    ] = await Promise.all([
      db
        .collection<Product>("products")
        .find({
          visible: true,
        })
        .sort({
          featured: -1,
          featuredOrder: 1,
          updatedAt: -1,
        })
        .toArray(),

      getMeliDiscountPercent(db),
    ]);

    console.log(
      `[SYNC] MongoDB respondió en ${(
        performance.now() -
        queryStart
      ).toFixed(1)} ms`
    );

    console.log(
      `[SYNC] Productos visibles: ${products.length}`
    );

    console.log(
      `[SYNC] Descuento global: ${discountPercent}%`
    );

    /*
     * ========================================
     * SERIALIZACIÓN
     * ========================================
     */

    const serializedProducts =
      products.map((product) => ({
        ...product,

        updatedAt:
          product.updatedAt.toISOString(),
      }));

    const productsJson =
      JSON.stringify(
        serializedProducts
      );

    console.log(
      `[SYNC] Tamaño catalog:products: ${(
        Buffer.byteLength(
          productsJson
        ) / 1024
      ).toFixed(1)} KB`
    );

    /*
     * ========================================
     * CATALOG:PRODUCTS
     * ========================================
     */

    console.log(
      "[SYNC] Subiendo catalog:products a Cloudflare KV..."
    );

    const productsPutStart =
      performance.now();

    const tempFile =
      path.join(
        process.cwd(),
        ".catalog-products-kv.json"
      );

    writeFileSync(
      tempFile,
      productsJson,
      "utf8"
    );

    try {
      runWrangler([
        "kv",
        "key",
        "put",
        CATALOG_PRODUCTS_KEY,
        `--path=${tempFile}`,
        `--binding=${KV_BINDING}`,
        "--remote",
      ]);
    } finally {
      try {
        unlinkSync(tempFile);
      } catch {
        // El archivo puede no existir
        // si Wrangler falló antes.
      }
    }

    console.log(
      `[SYNC] catalog:products actualizado en ${(
        performance.now() -
        productsPutStart
      ).toFixed(1)} ms`
    );

    /*
     * ========================================
     * CATALOG:DISCOUNT
     * ========================================
     */

    console.log(
      "[SYNC] Subiendo catalog:discount a Cloudflare KV..."
    );

    const discountPutStart =
      performance.now();

    runWrangler([
      "kv",
      "key",
      "put",
      CATALOG_DISCOUNT_KEY,
      String(discountPercent),
      `--binding=${KV_BINDING}`,
      "--remote",
    ]);

    console.log(
      `[SYNC] catalog:discount actualizado en ${(
        performance.now() -
        discountPutStart
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
      "   SYNC CATÁLOGO COMPLETADO"
    );
    console.log(
      "========================================"
    );

    console.log(
      `[SYNC] Productos: ${products.length}`
    );

    console.log(
      `[SYNC] Descuento: ${discountPercent}%`
    );

    console.log(
      `[SYNC] Tiempo total: ${(
        performance.now() -
        start
      ).toFixed(1)} ms`
    );

    console.log(
      "========================================"
    );
  } finally {
    await client.close(true);

    console.log(
      "[SYNC] Conexión MongoDB cerrada."
    );
  }
}

/*
 * Permite ejecutar este archivo directamente:
 *
 * tsx scripts/sync-catalog-kv.ts
 *
 * o:
 *
 * tsx scripts/sync-catalog-kv.ts --env clickspro
 */
const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(
      new URL(import.meta.url).pathname
    );

if (isDirectExecution) {
  syncCatalogKv().catch(
    (error) => {
      console.error("");
      console.error(
        "========================================"
      );
      console.error(
        "   ERROR EN SYNC"
      );
      console.error(
        "========================================"
      );
      console.error(error);

      process.exit(1);
    }
  );
}