"use client";

import AdminSettings from "@/components/admin/AdminSettings";
import AdminCategories from "@/components/admin/AdminCategories";
import AdminFeatured from "@/components/admin/AdminFeatured";
import AdminSync from "@/components/admin/AdminSync";
import AdminApplyChanges from "@/components/admin/AdminApplyChanges";
import {
  AdminChangesProvider,
} from "@/components/admin/AdminChangesContext";

interface AdminPanelProps {
  initialLastSyncAt: string | null;
}

export default function AdminPanel({
  initialLastSyncAt,
}: AdminPanelProps) {
  return (
    <AdminChangesProvider>
      <div className="grid gap-6 md:grid-cols-2">
        <AdminSync
          initialLastSyncAt={
            initialLastSyncAt
          }
        />

        <AdminSettings />

        <AdminCategories />

        <AdminFeatured />
      </div>

      <AdminApplyChanges />
    </AdminChangesProvider>
  );
}