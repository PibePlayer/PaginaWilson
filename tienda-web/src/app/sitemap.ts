import type { MetadataRoute } from "next";

import { withDatabase } from "@/lib/db";
import type { Product } from "@/types/product";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://sogue.com.ar";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getProductUrl(product: {
  title: string;
  meliId: string;
}): string {
  return `/productos/${slugify(
    product.title
  )}-${product.meliId}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await withDatabase(async (db) => {
    return db
      .collection<Product>("products")
      .find({
        visible: true,
      })
      .project<
        Pick<Product, "title" | "meliId" | "updatedAt">
      >({
        title: 1,
        meliId: 1,
        updatedAt: 1,
      })
      .toArray();
  });

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/productos`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/nosotros`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/contacto`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/como-comprar`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/servicio-tecnico`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/arrepentimiento`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const productPages: MetadataRoute.Sitemap =
    products.map((product) => ({
      url: `${SITE_URL}${getProductUrl(product)}`,
      lastModified: product.updatedAt,
      changeFrequency: "daily",
      priority: 0.8,
    }));

  return [
    ...staticPages,
    ...productPages,
  ];
}