import { requireAdminPage } from "@/lib/require-admin";
import { withDatabase } from "@/lib/db";

import AdminPanel from "@/components/admin/AdminPanel";

export default async function AdminPage() {
  const session =
    await requireAdminPage();

  const storeSettings =
    await withDatabase(
      async (db) =>
        db
          .collection("settings")
          .findOne({
            key: "store",
          })
    );

  const lastSyncAt =
    storeSettings?.lastSyncAt
      ? new Date(
          storeSettings.lastSyncAt
        ).toISOString()
      : null;

  return (
    <main className="min-h-screen bg-zinc-100 px-6 pb-24 pt-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="font-proxima text-sm font-bold uppercase tracking-wider text-zinc-500">
            Administración
          </p>

          <h1 className="mt-2 font-proxima text-4xl font-bold tracking-tight text-zinc-950">
            Panel de administración
          </h1>

          <p className="mt-3 font-proxima text-zinc-500">
            Gestioná productos, precios,
            categorías y sincronización.
          </p>
        </div>

        <AdminPanel
          initialLastSyncAt={
            lastSyncAt
          }
        />

        <p className="mt-8 text-xs text-zinc-400">
          Sesión válida hasta:{" "}
          {new Date(
            session.expiresAt * 1000
          ).toLocaleString(
            "es-AR",
            {
              timeZone:
                "America/Argentina/Buenos_Aires",
            }
          )}
        </p>
      </div>
    </main>
  );
}