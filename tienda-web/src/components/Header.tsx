import { cookies } from "next/headers";

import HeaderClient from "@/components/HeaderClient";
import AdminActions from "@/components/AdminActions";

import {
  ADMIN_COOKIE_NAME,
  readAdminSessionCookie,
} from "@/lib/admin-auth";

export default async function Header() {
  const cookieStore = await cookies();

  const cookie = cookieStore.get(
    ADMIN_COOKIE_NAME
  )?.value;

  const session =
    readAdminSessionCookie(cookie);

  if (!session) {
    return <HeaderClient />;
  }

  return (
    <HeaderClient
      desktopAction={
        <AdminActions />
      }
    />
  );
}