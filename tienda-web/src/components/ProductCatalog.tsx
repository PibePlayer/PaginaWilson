"use client";

import { useState } from "react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types/product";
import type { Category } from "@/types/category";

interface ProductCatalogProps {
  products: Array<
    Omit<Product, "updatedAt"> & {
      updatedAt: string;
      webPrice: number;
      discountPercent: number;
    }
  >;
  categories: Array<Omit<Category, "updatedAt"> & { updatedAt: string }>;
}

export default function ProductCatalog({
  products,
  categories,
}: ProductCatalogProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<string>("all");

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter(
          (product) =>
            product.categoryId === selectedCategory
        );

  return (
    <>
      {/* Categorías */}
      <div className="mb-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
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
              setSelectedCategory(category.categoryId)
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
                selectedCategory === category.categoryId
                  ? "bg-zinc-950 text-white"
                  : "bg-white text-zinc-700 hover:bg-zinc-200"
              }
            `}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Resultados */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.meliId}
              product={product}
            />
          ))}
        </div>
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
