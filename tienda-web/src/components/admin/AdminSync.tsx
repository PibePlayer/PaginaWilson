"use client";

import { useEffect, useState } from "react";

interface SyncResult {
  total: number;
  synced: number;
  newProducts: number;
  descriptionsFound: number;
  descriptionsMissing: number;
  deactivated: number;
  completedAt: string;
}

interface DescriptionStats {
  total: number;
  withDescription: number;
  withoutDescription: number;
}

interface AdminSyncProps {
  initialLastSyncAt: string | null;
}

export default function AdminSync({
  initialLastSyncAt,
}: AdminSyncProps) {
  const [lastSyncAt, setLastSyncAt] =
    useState<string | null>(initialLastSyncAt);

  const [syncing, setSyncing] = useState(false);
  const [quickSyncing, setQuickSyncing] = useState(false);
  const [missingDescriptionsSyncing, setMissingDescriptionsSyncing] =
    useState(false);
  const [advancedSyncing, setAdvancedSyncing] = useState(false);

  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState("");

  const [descriptionStats, setDescriptionStats] =
    useState<DescriptionStats | null>(null);

  // Sincronización avanzada
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [prices, setPrices] = useState(true);
  const [descriptions, setDescriptions] = useState(false);
  const [discounts, setDiscounts] = useState(false);
  const [images, setImages] = useState(false);
  const [stock, setStock] = useState(false);
  const [productInfo, setProductInfo] = useState(false);
  const [category, setCategory] = useState(false);
  const [attributes, setAttributes] = useState(false);

  async function loadDescriptionStats() {
    try {
      const response = await fetch(
        "/api/admin/mercadolibre/descriptions",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (data.success && data.stats) {
        setDescriptionStats(data.stats);
      }
    } catch {
      // Informativo: no bloqueamos el panel.
    }
  }

  useEffect(() => {
    loadDescriptionStats();
  }, []);

  function formatDate(value: string | null) {
    if (!value) {
      return "Todavía no sincronizado";
    }

    const date = new Date(value);

    return date.toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
    });
  }

  async function executeSync(
    options: Record<string, boolean>,
    mode: "normal" | "quick" | "missing" | "advanced"
  ) {
    if (
      syncing ||
      quickSyncing ||
      missingDescriptionsSyncing ||
      advancedSyncing
    ) {
      return;
    }

    if (mode === "quick") {
      setQuickSyncing(true);
    } else if (mode === "missing") {
      setMissingDescriptionsSyncing(true);
    } else if (mode === "advanced") {
      setAdvancedSyncing(true);
    } else {
      setSyncing(true);
    }

    setResult(null);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/mercadolibre/sync",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(options),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo sincronizar."
        );
      }

      const syncResult: SyncResult = {
        total: Number(data.total) || 0,
        synced: Number(data.synced) || 0,
        newProducts: Number(data.newProducts) || 0,
        descriptionsFound:
          Number(data.descriptionsFound) || 0,
        descriptionsMissing:
          Number(data.descriptionsMissing) || 0,
        deactivated:
          Number(data.deactivated) || 0,
        completedAt: data.completedAt,
      };

      setResult(syncResult);
      setLastSyncAt(syncResult.completedAt);

      await loadDescriptionStats();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo sincronizar."
      );
    } finally {
      setSyncing(false);
      setQuickSyncing(false);
      setMissingDescriptionsSyncing(false);
      setAdvancedSyncing(false);
    }
  }

  async function handleFullSync() {
    await executeSync(
      {
        prices: true,
        descriptions: true,
        discounts: true,
        images: true,
        stock: true,
        productInfo: true,
        category: true,
        attributes: true,
      },
      "normal"
    );
  }

  async function handleQuickSync() {
    await executeSync(
      {
        quick: true,
      },
      "quick"
    );
  }

  async function handleMissingDescriptionsSync() {
    if (
      !descriptionStats ||
      descriptionStats.withoutDescription === 0
    ) {
      return;
    }

    await executeSync(
      {
        missingDescriptionsOnly: true,
      },
      "missing"
    );
  }

  async function handleAdvancedSync() {
    const hasSelection =
      prices ||
      descriptions ||
      discounts ||
      images ||
      stock ||
      productInfo ||
      category ||
      attributes;

    if (!hasSelection) {
      setError(
        "Seleccioná al menos una opción para sincronizar."
      );
      return;
    }

    // Cerramos el popup inmediatamente al confirmar.
    setAdvancedOpen(false);

    await executeSync(
      {
        prices,
        descriptions,
        discounts,
        images,
        stock,
        productInfo,
        category,
        attributes,
      },
      "advanced"
    );
  }

  const busy =
    syncing ||
    quickSyncing ||
    missingDescriptionsSyncing ||
    advancedSyncing;

  const advancedSelectionCount = [
    prices,
    descriptions,
    discounts,
    images,
    stock,
    productInfo,
    category,
    attributes,
  ].filter(Boolean).length;

  return (
    <>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-proxima text-xl font-bold text-zinc-950">
              MercadoLibre
            </h2>

            <p className="mt-1 font-proxima text-sm text-zinc-500">
              Sincronización de productos.
            </p>
          </div>

          <span className="rounded-full bg-green-50 px-3 py-1.5 font-proxima text-xs font-bold text-green-700">
            Conectado
          </span>
        </div>

        {/* Última sincronización */}
        <div className="mt-5 rounded-xl bg-zinc-50 p-4">
          <p className="font-proxima text-xs font-bold uppercase tracking-wide text-zinc-400">
            Última sincronización
          </p>

          <p className="mt-1 font-proxima text-sm font-bold text-zinc-700">
            {formatDate(lastSyncAt)}
          </p>
        </div>

        {/* Acciones principales */}
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Sincronización completa */}
          <button
            type="button"
            onClick={handleFullSync}
            disabled={busy}
            className="w-full rounded-xl bg-zinc-950 px-5 py-3 font-proxima text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {syncing
              ? "Sincronizando..."
              : "Sincronizar completo"}
          </button>

          {/* Sincronizar sin descripción */}
          {descriptionStats?.withoutDescription ? (
            <button
              type="button"
              onClick={handleMissingDescriptionsSync}
              disabled={busy}
              className="w-full rounded-xl border border-red-200 bg-white px-5 py-3 font-proxima text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {missingDescriptionsSyncing
                ? "Sincronizando..."
                : `Sincronizar sin descripción (${descriptionStats.withoutDescription})`}
            </button>
          ) : descriptionStats ? (
            <div className="flex w-full items-center justify-center rounded-xl bg-emerald-50 px-5 py-3">
              <p className="font-proxima text-sm font-bold text-emerald-700">
                Todas las descripciones están completas
              </p>
            </div>
          ) : (
            <div className="flex w-full items-center justify-center rounded-xl bg-zinc-50 px-5 py-3">
              <p className="font-proxima text-sm text-zinc-400">
                Cargando descripciones...
              </p>
            </div>
          )}
        </div>

        {/* Sincronización avanzada */}
        <div className="mt-5 border-t border-zinc-200 pt-5">
          <button
            type="button"
            onClick={() => {
              setError("");
              setAdvancedOpen(true);
            }}
            disabled={busy}
            className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div>
              <p className="font-proxima text-sm font-bold text-zinc-950">
                Sincronización avanzada
              </p>

              <p className="mt-1 font-proxima text-xs text-zinc-500">
                Elegí exactamente qué información actualizar.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {advancedSelectionCount > 0 && (
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-proxima text-xs font-bold text-zinc-600">
                  {advancedSelectionCount}
                </span>
              )}

              <span className="font-proxima text-lg font-bold text-zinc-400">
                →
              </span>
            </div>
          </button>
        </div>

        {/* Estado */}
        {busy && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3">
            <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />

            <p className="font-proxima text-sm font-bold text-blue-700">
              {quickSyncing
                ? "Buscando productos nuevos en MercadoLibre..."
                : missingDescriptionsSyncing
                  ? "Sincronizando productos sin descripción..."
                  : advancedSyncing
                    ? "Sincronizando selección avanzada..."
                    : "Sincronizando productos con MercadoLibre..."}
            </p>
          </div>
        )}

        {/* Resultado */}
        {result && !busy && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="font-proxima text-sm font-bold text-green-800">
              Sincronización completada correctamente.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
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
                  Nuevos
                </p>

                <p className="mt-1 font-proxima text-lg font-bold text-green-900">
                  {result.newProducts}
                </p>
              </div>

              <div>
                <p className="font-proxima text-xs text-green-700">
                  Sin descripción
                </p>

                <p className="mt-1 font-proxima text-lg font-bold text-green-900">
                  {result.descriptionsMissing}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !busy && (
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

      {/* Popup de sincronización avanzada */}
      {advancedOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !busy
            ) {
              setAdvancedOpen(false);
            }
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-zinc-200 px-5 py-4">
              <div>
                <h3 className="font-proxima text-lg font-bold text-zinc-950">
                  Sincronización avanzada
                </h3>

                <p className="mt-1 font-proxima text-xs text-zinc-500">
                  Seleccioná los datos que querés actualizar desde
                  MercadoLibre.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAdvancedOpen(false)}
                disabled={busy}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div className="max-h-[65vh] overflow-y-auto p-5">
              <div className="space-y-2">
                {/* Precios */}
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 p-3 transition hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={prices}
                    onChange={(event) =>
                      setPrices(event.target.checked)
                    }
                    disabled={busy}
                    className="h-4 w-4 accent-emerald-600"
                  />

                  <div>
                    <p className="font-proxima text-sm font-bold text-zinc-900">
                      Precios
                    </p>

                    <p className="font-proxima text-xs text-zinc-500">
                      Precio regular de MercadoLibre.
                    </p>
                  </div>
                </label>

                {/* Descuentos */}
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 p-3 transition hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={discounts}
                    onChange={(event) =>
                      setDiscounts(event.target.checked)
                    }
                    disabled={busy}
                    className="h-4 w-4 accent-emerald-600"
                  />

                  <div>
                    <p className="font-proxima text-sm font-bold text-zinc-900">
                      Descuentos de MercadoLibre
                    </p>

                    <p className="font-proxima text-xs text-zinc-500">
                      Precio promocional de MercadoLibre.
                    </p>
                  </div>
                </label>

                {/* Descripciones */}
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 p-3 transition hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={descriptions}
                    onChange={(event) =>
                      setDescriptions(event.target.checked)
                    }
                    disabled={busy}
                    className="h-4 w-4 accent-emerald-600"
                  />

                  <div>
                    <p className="font-proxima text-sm font-bold text-zinc-900">
                      Descripciones
                    </p>

                    <p className="font-proxima text-xs text-zinc-500">
                      Descripción publicada en MercadoLibre.
                    </p>
                  </div>
                </label>

                {/* Imágenes */}
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 p-3 transition hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={images}
                    onChange={(event) =>
                      setImages(event.target.checked)
                    }
                    disabled={busy}
                    className="h-4 w-4 accent-emerald-600"
                  />

                  <div>
                    <p className="font-proxima text-sm font-bold text-zinc-900">
                      Imágenes
                    </p>

                    <p className="font-proxima text-xs text-zinc-500">
                      Fotos y miniatura del producto.
                    </p>
                  </div>
                </label>

                {/* Stock */}
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 p-3 transition hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={stock}
                    onChange={(event) =>
                      setStock(event.target.checked)
                    }
                    disabled={busy}
                    className="h-4 w-4 accent-emerald-600"
                  />

                  <div>
                    <p className="font-proxima text-sm font-bold text-zinc-900">
                      Stock
                    </p>

                    <p className="font-proxima text-xs text-zinc-500">
                      Cantidad disponible.
                    </p>
                  </div>
                </label>

                {/* Información */}
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 p-3 transition hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={productInfo}
                    onChange={(event) =>
                      setProductInfo(event.target.checked)
                    }
                    disabled={busy}
                    className="h-4 w-4 accent-emerald-600"
                  />

                  <div>
                    <p className="font-proxima text-sm font-bold text-zinc-900">
                      Título y enlace
                    </p>

                    <p className="font-proxima text-xs text-zinc-500">
                      Título, enlace y estado de la publicación.
                    </p>
                  </div>
                </label>

                {/* Categoría */}
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 p-3 transition hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={category}
                    onChange={(event) =>
                      setCategory(event.target.checked)
                    }
                    disabled={busy}
                    className="h-4 w-4 accent-emerald-600"
                  />

                  <div>
                    <p className="font-proxima text-sm font-bold text-zinc-900">
                      Categoría
                    </p>

                    <p className="font-proxima text-xs text-zinc-500">
                      Categoría y nombre de categoría.
                    </p>
                  </div>
                </label>

                {/* Atributos */}
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 p-3 transition hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={attributes}
                    onChange={(event) =>
                      setAttributes(event.target.checked)
                    }
                    disabled={busy}
                    className="h-4 w-4 accent-emerald-600"
                  />

                  <div>
                    <p className="font-proxima text-sm font-bold text-zinc-900">
                      Atributos
                    </p>

                    <p className="font-proxima text-xs text-zinc-500">
                      Características técnicas del producto.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 border-t border-zinc-200 bg-zinc-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setAdvancedOpen(false)}
                disabled={busy}
                className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 font-proxima text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleAdvancedSync}
                disabled={busy}
                className="flex-1 rounded-xl bg-zinc-950 px-4 py-3 font-proxima text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {advancedSyncing
                  ? "Sincronizando..."
                  : "Sincronizar selección"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}