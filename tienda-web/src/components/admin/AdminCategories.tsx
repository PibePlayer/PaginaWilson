"use client";

import {
  useEffect,
  useState,
} from "react";

import { STORE_NAME } from "@/lib/store-config";

import {
  useAdminChanges,
} from "@/components/admin/AdminChangesContext";

interface Category {
  categoryId: string;
  meliName: string;
  name: string;
}

export default function AdminCategories() {
  const {
    setCategoryChange,
    revision,
  } = useAdminChanges();

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [
    originalCategories,
    setOriginalCategories,
  ] = useState<Category[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadCategories() {
      try {
        setLoading(true);
        setError(null);

        const response =
          await fetch(
            "/api/admin/categories",
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
              "No se pudieron cargar las categorías."
          );
        }

        const loaded =
          data.categories || [];

        setCategories(loaded);
        setOriginalCategories(
          loaded
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las categorías."
        );
      } finally {
        setLoading(false);
      }
    }

    loadCategories();
  }, []);

  /*
   * Después de Apply global, los valores
   * actuales pasan a ser los originales.
   */
  useEffect(() => {
    if (revision === 0) {
      return;
    }

    setOriginalCategories(
      categories
    );
  }, [revision]);

  function updateName(
    categoryId: string,
    name: string
  ) {
    setCategories((current) =>
      current.map((category) =>
        category.categoryId ===
        categoryId
          ? {
              ...category,
              name,
            }
          : category
      )
    );

    const original =
      originalCategories.find(
        (category) =>
          category.categoryId ===
          categoryId
      );

    if (!original) {
      return;
    }

    setCategoryChange(
      categoryId,
      name,
      original.name
    );
  }

  function isModified(
    category: Category
  ) {
    const original =
      originalCategories.find(
        (item) =>
          item.categoryId ===
          category.categoryId
      );

    if (!original) {
      return false;
    }

    return (
      category.name.trim() !==
      original.name.trim()
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 md:col-span-2">
      <div className="mb-6">
        <h2 className="font-proxima text-xl font-bold text-zinc-950">
          Categorías
        </h2>

        <p className="mt-2 font-proxima text-sm text-zinc-500">
          Personalizá los nombres que se
          muestran en {STORE_NAME} sin modificar
          las categorías de MercadoLibre.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-proxima text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center font-proxima text-sm text-zinc-500">
          Cargando categorías...
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center font-proxima text-sm text-zinc-500">
          No hay categorías disponibles.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <div className="hidden grid-cols-[1fr_1fr_auto] gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-3 md:grid">
            <span className="font-proxima text-xs font-bold uppercase tracking-wider text-zinc-500">
              MercadoLibre
            </span>

            <span className="font-proxima text-xs font-bold uppercase tracking-wider text-zinc-500">
              {STORE_NAME}
            </span>

            <span />
          </div>

          <div className="divide-y divide-zinc-200">
            {categories.map(
              (category) => {
                const modified =
                  isModified(
                    category
                  );

                return (
                  <div
                    key={
                      category.categoryId
                    }
                    className={`grid gap-3 px-4 py-4 md:grid-cols-[1fr_1fr_auto] md:items-center md:gap-4 ${
                      modified
                        ? "bg-[#45d354]/5"
                        : ""
                    }`}
                  >
                    <div>
                      <p className="mb-1 font-proxima text-xs font-bold uppercase tracking-wider text-zinc-400 md:hidden">
                        MercadoLibre
                      </p>

                      <p className="font-proxima text-sm font-medium text-zinc-700">
                        {category.meliName}
                      </p>
                    </div>

                    <div>
                      <p className="mb-1 font-proxima text-xs font-bold uppercase tracking-wider text-zinc-400 md:hidden">
                        {STORE_NAME}
                      </p>

                      <input
                        type="text"
                        value={
                          category.name
                        }
                        onChange={(event) =>
                          updateName(
                            category.categoryId,
                            event.target.value
                          )
                        }
                        maxLength={100}
                        className={`w-full rounded-xl border bg-white px-3 py-2.5 font-proxima text-sm text-zinc-900 outline-none transition focus:ring-2 ${
                          modified
                            ? "border-[#45d354] focus:border-[#45d354] focus:ring-[#45d354]/20"
                            : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-200"
                        }`}
                      />
                    </div>

                    <div className="flex justify-start md:justify-end">
                      {modified && (
                        <span className="rounded-xl bg-[#45d354]/10 px-3 py-2 font-proxima text-xs font-bold text-[#22963a]">
                          Modificado
                        </span>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
}