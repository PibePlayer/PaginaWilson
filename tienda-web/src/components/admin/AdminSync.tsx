"use client";

import { useState } from "react";

interface SyncResult {
  total: number;
  synced: number;
  deactivated: number;
  completedAt: string;
}

interface AdminSyncProps {
  initialLastSyncAt: string | null;
}

export default function AdminSync({
  initialLastSyncAt,
}: AdminSyncProps) {
  const [lastSyncAt, setLastSyncAt] =
    useState<string | null>(
      initialLastSyncAt
    );

  const [syncing, setSyncing] =
    useState(false);

  const [result, setResult] =
    useState<SyncResult | null>(null);

  const [error, setError] =
    useState("");

  async function handleSync() {
    if (syncing) {
      return;
    }

    setSyncing(true);
    setResult(null);
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/mercadolibre/sync",
          {
            method: "POST",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "No se pudo sincronizar."
        );
      }

      const syncResult: SyncResult = {
        total: Number(data.total) || 0,
        synced: Number(data.synced) || 0,
        deactivated:
          Number(data.deactivated) || 0,
        completedAt:
          data.completedAt,
      };

      setResult(syncResult);

      setLastSyncAt(
        syncResult.completedAt
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo sincronizar."
      );
    } finally {
      setSyncing(false);
    }
  }

    function formatDate(value: string | null) {
        if (!value) {
            return "Todavía no sincronizado";
        }

        const date = new Date(value);

        const argentinaTimestamp =
            date.getTime() - 3 * 60 * 60 * 1000;

        const argentinaDate =
            new Date(argentinaTimestamp);

        const day = String(
            argentinaDate.getUTCDate()
        ).padStart(2, "0");

        const month = String(
            argentinaDate.getUTCMonth() + 1
        ).padStart(2, "0");

        const year =
            argentinaDate.getUTCFullYear();

        const hours = String(
            argentinaDate.getUTCHours()
        ).padStart(2, "0");

        const minutes = String(
            argentinaDate.getUTCMinutes()
        ).padStart(2, "0");

        const seconds = String(
            argentinaDate.getUTCSeconds()
        ).padStart(2, "0");

        return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
    }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-proxima text-xl font-bold text-zinc-950">
            MercadoLibre
          </h2>

          <p className="mt-2 font-proxima text-sm text-zinc-500">
            Sincronización de productos.
          </p>
        </div>

        <span className="rounded-full bg-green-50 px-3 py-1.5 font-proxima text-xs font-bold text-green-700">
          Conectado
        </span>
      </div>

      <div className="mt-6 rounded-xl bg-zinc-50 p-4">
        <p className="font-proxima text-xs font-bold uppercase tracking-wide text-zinc-400">
          Última sincronización
        </p>

        <p className="mt-1 font-proxima text-sm font-bold text-zinc-700">
          {formatDate(lastSyncAt)}
        </p>
      </div>

      <button
        type="button"
        onClick={handleSync}
        disabled={syncing}
        className="mt-5 rounded-xl bg-zinc-950 px-5 py-3 font-proxima text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {syncing
          ? "Sincronizando..."
          : "Sincronizar ahora"}
      </button>

      {syncing && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />

          <p className="font-proxima text-sm font-bold text-blue-700">
            Sincronizando productos con MercadoLibre...
          </p>
        </div>
      )}

      {result && !syncing && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="font-proxima text-sm font-bold text-green-800">
            Sincronización completada correctamente.
          </p>

          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <p className="font-proxima text-xs text-green-700">
                Encontrados
              </p>

              <p className="mt-1 font-proxima text-lg font-bold text-green-900">
                {result.total}
              </p>
            </div>

            <div>
              <p className="font-proxima text-xs text-green-700">
                Sincronizados
              </p>

              <p className="mt-1 font-proxima text-lg font-bold text-green-900">
                {result.synced}
              </p>
            </div>

            <div>
              <p className="font-proxima text-xs text-green-700">
                Desactivados
              </p>

              <p className="mt-1 font-proxima text-lg font-bold text-green-900">
                {result.deactivated}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && !syncing && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-proxima text-sm font-bold text-red-700">
            Error al sincronizar
          </p>

          <p className="mt-1 font-proxima text-sm text-red-600">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}