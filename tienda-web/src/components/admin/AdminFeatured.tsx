"use client";

import {
  DragEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useAdminChanges,
} from "@/components/admin/AdminChangesContext";

import { calculateWebPrice } from "@/lib/pricing";

interface Product {
  meliId: string;
  title: string;
  meliPrice: number;
  meliDiscountedPrice?: number;
  currencyId: string;
  availableQuantity: number;
  thumbnail: string;
  featured: boolean;
  featuredOrder?: number;
  discountPercent?: number;
}

type Filter =
  | "all"
  | "featured"
  | "not-featured"
  | "custom-discount";

export default function AdminFeatured() {
  const {
    setProductDiscountChange,
    setFeaturedChange,
    setFeaturedOrderChange,
    revision,
  } = useAdminChanges();

  const [products, setProducts] =
    useState<Product[]>([]);

  const [
    originalProducts,
    setOriginalProducts,
  ] = useState<Product[]>([]);

  const [
    featuredOrder,
    setFeaturedOrder,
  ] = useState<string[]>([]);

  const [
    originalFeaturedOrder,
    setOriginalFeaturedOrder,
  ] = useState<string[]>([]);

  const [globalDiscountPercent, setGlobalDiscountPercent] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<Filter>("all");

  const [draggingId, setDraggingId] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        setError(null);

        const response =
          await fetch(
            "/api/admin/featured",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "No se pudieron cargar los productos."
          );
        }

        const loaded =
          (data.products || []) as Product[];

        setGlobalDiscountPercent(
          Number.isFinite(
            data.globalDiscountPercent
          )
            ? data.globalDiscountPercent
            : 0
        );

        const loadedFeaturedOrder =
          loaded
            .filter(
              (product) =>
                product.featured
            )
            .sort(
              (a, b) =>
                (a.featuredOrder ??
                  Number.MAX_SAFE_INTEGER) -
                (b.featuredOrder ??
                  Number.MAX_SAFE_INTEGER)
            )
            .map(
              (product) =>
                product.meliId
            );

        setProducts(loaded);
        setOriginalProducts(loaded);
        setFeaturedOrder(
          loadedFeaturedOrder
        );
        setOriginalFeaturedOrder(
          loadedFeaturedOrder
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los productos."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  /*
   * Después de Apply, el estado actual
   * pasa a ser el nuevo estado original.
   */
  useEffect(() => {
    if (revision === 0) {
      return;
    }

    setOriginalProducts(
      products
    );

    setOriginalFeaturedOrder(
      featuredOrder
    );
  }, [revision]);

  function updateFeaturedState(
    product: Product,
    newValue: boolean
  ) {
    let newOrder =
      [...featuredOrder];

    if (newValue) {
      if (
        !newOrder.includes(
          product.meliId
        )
      ) {
        newOrder.push(
          product.meliId
        );
      }
    } else {
      newOrder =
        newOrder.filter(
          (meliId) =>
            meliId !==
            product.meliId
        );
    }

    setProducts((current) =>
      current.map((item) =>
        item.meliId ===
        product.meliId
          ? {
              ...item,
              featured:
                newValue,
            }
          : item
      )
    );

    setFeaturedOrder(
      newOrder
    );

    const original =
      originalProducts.find(
        (item) =>
          item.meliId ===
          product.meliId
      );

    if (original) {
      setFeaturedChange(
        product.meliId,
        newValue,
        original.featured
      );
    }

    setFeaturedOrderChange(
      newOrder,
      originalFeaturedOrder
    );
  }

  function updateDiscount(
    product: Product,
    value: string
  ) {
    /*
     * Campo vacío = quitar descuento particular
     * y volver a utilizar el global.
     */
    if (value.trim() === "") {
      setProducts((current) =>
        current.map((item) =>
          item.meliId ===
          product.meliId
            ? {
                ...item,
                discountPercent:
                  undefined,
              }
            : item
        )
      );

      const original =
        originalProducts.find(
          (item) =>
            item.meliId ===
            product.meliId
        );

      setProductDiscountChange(
        product.meliId,
        undefined,
        original?.discountPercent
      );

      return;
    }

    const parsed =
      Number(value);

    if (!Number.isFinite(parsed)) {
      return;
    }

    const safeValue =
      Math.min(
        100,
        Math.max(0, parsed)
      );

    setProducts((current) =>
      current.map((item) =>
        item.meliId ===
        product.meliId
          ? {
              ...item,
              discountPercent:
                safeValue,
            }
          : item
      )
    );

    const original =
      originalProducts.find(
        (item) =>
          item.meliId ===
          product.meliId
      );

    setProductDiscountChange(
      product.meliId,
      safeValue,
      original?.discountPercent
    );
  }

  function toggleFeatured(
    product: Product
  ) {
    updateFeaturedState(
      product,
      !product.featured
    );
  }

  function moveFeatured(
    draggedId: string,
    targetId: string
  ) {
    if (
      draggedId === targetId
    ) {
      return;
    }

    const currentOrder =
      [...featuredOrder];

    const fromIndex =
      currentOrder.indexOf(
        draggedId
      );

    const toIndex =
      currentOrder.indexOf(
        targetId
      );

    if (
      fromIndex === -1 ||
      toIndex === -1
    ) {
      return;
    }

    currentOrder.splice(
      fromIndex,
      1
    );

    currentOrder.splice(
      toIndex,
      0,
      draggedId
    );

    setFeaturedOrder(
      currentOrder
    );

    setFeaturedOrderChange(
      currentOrder,
      originalFeaturedOrder
    );
  }

  function handleDragStart(
    event: DragEvent<HTMLDivElement>,
    meliId: string
  ) {
    setDraggingId(meliId);

    event.dataTransfer.effectAllowed =
      "move";

    event.dataTransfer.setData(
      "text/plain",
      meliId
    );
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>,
    targetId: string
  ) {
    event.preventDefault();

    const draggedId =
      event.dataTransfer.getData(
        "text/plain"
      ) || draggingId;

    if (draggedId) {
      moveFeatured(
        draggedId,
        targetId
      );
    }

    setDraggingId(null);
  }

  function isDiscountModified(
    product: Product
  ) {
    const original =
      originalProducts.find(
        (item) =>
          item.meliId ===
          product.meliId
      );

    if (!original) {
      return false;
    }

    return (
      product.discountPercent !==
      original.discountPercent
    );
  }

  function isModified(
    product: Product
  ) {
    const original =
      originalProducts.find(
        (item) =>
          item.meliId ===
          product.meliId
      );

    if (!original) {
      return false;
    }

    if (
      product.featured !==
      original.featured
    ) {
      return true;
    }

    if (
      product.discountPercent !==
      original.discountPercent
    ) {
      return true;
    }

    if (!product.featured) {
      return false;
    }

    const currentIndex =
      featuredOrder.indexOf(
        product.meliId
      );

    const originalIndex =
      originalFeaturedOrder.indexOf(
        product.meliId
      );

    return (
      currentIndex !==
      originalIndex
    );
  }

  function formatPrice(
    price: number,
    currencyId: string
  ) {
    return new Intl.NumberFormat(
      "es-AR",
      {
        style: "currency",
        currency:
          currencyId || "ARS",
        maximumFractionDigits: 0,
      }
    ).format(price);
  }

  function getCurrentMeliPrice(
    product: Product
  ) {
    return (
      product.meliDiscountedPrice ??
      product.meliPrice
    );
  }

  function getAppliedDiscount(
    product: Product
  ) {
    return (
      product.discountPercent ??
      globalDiscountPercent
    );
  }

  function getFinalPrice(
    product: Product
  ) {
    return calculateWebPrice(
      getCurrentMeliPrice(product),
      getAppliedDiscount(product)
    );
  }

  const featuredCount =
    products.filter(
      (product) =>
        product.featured
    ).length;

  const customDiscountCount =
    products.filter(
      (product) =>
        product.discountPercent !==
        undefined
    ).length;

  const orderedProducts =
    useMemo(() => {
      const featuredMap =
        new Map(
          products
            .filter(
              (product) =>
                product.featured
            )
            .map((product) => [
              product.meliId,
              product,
            ])
        );

      const orderedFeatured =
        featuredOrder
          .map((meliId) =>
            featuredMap.get(meliId)
          )
          .filter(
            (
              product
            ): product is Product =>
              Boolean(product)
          );

      const remainingFeatured =
        products.filter(
          (product) =>
            product.featured &&
            !featuredOrder.includes(
              product.meliId
            )
        );

      const nonFeatured =
        products.filter(
          (product) =>
            !product.featured
        );

      return [
        ...orderedFeatured,
        ...remainingFeatured,
        ...nonFeatured,
      ];
    }, [
      products,
      featuredOrder,
    ]);

  const filteredProducts =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLocaleLowerCase();

      return orderedProducts.filter(
        (product) => {
          const matchesSearch =
            !normalizedSearch ||
            product.title
              .toLocaleLowerCase()
              .includes(
                normalizedSearch
              );

          const matchesFilter =
            filter === "all" ||
            (filter ===
              "featured" &&
              product.featured) ||
            (filter ===
              "not-featured" &&
              !product.featured) ||
            (filter ===
              "custom-discount" &&
              product.discountPercent !==
                undefined);

          return (
            matchesSearch &&
            matchesFilter
          );
        }
      );
    }, [
      orderedProducts,
      search,
      filter,
    ]);

  const canReorder =
    filter === "featured" &&
    search.trim() === "";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 md:col-span-2">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-proxima text-xl font-bold text-zinc-950">
            Productos
          </h2>

          <p className="mt-2 font-proxima text-sm text-zinc-500">
            Administrá los descuentos y
            elegí los productos que se
            muestran en la página
            principal.
          </p>

          {!loading && (
            <p className="mt-2 font-proxima text-xs font-bold text-zinc-400">
              Descuento general:{" "}
              <span className="text-zinc-600">
                {globalDiscountPercent}%
              </span>
            </p>
          )}
        </div>

        {!loading && (
          <div className="flex flex-col items-start gap-1 md:items-end">
            <span className="font-proxima text-sm font-bold text-zinc-500">
              {featuredCount} destacados
            </span>

            <span className="font-proxima text-xs text-zinc-400">
              {customDiscountCount} con descuento particular
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-proxima text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {!loading &&
        products.length > 0 && (
          <div className="mb-5 flex flex-col gap-3">
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                />

                <path d="m20 20-3.5-3.5" />
              </svg>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Buscar producto..."
                className="w-full rounded-xl border border-zinc-300 bg-white py-3 pl-10 pr-4 font-proxima text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              />
            </div>

            <div className="flex overflow-x-auto rounded-xl border border-zinc-300 bg-zinc-50 p-1">
              {(
                [
                  [
                    "all",
                    "Todos",
                  ],
                  [
                    "featured",
                    "Destacados",
                  ],
                  [
                    "not-featured",
                    "No destacados",
                  ],
                  [
                    "custom-discount",
                    `Descuento particular${
                      customDiscountCount > 0
                        ? ` (${customDiscountCount})`
                        : ""
                    }`,
                  ],
                ] as const
              ).map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setFilter(value)
                    }
                    className={`whitespace-nowrap rounded-lg px-4 py-2 font-proxima text-sm font-bold transition ${
                      filter === value
                        ? "bg-white text-zinc-950 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>
        )}

      {loading ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center font-proxima text-sm text-zinc-500">
          Cargando productos...
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center font-proxima text-sm text-zinc-500">
          No hay productos activos.
        </div>
      ) : filteredProducts.length ===
        0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center font-proxima text-sm text-zinc-500">
          No se encontraron productos
          con esos filtros.
        </div>
      ) : (
        <>
          {canReorder && (
            <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-proxima text-sm text-zinc-600">
              Arrastrá los productos para
              cambiar su orden de aparición
              en la página.
            </div>
          )}

          {!canReorder &&
            filter === "featured" && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 font-proxima text-sm text-amber-700">
                Para reordenar, quitá la
                búsqueda.
              </div>
            )}

          <div className="grid gap-3">
            {filteredProducts.map(
              (product) => {
                const modified =
                  isModified(product);

                const discountModified =
                  isDiscountModified(
                    product
                  );

                const draggable =
                  canReorder &&
                  product.featured;

                const currentMeliPrice =
                  getCurrentMeliPrice(
                    product
                  );

                const appliedDiscount =
                  getAppliedDiscount(
                    product
                  );

                const finalPrice =
                  getFinalPrice(
                    product
                  );

                const hasCustomDiscount =
                  product.discountPercent !==
                  undefined;

                return (
                  <div
                    key={
                      product.meliId
                    }
                    draggable={draggable}
                    onDragStart={(event) =>
                      draggable &&
                      handleDragStart(
                        event,
                        product.meliId
                      )
                    }
                    onDragOver={(event) => {
                      if (draggable) {
                        event.preventDefault();

                        event.dataTransfer.dropEffect =
                          "move";
                      }
                    }}
                    onDrop={(event) => {
                      if (draggable) {
                        handleDrop(
                          event,
                          product.meliId
                        );
                      }
                    }}
                    onDragEnd={() =>
                      setDraggingId(
                        null
                      )
                    }
                    className={`flex flex-col gap-4 rounded-xl border p-3 transition sm:flex-row sm:items-center ${
                      draggingId ===
                      product.meliId
                        ? "scale-[0.99] opacity-50"
                        : ""
                    } ${
                      modified
                        ? "border-[#45d354] bg-[#45d354]/5"
                        : product.featured
                          ? "border-zinc-300 bg-zinc-50"
                          : "border-zinc-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {draggable ? (
                        <div
                          className="flex w-5 shrink-0 cursor-grab select-none items-center justify-center text-lg font-bold leading-none tracking-[-3px] text-zinc-400 active:cursor-grabbing"
                          title="Arrastrar para reordenar"
                        >
                          ⋮⋮
                        </div>
                      ) : (
                        <div className="w-5 shrink-0" />
                      )}

                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                        {product.thumbnail ? (
                          <img
                            src={
                              product.thumbnail
                            }
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="font-proxima text-xs text-zinc-400">
                            Sin imagen
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-proxima text-sm font-bold text-zinc-900">
                        {product.title}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-proxima text-sm text-zinc-500">
                          ML:
                        </span>

                        <span className="font-proxima text-sm font-bold text-zinc-600">
                          {formatPrice(
                            currentMeliPrice,
                            product.currencyId
                          )}
                        </span>

                        <span className="text-zinc-300">
                          →
                        </span>

                        <span className="font-proxima text-sm font-bold text-emerald-600">
                          {formatPrice(
                            finalPrice,
                            product.currencyId
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                      <div
                        className={`rounded-xl border bg-white px-3 py-2 ${
                          discountModified
                            ? "border-[#45d354] ring-2 ring-[#45d354]/10"
                            : "border-zinc-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor={`discount-${product.meliId}`}
                            className="font-proxima text-xs font-bold text-zinc-500"
                          >
                            Descuento
                          </label>

                          <div className="flex items-center">
                            <input
                              id={`discount-${product.meliId}`}
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={
                                product.discountPercent ??
                                ""
                              }
                              placeholder={String(
                                globalDiscountPercent
                              )}
                              onChange={(event) =>
                                updateDiscount(
                                  product,
                                  event.target.value
                                )
                              }
                              className="w-14 bg-transparent text-right font-proxima text-sm font-bold text-zinc-950 outline-none placeholder:text-zinc-300"
                              aria-label={`Descuento de ${product.title}`}
                            />

                            <span className="font-proxima text-sm font-bold text-zinc-500">
                              %
                            </span>
                          </div>
                        </div>

                        <p className="mt-1 font-proxima text-xs text-zinc-400">
                          {hasCustomDiscount ? (
                            <>
                              Particular:{" "}
                              <span className="font-bold text-zinc-600">
                                {product.discountPercent}%
                              </span>
                            </>
                          ) : (
                            <>
                              Global:{" "}
                              <span className="font-bold text-zinc-600">
                                {globalDiscountPercent}%
                              </span>
                            </>
                          )}
                        </p>

                        <p className="mt-1 font-proxima text-xs text-zinc-400">
                          SOGUE:{" "}
                          <span className="font-bold text-emerald-600">
                            {formatPrice(
                              finalPrice,
                              product.currencyId
                            )}
                          </span>
                        </p>
                      </div>

                      {modified && (
                        <span className="hidden shrink-0 rounded-xl bg-[#45d354]/10 px-3 py-2 font-proxima text-xs font-bold text-[#22963a] lg:block">
                          Modificado
                        </span>
                      )}

                      <button
                        type="button"
                        role="switch"
                        aria-checked={
                          product.featured
                        }
                        aria-label={
                          product.featured
                            ? `Quitar ${product.title} de destacados`
                            : `Agregar ${product.title} a destacados`
                        }
                        onClick={() =>
                          toggleFeatured(
                            product
                          )
                        }
                        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                          product.featured
                            ? "bg-zinc-950"
                            : "bg-zinc-300"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                            product.featured
                              ? "left-6"
                              : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </>
      )}

      {!loading &&
        products.length > 0 && (
          <p className="mt-4 font-proxima text-xs text-zinc-400">
            Mostrando{" "}
            {filteredProducts.length} de{" "}
            {products.length} productos.
          </p>
        )}
    </div>
  );
}