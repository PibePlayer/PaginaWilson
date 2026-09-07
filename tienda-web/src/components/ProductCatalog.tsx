"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";

interface Product {
  meliId: string;
  title: string;
  meliPrice: number;
  meliDiscountedPrice?: number;
  currencyId: string;
  availableQuantity: number;
  thumbnail: string;
  permalink: string;
  status: string;
  visible: boolean;
  featured: boolean;
  categoryId: string;
  updatedAt: string;
  webPrice: number;
  discountPercent: number;
}

interface Category {
  categoryId: string;
  name: string;
}

interface ProductCatalogProps {
  initialProducts: Product[];
  categories: Category[];
  discountOptions: number[];
  initialTotal: number;
  initialSearch: string;
  initialCategoryId: string;
  initialMinPrice: string;
  initialMaxPrice: string;
  initialDiscount: string;
}

interface AppliedFilters {
  categoryId: string;
  search: string;
  minPrice: string;
  maxPrice: string;
  discount: string;
}

export default function ProductCatalog({
  initialProducts,
  categories,
  discountOptions: initialDiscountOptions,
  initialTotal,
  initialSearch,
  initialCategoryId,
  initialMinPrice,
  initialMaxPrice,
  initialDiscount,
}: ProductCatalogProps) {
  const router = useRouter();

  const [products, setProducts] =
    useState<Product[]>(
      initialProducts
    );

  const [discountOptions, setDiscountOptions] =
    useState<number[]>(
      initialDiscountOptions
    );

  const [selectedCategory, setSelectedCategory] =
    useState<string>(
      initialCategoryId
    );

  const [minPriceInput, setMinPriceInput] =
    useState(
      initialMinPrice
    );

  const [maxPriceInput, setMaxPriceInput] =
    useState(
      initialMaxPrice
    );

  const [selectedDiscount, setSelectedDiscount] =
    useState<string>(
      initialDiscount
    );

  const [appliedFilters, setAppliedFilters] =
    useState<AppliedFilters>({
      categoryId:
        initialCategoryId,

      search:
        initialSearch,

      minPrice:
        initialMinPrice,

      maxPrice:
        initialMaxPrice,

      discount:
        initialDiscount,
    });

  const [filtersOpen, setFiltersOpen] =
    useState(false);

  const [page, setPage] =
    useState(1);

  const [hasMore, setHasMore] =
    useState(
      initialProducts.length <
        initialTotal
    );

  const [loading, setLoading] =
    useState(false);

  const filtersRef =
    useRef<HTMLDivElement>(
      null
    );

  const requestIdRef =
    useRef(0);

  function updateUrl(
    filters: AppliedFilters
  ) {
    const params =
      new URLSearchParams();

    if (filters.search) {
      params.set(
        "search",
        filters.search
      );
    }

    if (
      filters.categoryId !==
      "all"
    ) {
      params.set(
        "categoryId",
        filters.categoryId
      );
    }

    if (filters.minPrice) {
      params.set(
        "minPrice",
        filters.minPrice
      );
    }

    if (filters.maxPrice) {
      params.set(
        "maxPrice",
        filters.maxPrice
      );
    }

    if (filters.discount) {
      params.set(
        "discount",
        filters.discount
      );
    }

    const queryString =
      params.toString();

    router.replace(
      queryString
        ? `/productos?${queryString}`
        : "/productos",
      {
        scroll: false,
      }
    );
  }

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent
    ) {
      if (
        filtersRef.current &&
        !filtersRef.current.contains(
          event.target as Node
        )
      ) {
        setFiltersOpen(false);
      }
    }

    if (filtersOpen) {
      document.addEventListener(
        "mousedown",
        handleClickOutside
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [filtersOpen]);

  async function loadProducts(
    nextPage: number,
    filters: AppliedFilters,
    append: boolean
  ) {
    const requestId =
      ++requestIdRef.current;

    setLoading(true);

    try {
      const params =
        new URLSearchParams();

      params.set(
        "page",
        String(nextPage)
      );

      if (
        filters.categoryId !==
        "all"
      ) {
        params.set(
          "categoryId",
          filters.categoryId
        );
      }

      if (filters.search) {
        params.set(
          "search",
          filters.search
        );
      }

      if (filters.minPrice) {
        params.set(
          "minPrice",
          filters.minPrice
        );
      }

      if (filters.maxPrice) {
        params.set(
          "maxPrice",
          filters.maxPrice
        );
      }

      if (filters.discount) {
        params.set(
          "discount",
          filters.discount
        );
      }

      const response =
        await fetch(
          `/api/products?${params.toString()}`
        );

      if (!response.ok) {
        throw new Error(
          "No se pudieron cargar los productos."
        );
      }

      const data =
        await response.json();

      if (
        requestId !==
        requestIdRef.current
      ) {
        return;
      }

      if (append) {
        setProducts(
          (current) => [
            ...current,
            ...data.products,
          ]
        );
      } else {
        setProducts(
          data.products
        );
      }

      /*
       * El API recalcula las opciones según
       * categoría + búsqueda + precio.
       *
       * No importa qué descuento esté seleccionado:
       * las opciones siempre representan el universo
       * disponible sin ese filtro.
       */
      setDiscountOptions(
        data.discountOptions ??
          []
      );

      setPage(
        nextPage
      );

      setHasMore(
        data.hasMore
      );
    } catch (error) {
      if (
        requestId ===
        requestIdRef.current
      ) {
        console.error(
          "Error loading products:",
          error
        );
      }
    } finally {
      if (
        requestId ===
        requestIdRef.current
      ) {
        setLoading(false);
      }
    }
  }

  async function handleApplyFilters() {
    const filters: AppliedFilters = {
      categoryId:
        selectedCategory,

      search:
        appliedFilters.search,

      minPrice:
        minPriceInput,

      maxPrice:
        maxPriceInput,

      discount:
        selectedDiscount,
    };

    setAppliedFilters(
      filters
    );

    updateUrl(
      filters
    );

    await loadProducts(
      1,
      filters,
      false
    );

    setFiltersOpen(false);
  }

  async function handleClearFilters() {
    const filters: AppliedFilters = {
      categoryId:
        selectedCategory,

      search:
        appliedFilters.search,

      minPrice: "",

      maxPrice: "",

      discount: "",
    };

    setMinPriceInput("");
    setMaxPriceInput("");
    setSelectedDiscount("");

    setAppliedFilters(
      filters
    );

    updateUrl(
      filters
    );

    await loadProducts(
      1,
      filters,
      false
    );

    setFiltersOpen(false);
  }

  async function handleCategoryChange(
    categoryId: string
  ) {
    if (
      categoryId ===
      selectedCategory
    ) {
      if (
        categoryId === "all"
      ) {
        return;
      } else {
        categoryId = "all";
      }
    }

    setSelectedCategory(
      categoryId
    );

    const filters: AppliedFilters = {
      categoryId,

      search:
        appliedFilters.search,

      minPrice:
        appliedFilters.minPrice,

      maxPrice:
        appliedFilters.maxPrice,

      discount:
        appliedFilters.discount,
    };

    setAppliedFilters(
      filters
    );

    updateUrl(
      filters
    );

    await loadProducts(
      1,
      filters,
      false
    );
  }

  async function handleLoadMore() {
    await loadProducts(
      page + 1,
      appliedFilters,
      true
    );
  }

  const activeFilters =
    Number(
      Boolean(
        appliedFilters.minPrice
      )
    ) +
    Number(
      Boolean(
        appliedFilters.maxPrice
      )
    ) +
    Number(
      Boolean(
        appliedFilters.discount
      )
    );

  return (
    <>
      {/* Categorías */}
      <div className="mb-4 flex flex-wrap gap-2.5">
        {[
          {
            categoryId: "all",
            name: "Todos",
          },
          ...categories,
        ].map((category) => {
          const isActive =
            selectedCategory ===
            category.categoryId;

          return (
            <button
              key={
                category.categoryId
              }
              type="button"
              onClick={() =>
                handleCategoryChange(
                  category.categoryId
                )
              }
              className={`rounded-full px-4 py-2 font-proxima text-sm font-bold transition ${
                isActive
                  ? "bg-zinc-950 text-white"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </div>

      {/* Filtros flotantes */}
      <div
        ref={filtersRef}
        className="relative mb-8"
      >
        <div className="flex items-center">
          <button
            type="button"
            onClick={() =>
              setFiltersOpen(
                (open) => !open
              )
            }
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 font-proxima text-sm font-bold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 5h18M6 12h12m-8 7h4"
              />
            </svg>

            Filtros

            {activeFilters > 0 && (
              <>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-950 px-1.5 text-[11px] font-bold text-white">
                  {activeFilters}
                </span>

                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleClearFilters();
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                        "Enter" ||
                      event.key ===
                        " "
                    ) {
                      event.preventDefault();
                      event.stopPropagation();
                      handleClearFilters();
                    }
                  }}
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-zinc-500 transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Limpiar filtros"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="h-3.5 w-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </span>
              </>
            )}

            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`ml-1 h-4 w-4 transition-transform ${
                filtersOpen
                  ? "rotate-180"
                  : ""
              }`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m6 9 6 6 6-6"
              />
            </svg>
          </button>
        </div>

        <div
          className={`absolute left-0 top-full z-30 mt-2 w-full max-w-xl origin-top-left overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl transition-all duration-200 ${
            filtersOpen
              ? "pointer-events-auto scale-100 opacity-100"
              : "pointer-events-none scale-95 opacity-0"
          }`}
        >
          <div className="mb-4">
            <label
              htmlFor="discount-filter"
              className="mb-2 block font-proxima text-sm font-bold text-zinc-900"
            >
              Descuento mínimo
            </label>

            <select
              id="discount-filter"
              value={
                selectedDiscount
              }
              onChange={(event) =>
                setSelectedDiscount(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 font-proxima text-sm font-bold text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
            >
              <option value="">
                Todos los descuentos
              </option>

              {discountOptions.map(
                (discount) => (
                  <option
                    key={discount}
                    value={discount}
                  >
                    {discount}% o más
                  </option>
                )
              )}
            </select>
          </div>

          <div className="mb-3">
            <p className="font-proxima text-sm font-bold text-zinc-900">
              Filtrar por precio
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="min-price"
                className="mb-1.5 block font-proxima text-xs font-bold text-zinc-500"
              >
                Precio mínimo
              </label>

              <input
                id="min-price"
                type="number"
                min="0"
                value={
                  minPriceInput
                }
                onChange={(event) =>
                  setMinPriceInput(
                    event.target.value
                  )
                }
                placeholder="Desde"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 font-proxima text-sm font-bold text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
              />
            </div>

            <div className="flex-1">
              <label
                htmlFor="max-price"
                className="mb-1.5 block font-proxima text-xs font-bold text-zinc-500"
              >
                Precio máximo
              </label>

              <input
                id="max-price"
                type="number"
                min="0"
                value={
                  maxPriceInput
                }
                onChange={(event) =>
                  setMaxPriceInput(
                    event.target.value
                  )
                }
                placeholder="Hasta"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 font-proxima text-sm font-bold text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
              />
            </div>

            <button
              type="button"
              onClick={
                handleApplyFilters
              }
              disabled={loading}
              className="rounded-xl bg-zinc-950 px-5 py-2.5 font-proxima text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      </div>

      {/* Productos */}
      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map(
              (product) => (
                <ProductCard
                  key={
                    product.meliId
                  }
                  product={
                    product
                  }
                />
              )
            )}
          </div>

          {hasMore && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={
                  handleLoadMore
                }
                disabled={loading}
                className="rounded-xl border border-zinc-300 bg-white px-6 py-3 font-proxima text-sm font-bold text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Cargando..."
                  : "Cargar más"}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center shadow-sm">
          <h2 className="font-proxima text-xl font-bold text-zinc-900">
            No encontramos productos
          </h2>

          <p className="mt-2 font-proxima text-sm font-bold text-zinc-500">
            Probá modificando los
            filtros de búsqueda.
          </p>
        </div>
      )}
    </>
  );
}