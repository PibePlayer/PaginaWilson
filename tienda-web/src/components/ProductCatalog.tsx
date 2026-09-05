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
  initialTotal: number;
  initialSearch: string;
  initialCategoryId: string;
  initialMinPrice: string;
  initialMaxPrice: string;
}

interface AppliedFilters {
  categoryId: string;
  search: string;
  minPrice: string;
  maxPrice: string;
}

export default function ProductCatalog({
  initialProducts,
  categories,
  initialTotal,
  initialSearch,
  initialCategoryId,
  initialMinPrice,
  initialMaxPrice,
}: ProductCatalogProps) {
  const router = useRouter();

  const [products, setProducts] =
    useState<Product[]>(initialProducts);

  const [selectedCategory, setSelectedCategory] =
    useState<string>(initialCategoryId);

  const [minPriceInput, setMinPriceInput] =
    useState(initialMinPrice);

  const [maxPriceInput, setMaxPriceInput] =
    useState(initialMaxPrice);

  const [appliedFilters, setAppliedFilters] =
    useState<AppliedFilters>({
      categoryId: initialCategoryId,
      search: initialSearch,
      minPrice: initialMinPrice,
      maxPrice: initialMaxPrice,
    });

  const [filtersOpen, setFiltersOpen] =
    useState(false);

  const [page, setPage] = useState(1);

  const [hasMore, setHasMore] =
    useState(initialProducts.length < initialTotal);

  const [loading, setLoading] =
    useState(false);

  const filtersRef =
    useRef<HTMLDivElement>(null);

  const requestIdRef = useRef(0);

  function updateUrl(filters: AppliedFilters) {
    const params = new URLSearchParams();

    if (filters.search) {
      params.set("search", filters.search);
    }

    if (filters.categoryId !== "all") {
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

    const queryString = params.toString();

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
    function handleClickOutside(event: MouseEvent) {
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
      const params = new URLSearchParams();

      params.set(
        "page",
        String(nextPage)
      );

      if (filters.categoryId !== "all") {
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

      const response = await fetch(
        `/api/products?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(
          "No se pudieron cargar los productos."
        );
      }

      const data = await response.json();

      if (
        requestId !== requestIdRef.current
      ) {
        return;
      }

      if (append) {
        setProducts((current) => [
          ...current,
          ...data.products,
        ]);
      } else {
        setProducts(data.products);
      }

      setPage(nextPage);
      setHasMore(data.hasMore);
    } catch (error) {
      if (
        requestId === requestIdRef.current
      ) {
        console.error(
          "Error loading products:",
          error
        );
      }
    } finally {
      if (
        requestId === requestIdRef.current
      ) {
        setLoading(false);
      }
    }
  }

  async function handleApplyPriceFilters() {
    const filters: AppliedFilters = {
      categoryId: selectedCategory,
      search: appliedFilters.search,
      minPrice: minPriceInput,
      maxPrice: maxPriceInput,
    };

    setAppliedFilters(filters);
    updateUrl(filters);

    await loadProducts(
      1,
      filters,
      false
    );

    setFiltersOpen(false);
  }

  async function handleClearPriceFilters() {
    const filters: AppliedFilters = {
      categoryId: selectedCategory,
      search: appliedFilters.search,
      minPrice: "",
      maxPrice: "",
    };

    setMinPriceInput("");
    setMaxPriceInput("");
    setAppliedFilters(filters);
    updateUrl(filters);

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
      categoryId === selectedCategory
    ) {
      if (categoryId === "all") {
        return;
      } else {
        categoryId = "all";
      }
    }

    setSelectedCategory(categoryId);

    const filters: AppliedFilters = {
      categoryId,
      search: appliedFilters.search,
      minPrice: appliedFilters.minPrice,
      maxPrice: appliedFilters.maxPrice,
    };

    setAppliedFilters(filters);
    updateUrl(filters);

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

  const activePriceFilters =
    Number(Boolean(appliedFilters.minPrice)) +
    Number(Boolean(appliedFilters.maxPrice));

  return (
    <>
      {/* Buscador */}

      {/* Categorías */}
      <div className="mb-4 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() =>
            void handleCategoryChange("all")
          }
          disabled={loading}
          className={`
            rounded-full
            px-4
            py-2
            font-proxima
            text-sm
            font-bold
            transition
            disabled:cursor-not-allowed
            disabled:opacity-60
            ${
              selectedCategory === "all"
                ? "bg-zinc-950 text-white"
                : "bg-white text-zinc-700 hover:bg-zinc-200"
            }
          `}
        >
          Todos
        </button>

        {categories.map((category) => (
          <button
            key={category.categoryId}
            type="button"
            onClick={() =>
              void handleCategoryChange(
                category.categoryId
              )
            }
            disabled={loading}
            className={`
              rounded-full
              px-4
              py-2
              font-proxima
              text-sm
              font-bold
              transition
              disabled:cursor-not-allowed
              disabled:opacity-60
              ${
                selectedCategory ===
                category.categoryId
                  ? "bg-zinc-950 text-white"
                  : "bg-white text-zinc-700 hover:bg-zinc-200"
              }
            `}
          >
            {category.name}
          </button>
        ))}
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
              setFiltersOpen((current) => !current)
            }
            className={`group flex items-center gap-2 rounded-xl border bg-white px-4 py-2 font-proxima text-sm font-bold text-zinc-700 shadow-sm transition-all duration-200 ease-out hover:border-zinc-400 hover:bg-zinc-50 ${
              filtersOpen
                ? "border-zinc-400 shadow-md"
                : "border-zinc-300"
            }`}
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
                d="M3 5h18M6 12h12m-9 7h6"
              />
            </svg>

            Filtros

            {activePriceFilters > 0 && (
              <>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-950 px-1.5 text-[11px] text-white">
                  {activePriceFilters}
                </span>

                <span
                  role="button"
                  tabIndex={loading ? -1 : 0}
                  aria-label="Limpiar filtros de precio"
                  title="Limpiar filtros"
                  onClick={(event) => {
                    event.stopPropagation();

                    if (!loading) {
                      void handleClearPriceFilters();
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      (event.key === "Enter" ||
                        event.key === " ") &&
                      !loading
                    ) {
                      event.preventDefault();
                      event.stopPropagation();
                      void handleClearPriceFilters();
                    }
                  }}
                  className="ml-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 6l12 12M18 6 6 18"
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
              className={`h-4 w-4 transition-transform duration-200 ease-out ${
                filtersOpen
                  ? "rotate-180"
                  : "rotate-0"
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
          className={`absolute left-0 top-full z-30 mt-2 w-[min(92vw,420px)] origin-top-left rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl transition-all duration-200 ease-out ${
            filtersOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "pointer-events-none -translate-y-2 scale-95 opacity-0"
          }`}
        >
          {/* Cabecera del filtro */}
          <div className="mb-3">
            <p className="font-proxima text-sm font-bold text-zinc-900">
              Filtrar por precio
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {/* Precio mínimo */}
            <div className="min-w-0 flex-1">
              <label
                htmlFor="min-price"
                className="mb-1.5 block font-proxima text-xs font-bold text-zinc-500"
              >
                Desde
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-proxima text-sm font-bold text-zinc-400">
                  $
                </span>

                <input
                  id="min-price"
                  type="number"
                  min="0"
                  value={minPriceInput}
                  onChange={(event) =>
                    setMinPriceInput(
                      event.target.value
                    )
                  }
                  placeholder="Mínimo"
                  className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-7 pr-3 font-proxima text-sm font-bold text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
                />
              </div>
            </div>

            {/* Precio máximo */}
            <div className="min-w-0 flex-1">
              <label
                htmlFor="max-price"
                className="mb-1.5 block font-proxima text-xs font-bold text-zinc-500"
              >
                Hasta
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-proxima text-sm font-bold text-zinc-400">
                  $
                </span>

                <input
                  id="max-price"
                  type="number"
                  min="0"
                  value={maxPriceInput}
                  onChange={(event) =>
                    setMaxPriceInput(
                      event.target.value
                    )
                  }
                  placeholder="Máximo"
                  className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-7 pr-3 font-proxima text-sm font-bold text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                void handleApplyPriceFilters()
              }
              disabled={loading}
              className="shrink-0 rounded-lg bg-zinc-950 px-4 py-2 font-proxima text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Aplicando..."
                : "Aplicar"}
            </button>
          </div>
        </div>
      </div>

      {/* Productos */}
      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.meliId}
                product={product}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="mt-12 flex justify-center">
              <button
                type="button"
                onClick={() =>
                  void handleLoadMore()
                }
                disabled={loading}
                className="
                  rounded-xl
                  bg-zinc-950
                  px-8
                  py-3
                  font-proxima
                  text-sm
                  font-bold
                  text-white
                  transition
                  hover:bg-zinc-800
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {loading
                  ? "Cargando..."
                  : "Cargar más productos"}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-20 text-center">
          <p className="font-proxima text-lg font-bold text-zinc-700">
            No encontramos productos con
            estos filtros.
          </p>
        </div>
      )}
    </>
  );
}