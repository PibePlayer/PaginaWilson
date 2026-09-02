"use client";

import { useState } from "react";
import ProductCard from "@/components/ProductCard";

interface Product {
  meliId: string;
  title: string;
  meliPrice: number;
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
}

export default function ProductCatalog({
  initialProducts,
  categories,
  initialTotal,
}: ProductCatalogProps) {
  const [products, setProducts] =
    useState<Product[]>(initialProducts);

  const [selectedCategory, setSelectedCategory] =
    useState<string>("all");

  const [page, setPage] = useState(1);

  const [hasMore, setHasMore] =
    useState(initialProducts.length < initialTotal);

  const [loading, setLoading] =
    useState(false);

  async function loadProducts(
    nextPage: number,
    categoryId: string,
    append: boolean
  ) {
    if (loading) return;

    setLoading(true);

    try {
      const params = new URLSearchParams();

      params.set("page", String(nextPage));

      if (categoryId !== "all") {
        params.set("categoryId", categoryId);
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
      console.error(
        "Error loading products:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCategoryChange(
    categoryId: string
  ) {
    if (categoryId === selectedCategory) {
      return;
    }

    setSelectedCategory(categoryId);

    await loadProducts(
      1,
      categoryId,
      false
    );
  }

  async function handleLoadMore() {
    await loadProducts(
      page + 1,
      selectedCategory,
      true
    );
  }

  return (
    <>
      {/* Categorías */}
      <div className="mb-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() =>
            handleCategoryChange("all")
          }
          className={`
            rounded-full
            px-5
            py-2.5
            font-proxima
            text-sm
            font-bold
            transition
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
              handleCategoryChange(
                category.categoryId
              )
            }
            className={`
              rounded-full
              px-5
              py-2.5
              font-proxima
              text-sm
              font-bold
              transition
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
                onClick={handleLoadMore}
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
            No hay productos en esta categoría.
          </p>
        </div>
      )}
    </>
  );
}