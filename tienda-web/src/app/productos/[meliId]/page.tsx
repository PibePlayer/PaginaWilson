import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ProductGallery from "../../../components/ProductGallery";

import { withDatabase } from "@/lib/db";
import { calculateWebPrice } from "@/lib/pricing";
import { getMeliDiscountPercent } from "@/lib/settings";
import type {
  Product,
  ProductAttribute,
} from "@/types/product";

interface ProductPageProps {
  params: Promise<{
    meliId: string;
  }>;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://sogue.com.ar";

const HIDDEN_ATTRIBUTE_IDS = new Set([
  // Datos internos / administrativos
  "SYI_PYMES_ID",

  // Datos fiscales
  "IMPORT_DUTY",
  "VALUE_ADDED_TAX",

  // Identificadores que no aportan a la ficha visible
  "GTIN",

  // Estado interno del ítem
  "ITEM_CONDITION",

  // Packaging / logística
  "PACKAGE_DATA_SOURCE",
  "PACKAGE_HEIGHT",
  "PACKAGE_LENGTH",
  "PACKAGE_WEIGHT",
  "PACKAGE_WIDTH",
  "SELLER_PACKAGE_HEIGHT",
  "SELLER_PACKAGE_LENGTH",
  "SELLER_PACKAGE_WEIGHT",
  "SELLER_PACKAGE_WIDTH",
  "HAZMAT_TRANSPORTABILITY",

  // Datos poco útiles para el comprador
  "OPERATING_TEMPERATURE",
  "STORAGE_TEMPERATURE",

  // Atributos comerciales / de catalogación que no queremos mostrar
  "GIFTABLE",
  "FREQUENTLY_PLAYED",
  "OS_EDITION",
]);

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getProductUrl(
  product: Product
): string {
  return `${SITE_URL}/productos/${slugify(
    product.title
  )}-${product.meliId}`;
}

function extractMeliId(
  routeParam: string
): string {
  const decoded = decodeURIComponent(
    routeParam
  );

  const match = decoded.match(
    /-([A-Za-z]{2,5}\d+)$/
  );

  if (match) {
    return match[1];
  }

  return decoded;
}

function getAttributeValue(
  attributes: ProductAttribute[] | undefined,
  ids: string[]
): string | undefined {
  if (!attributes) {
    return undefined;
  }

  const normalizedIds = ids.map((id) =>
    id.toLowerCase()
  );

  const attribute = attributes.find((item) =>
    normalizedIds.includes(
      item.id.toLowerCase()
    )
  );

  return (
    attribute?.value_name ??
    undefined
  );
}

function cleanDescription(
  description: string | undefined,
  fallback: string
): string {
  if (!description?.trim()) {
    return fallback;
  }

  const text = description
    .replace(/\r\n/g, "\n")
    .trim();

  // Descripción limpia: conservarla completa.
  const hasSellerContent =
    /PREGUNTAS\s+FRECUENTES\s*:?/i.test(text) ||
    /SOMOS\s+(?:SOGUE|LEGADO)/i.test(text) ||
    /MERCADOLIBRE\s+PLATINUM/i.test(text);

  if (!hasSellerContent) {
    return text;
  }

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) =>
      paragraph
        .replace(/-{5,}/g, "")
        .replace(/¯{5,}/g, "")
        .trim()
    )
    .filter(Boolean);

  const isEditorialParagraph = (paragraph: string): boolean => {
    const normalized = paragraph
      .replace(/\s+/g, " ")
      .trim();

    if (normalized.length < 120) {
      return false;
    }

    if (
      /^(?:CARACTERISTICAS|CARACTERÍSTICAS|ESPECIFICACIONES|PRODUCTO|GRÁFICOS|GRAFICOS|CONECTIVIDAD|PUERTOS|PESO|SEGURIDAD)\s*:?\s*$/i.test(
        normalized
      )
    ) {
      return false;
    }

    if (
      /^(?:Procesador|Memoria|RAM|Disco|Disco rígido|Pantalla|Wi-?Fi|Bluetooth|Sistema Operativo|Idioma|Puertos|Peso|Batería|Cámara|Mouse|Teclado|Placa Gráfica|Video)\s*:/i.test(
        normalized
      )
    ) {
      return false;
    }

    return true;
  };

  const faqIndex = paragraphs.findIndex((paragraph) =>
    /PREGUNTAS\s+FRECUENTES\s*:?\s*$/i.test(paragraph)
  );

  if (faqIndex >= 0) {
    const afterFaq = paragraphs.slice(faqIndex + 1);

    const editorialIndex = afterFaq.findIndex(
      isEditorialParagraph
    );

    if (editorialIndex >= 0) {
      return afterFaq
        .slice(editorialIndex)
        .join("\n\n")
        .trim();
    }

    return fallback;
  }

  const editorialIndex = paragraphs.findIndex(
    isEditorialParagraph
  );

  if (editorialIndex >= 0) {
    return paragraphs
      .slice(editorialIndex)
      .join("\n\n")
      .trim();
  }

  return fallback;
}

function formatPrice(
  price: number,
  currencyId: string
): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currencyId || "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

function getAvailability(
  availableQuantity: number,
  status: string
): string {
  if (
    status !== "active" ||
    availableQuantity <= 0
  ) {
    return "https://schema.org/OutOfStock";
  }

  return "https://schema.org/InStock";
}

async function getProduct(
  meliId: string
): Promise<Product | null> {
  return withDatabase(async (db) => {
    return db
      .collection<Product>("products")
      .findOne({
        meliId,
        visible: true,
      });
  });
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { meliId: routeParam } =
    await params;

  const meliId =
    extractMeliId(routeParam);

  const product =
    await getProduct(meliId);

  if (!product) {
    return {
      title:
        "Producto no encontrado | SOGUE NOTE",
      description:
        "El producto que estás buscando no está disponible.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const productUrl =
    getProductUrl(product);

  const description =
    cleanDescription(
      product.description,
      `${product.title} en SOGUE NOTE. Consultá disponibilidad y precio por nuestra web.`
    );

  const image =
    product.pictures?.[0] ||
    product.thumbnail;

  return {
    title: `${product.title} | SOGUE NOTE`,
    description,
    alternates: {
      canonical: productUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      type: "website",
      url: productUrl,
      title: `${product.title} | SOGUE NOTE`,
      description,
      siteName: "SOGUE NOTE",
      locale: "es_AR",
      images: image
        ? [
            {
              url: image,
              alt: product.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.title} | SOGUE NOTE`,
      description,
      images: image
        ? [image]
        : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { meliId: routeParam } =
    await params;

  const meliId =
    extractMeliId(routeParam);

  const product =
    await getProduct(meliId);

  if (!product) {
    notFound();
  }

  const globalDiscount =
    await withDatabase(async (db) =>
      getMeliDiscountPercent(db)
    );

  const discountPercent =
    product.discountPercent ??
    globalDiscount;

  const currentMeliPrice =
    product.meliDiscountedPrice ??
    product.meliPrice;

  const webPrice =
    calculateWebPrice(
      currentMeliPrice,
      discountPercent
    );

  const hasMeliPromotion =
    product.meliDiscountedPrice !==
      undefined &&
    product.meliDiscountedPrice <
      product.meliPrice;

  const hasSogueDiscount =
    discountPercent > 0;

  const productUrl =
    getProductUrl(product);

  const description =
    cleanDescription(
      product.description,
      `Conocé ${product.title} en SOGUE NOTE. Consultá disponibilidad y precio por nuestra web.`
    );

  const images = Array.from(
    new Set(
      product.pictures
        ?.filter(Boolean)
        .slice(0, 8) ?? []
    )
  );

  if (
    images.length === 0 &&
    product.thumbnail
  ) {
    images.push(product.thumbnail);
  }

  const brand =
    getAttributeValue(
      product.attributes,
      [
        "BRAND",
        "BRAND_NAME",
        "MARCA",
      ]
    );

  const model =
    getAttributeValue(
      product.attributes,
      [
        "MODEL",
        "MODEL_NAME",
        "MODELO",
      ]
    );

  const availability =
    getAvailability(
      product.availableQuantity,
      product.status
    );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: images,
    description,
    sku: product.meliId,

    ...(brand
      ? {
          brand: {
            "@type": "Brand",
            name: brand,
          },
        }
      : {}),

    ...(model
      ? {
          model,
        }
      : {}),

    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency:
        product.currencyId || "ARS",
      price: webPrice,
      availability,
      itemCondition:
        "https://schema.org/NewCondition",
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Productos",
        item: `${SITE_URL}/productos`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.title,
        item: productUrl,
      },
    ],
  };

  const whatsappPhone =
    process.env.NEXT_PUBLIC_WHATSAPP_PHONE;

  const whatsappMessage =
    encodeURIComponent(
      `Hola! Quisiera consultar por ${product.title}.`
    );

  const visibleAttributes =
    (product.attributes ?? []).filter(
      (attribute) => {
        if (
          HIDDEN_ATTRIBUTE_IDS.has(
            attribute.id
          )
        ) {
          return false;
        }

        const value =
          attribute.value_name?.trim() ||
          (attribute.value_struct?.number !==
          undefined
            ? `${attribute.value_struct.number}${
                attribute.value_struct.unit
                  ? ` ${attribute.value_struct.unit}`
                  : ""
              }`
            : "");

        return Boolean(value);
      }
    );

  const attributeGroups =
    visibleAttributes.reduce<
      Record<
        string,
        ProductAttribute[]
      >
    >((groups, attribute) => {
      const group =
        attribute.attribute_group_name ||
        "Características";

      if (!groups[group]) {
        groups[group] = [];
      }

      groups[group].push(attribute);

      return groups;
    }, {});

  return (
    <main className="min-h-screen bg-zinc-100 pb-16 pt-24 font-proxima">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            jsonLd
          ).replace(
            /</g,
            "\\u003c"
          ),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd
          ).replace(
            /</g,
            "\\u003c"
          ),
        }}
      />

      <div className="mx-auto max-w-7xl px-6">
        <nav
          aria-label="Breadcrumb"
          className="mb-6 text-sm text-zinc-500"
        >
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link
                href="/"
                className="transition hover:text-zinc-950"
              >
                Inicio
              </Link>
            </li>

            <li aria-hidden="true">
              /
            </li>

            <li>
              <Link
                href="/productos"
                className="transition hover:text-zinc-950"
              >
                Productos
              </Link>
            </li>

            <li aria-hidden="true">
              /
            </li>

            <li className="font-bold text-zinc-900">
              {product.title}
            </li>
          </ol>
        </nav>

        <article>
          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
              <div className="border-b border-zinc-200 lg:border-b-0 lg:border-r">
                <ProductGallery
                  images={images}
                  title={product.title}
                />
              </div>

              <div className="flex flex-col p-6 sm:p-8 lg:p-10">
                {product.categoryName && (
                  <p className="text-sm font-bold uppercase tracking-wide text-emerald-600">
                    {product.categoryName}
                  </p>
                )}

                <h1 className="mt-2 text-2xl font-bold leading-tight text-zinc-950 sm:text-3xl lg:text-4xl">
                  {product.title}
                </h1>

                {brand && (
                  <p className="mt-3 text-sm font-bold text-zinc-500">
                    {brand}
                    {model
                      ? ` · ${model}`
                      : ""}
                  </p>
                )}

                <div className="mt-8">
                  {hasMeliPromotion && (
                    <p className="text-lg font-bold text-zinc-400 line-through">
                      {formatPrice(
                        product.meliPrice,
                        product.currencyId
                      )}
                    </p>
                  )}

                  {hasSogueDiscount && (
                    <div className="mt-2 inline-flex rounded-full bg-emerald-600 px-3 py-1 text-sm font-bold text-white">
                      -{discountPercent}%
                    </div>
                  )}

                  <p className="mt-2 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
                    {formatPrice(
                      webPrice,
                      product.currencyId
                    )}
                  </p>

                  {hasSogueDiscount && (
                    <p className="mt-2 text-sm font-bold text-zinc-500">
                      Precio especial comprando por nuestra web.
                    </p>
                  )}

                  {!hasSogueDiscount &&
                    hasMeliPromotion && (
                      <p className="mt-2 text-sm font-bold text-zinc-500">
                        Precio actual de MercadoLibre.
                      </p>
                    )}
                </div>

                <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-sm font-bold text-zinc-700">
                    {product.availableQuantity > 0
                      ? `Stock disponible: ${product.availableQuantity}`
                      : "Sin stock disponible"}
                  </p>
                </div>

                <div className="mt-6 space-y-3">
                  {whatsappPhone && (
                    <a
                      href={`https://wa.me/${whatsappPhone}?text=${whatsappMessage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-xl bg-green-500 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-green-600 active:scale-[0.98]"
                    >
                      <img
                        src="/whatsapp.svg"
                        alt=""
                        aria-hidden="true"
                        className="h-6 w-6"
                      />

                      Consultar por WhatsApp
                    </a>
                  )}

                  <a
                    href={product.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#FFE600] px-5 py-3.5 text-sm font-bold text-[#333333] transition hover:bg-[#F5D900] active:scale-[0.98]"
                  >
                    <img
                      src="/mercadolibre.svg"
                      alt=""
                      aria-hidden="true"
                      className="h-6 w-6"
                    />

                    Ver en MercadoLibre
                  </a>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-bold text-zinc-950">
                Descripción
              </h2>

              <div className="mt-5 whitespace-pre-line text-base leading-7 text-zinc-700">
                {description}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-bold text-zinc-950">
                Información del producto
              </h2>

              <dl className="mt-5 divide-y divide-zinc-200">
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="font-bold text-zinc-500">
                    Marca
                  </dt>

                  <dd className="text-right font-bold text-zinc-900">
                    {brand || "—"}
                  </dd>
                </div>

                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="font-bold text-zinc-500">
                    Modelo
                  </dt>

                  <dd className="text-right font-bold text-zinc-900">
                    {model || "—"}
                  </dd>
                </div>

                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="font-bold text-zinc-500">
                    Categoría
                  </dt>

                  <dd className="text-right font-bold text-zinc-900">
                    {product.categoryName ||
                      "—"}
                  </dd>
                </div>

                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="font-bold text-zinc-500">
                    Código
                  </dt>

                  <dd className="text-right font-bold text-zinc-900">
                    {product.meliId}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          {Object.keys(attributeGroups).length >
            0 && (
            <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-bold text-zinc-950">
                Características
              </h2>

              <div className="mt-6 space-y-8">
                {Object.entries(
                  attributeGroups
                ).map(
                  ([
                    groupName,
                    attributes,
                  ]) => (
                    <div
                      key={groupName}
                    >
                      <h3 className="text-lg font-bold text-zinc-900">
                        {groupName}
                      </h3>

                      <dl className="mt-3 overflow-hidden rounded-xl border border-zinc-200">
                        {attributes.map(
                          (
                            attribute,
                            index
                          ) => {
                            const value =
                              attribute.value_name ||
                              (attribute.value_struct
                                ?.number !==
                              undefined
                                ? `${attribute.value_struct.number}${
                                    attribute.value_struct.unit
                                      ? ` ${attribute.value_struct.unit}`
                                      : ""
                                  }`
                                : "");

                            if (!value) {
                              return null;
                            }

                            return (
                              <div
                                key={`${attribute.id}-${index}`}
                                className="grid grid-cols-1 border-b border-zinc-200 last:border-b-0 sm:grid-cols-2"
                              >
                                <dt className="bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-600">
                                  {
                                    attribute.name
                                  }
                                </dt>

                                <dd className="px-4 py-3 text-sm font-bold text-zinc-900">
                                  {value}
                                </dd>
                              </div>
                            );
                          }
                        )}
                      </dl>
                    </div>
                  )
                )}
              </div>
            </section>
          )}
        </article>
      </div>
    </main>
  );
}