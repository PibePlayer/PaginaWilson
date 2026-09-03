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

interface Product {
  meliId: string;
  title: string;
  meliPrice: number;
  currencyId: string;
  availableQuantity: number;
  thumbnail: string;
  featured: boolean;
  featuredOrder?: number;
}

type Filter =
  | "all"
  | "featured"
  | "not-featured";

export default function AdminFeatured() {
  const {
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
          data.products || [];

        const loadedFeaturedOrder =
          loaded
            .filter(
              (product: Product) =>
                product.featured
            )
            .sort(
              (
                a: Product,
                b: Product
              ) =>
                (a.featuredOrder ??
                  Number.MAX_SAFE_INTEGER) -
                (b.featuredOrder ??
                  Number.MAX_SAFE_INTEGER)
            )
            .map(
              (product: Product) =>
                product.meliId
            );

        setProducts(loaded);

        setOriginalProducts(
          loaded
        );

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
   * Después de Apply global, el estado actual
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
      /*
       * Al activar un producto,
       * se agrega al final de destacados.
       */
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
      /*
       * Al desactivar, se elimina
       * del orden de destacados.
       */
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

    /*
     * Cambio de estado destacado.
     */
    if (
      product.featured !==
      original.featured
    ) {
      return true;
    }

    /*
     * Los no destacados no tienen
     * un orden que comparar.
     */
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

  const featuredCount =
    products.filter(
      (product) =>
        product.featured
    ).length;

  /*
   * Los destacados se muestran según
   * featuredOrder.
   *
   * Los no destacados mantienen su
   * orden normal.
   */
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

      /*
       * Por seguridad, cualquier destacado
       * que todavía no esté en featuredOrder
       * se agrega al final.
       */
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
              !product.featured);

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

  /*
   * Solo permitimos reordenar cuando
   * estamos viendo TODOS los destacados,
   * sin una búsqueda que oculte productos.
   */
  const canReorder =
    filter === "featured" &&
    search.trim() === "";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 md:col-span-2">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-proxima text-xl font-bold text-zinc-950">
            Destacados
          </h2>

          <p className="mt-2 font-proxima text-sm text-zinc-500">
            Elegí los productos que se
            muestran en la página
            principal.
          </p>
        </div>

        {!loading && (
          <span className="font-proxima text-sm font-bold text-zinc-500">
            {featuredCount} destacados
          </span>
        )}
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-proxima text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {!loading &&
        products.length > 0 && (
          <div className="mb-5 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
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

                const draggable =
                  canReorder &&
                  product.featured;

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
                    className={`flex items-center gap-4 rounded-xl border p-3 transition ${
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

                    <div className="min-w-0 flex-1">
                      <p className="font-proxima text-sm font-bold text-zinc-900">
                        {product.title}
                      </p>

                      <p className="mt-1 font-proxima text-sm text-zinc-500">
                        {formatPrice(
                          product.meliPrice,
                          product.currencyId
                        )}
                      </p>
                    </div>

                    {modified && (
                      <span className="hidden shrink-0 rounded-xl bg-[#45d354]/10 px-3 py-2 font-proxima text-xs font-bold text-[#22963a] sm:block">
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