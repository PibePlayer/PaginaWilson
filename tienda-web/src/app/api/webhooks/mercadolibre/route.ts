import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";

import { withDatabase } from "@/lib/db";
import { mercadoLibreFetch } from "@/lib/mercadolibre";
import type { Product } from "@/types/product";

interface MercadoLibreNotification {
  _id?: string;
  resource?: string;
  user_id?: number;
  topic?: string;
  application_id?: number;
}

interface MercadoLibreSalePrice {
  amount: number;
  regular_amount: number | null;
  currency_id: string;
}

async function processPriceNotification(
  meliId: string
) {
  try {
    /*
     * Consultamos el precio efectivo que ve
     * el comprador en MercadoLibre.
     *
     * Esto contempla promociones y campañas
     * como Cyber Monday.
     */
    const salePrice =
      await mercadoLibreFetch<MercadoLibreSalePrice>(
        `/items/${encodeURIComponent(
          meliId
        )}/sale_price?context=channel_marketplace`
      );

    await withDatabase(async (db) => {
      const productsCollection =
        db.collection<Product>("products");

      const product =
        await productsCollection.findOne({
          meliId,
        });

      if (!product) {
        console.log(
          `MercadoLibre price notification ignored: ${meliId} is not in the store`
        );

        return;
      }

      /*
       * Si existe una promoción:
       *
       * regular_amount = precio original
       * amount         = precio efectivo
       *
       * Si no existe promoción, usamos amount
       * como precio regular.
       */
      const regularPrice =
        salePrice.regular_amount ??
        salePrice.amount;

      await productsCollection.updateOne(
        {
          meliId,
        },
        {
          $set: {
            meliPrice:
              regularPrice,

            meliDiscountedPrice:
              salePrice.amount,

            currencyId:
              salePrice.currency_id,

            updatedAt:
              new Date(),
          },
        }
      );

      console.log(
        `MercadoLibre price updated: ${meliId}`,
        {
          meliPrice:
            regularPrice,

          meliDiscountedPrice:
            salePrice.amount,
        }
      );
    });
  } catch (error) {
    /*
     * La respuesta al webhook ya fue enviada.
     * El error queda registrado en los logs.
     */
    console.error(
      `MercadoLibre price processing error: ${meliId}`,
      error
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const notification =
      (await request.json()) as MercadoLibreNotification;

    console.log(
      "MercadoLibre notification:",
      notification
    );

    /*
     * Por ahora procesamos únicamente
     * cambios de precio.
     */
    if (
      notification.topic !==
      "items_prices"
    ) {
      return NextResponse.json({
        success: true,
        ignored: true,
      });
    }

    const resource =
      notification.resource;

    if (!resource) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing notification resource",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * MercadoLibre envía recursos como:
     *
     * /items/MLA123456789
     */
    const match =
      resource.match(
        /^\/items\/([^/]+)/
      );

    if (!match) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid MercadoLibre resource",
        },
        {
          status: 400,
        }
      );
    }

    const meliId = match[1];

    /*
     * Programamos el procesamiento para después
     * de enviar la respuesta.
     *
     * Esto permite que MercadoLibre reciba el
     * 200 rápidamente mientras la actualización
     * continúa en segundo plano.
     */
    after(() =>
      processPriceNotification(meliId)
    );

    return NextResponse.json({
      success: true,
      meliId,
      processed: true,
    });
  } catch (error) {
    console.error(
      "MercadoLibre webhook error:",
      error
    );

    /*
     * Si la notificación no pudo procesarse,
     * mantenemos la respuesta 200 para evitar
     * reintentos indefinidos.
     */
    return NextResponse.json({
      success: true,
      processed: false,
    });
  }
}