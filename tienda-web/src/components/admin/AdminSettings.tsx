"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useAdminChanges,
} from "@/components/admin/AdminChangesContext";

export default function AdminSettings() {
  const {
    setDiscountChange,
    revision,
  } = useAdminChanges();

  const [discount, setDiscount] =
    useState("");

  const [originalDiscount, setOriginalDiscount] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            "/api/admin/settings",
            {
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "No se pudo cargar la configuración."
          );
        }

        if (!cancelled) {
          const value =
            Number(
              data.discountPercent
            );

          setDiscount(
            String(value)
          );

          setOriginalDiscount(value);
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "No se pudo cargar la configuración."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Cuando el Apply global termina correctamente,
   * revision cambia y el valor actual pasa a ser
   * el nuevo valor original.
   */
  useEffect(() => {
    if (
      revision === 0 ||
      originalDiscount === null
    ) {
      return;
    }

    const value = Number(discount);

    if (Number.isFinite(value)) {
      setOriginalDiscount(value);
      setDiscountChange(undefined);
    }
  }, [revision]);

  function handleChange(
    value: string
  ) {
    setDiscount(value);
    setError("");

    const numericValue =
      Number(value);

    if (
      !Number.isFinite(numericValue) ||
      numericValue < 0 ||
      numericValue > 100
    ) {
      setDiscountChange(
        undefined
      );
      return;
    }

    if (
      originalDiscount !== null &&
      numericValue ===
        originalDiscount
    ) {
      setDiscountChange(
        undefined
      );
      return;
    }

    setDiscountChange(
      numericValue
    );
  }

  const numericDiscount =
    Number(discount);

  const isModified =
    originalDiscount !== null &&
    Number.isFinite(
      numericDiscount
    ) &&
    numericDiscount !==
      originalDiscount;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-proxima text-xl font-bold text-zinc-950">
            Precio web
          </h2>

          <p className="mt-2 font-proxima text-sm text-zinc-500">
            Configurá el descuento aplicado
            sobre el precio de MercadoLibre.
          </p>
        </div>

        {isModified && (
          <span className="shrink-0 rounded-xl bg-[#45d354]/10 px-3 py-2 font-proxima text-sm font-bold text-[#22963a]">
            Modificado
          </span>
        )}
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-proxima text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6">
        <label
          htmlFor="discount"
          className="block font-proxima text-sm font-bold text-zinc-700"
        >
          Descuento
        </label>

        <div className="mt-2 flex max-w-sm">
          <input
            id="discount"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={discount}
            onChange={(event) =>
              handleChange(
                event.target.value
              )
            }
            disabled={loading}
            className={`w-full rounded-l-xl border bg-white px-4 py-3 font-proxima text-base font-bold text-zinc-950 outline-none transition focus:ring-2 disabled:bg-zinc-100 ${
              isModified
                ? "border-[#45d354] focus:border-[#45d354] focus:ring-[#45d354]/20"
                : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-200"
            }`}
          />

          <div className="flex items-center rounded-r-xl border border-l-0 border-zinc-300 bg-zinc-50 px-4 font-proxima font-bold text-zinc-500">
            %
          </div>
        </div>

        <p className="mt-2 font-proxima text-xs text-zinc-400">
          Ejemplo: con 10%, un producto de
          $100.000 en MercadoLibre se
          mostrará a $90.000 en la web.
        </p>
      </div>
    </div>
  );
}