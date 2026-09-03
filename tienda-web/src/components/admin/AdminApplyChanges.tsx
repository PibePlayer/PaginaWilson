"use client";

import { useState } from "react";

import {
  useAdminChanges,
} from "@/components/admin/AdminChangesContext";

export default function AdminApplyChanges() {
  const {
    changes,
    hasChanges,
    changeCount,
    clearChanges,
  } = useAdminChanges();

  const [applying, setApplying] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function applyChanges() {
    if (!hasChanges || applying) {
      return;
    }

    try {
      setApplying(true);
      setError(null);

      const response =
        await fetch(
          "/api/admin/apply-changes",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              changes
            ),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "No se pudieron aplicar los cambios."
        );
      }

      clearChanges();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron aplicar los cambios."
      );
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      {error && (
        <div
          className={`fixed bottom-24 right-6 z-50 max-w-sm rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-proxima text-sm font-bold text-red-700 shadow-xl transition-all duration-300 ${
            error
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-4 opacity-0"
          }`}
        >
          {error}
        </div>
      )}

      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ease-out ${
          hasChanges
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-6 scale-95 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={applyChanges}
          disabled={
            applying || !hasChanges
          }
          className="flex items-center gap-3 rounded-2xl bg-[#45d354] px-5 py-3.5 font-proxima text-sm font-bold text-white shadow-xl transition hover:bg-[#35bd48] hover:shadow-2xl active:scale-95 disabled:cursor-wait disabled:opacity-70"
        >
          <span>
            {applying
              ? "Aplicando..."
              : "Aplicar cambios"}
          </span>

          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-[#22963a]">
            {changeCount}
          </span>
        </button>
      </div>
    </>
  );
}