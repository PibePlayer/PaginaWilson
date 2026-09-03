"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const phone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE;

export default function WhatsAppButton() {
  const pathname = usePathname();

  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    !phone
  ) {
    return null;
  }

  const message = encodeURIComponent(
    "Hola! Quisiera hacer una consulta."
  );

  return (
    <Link
      href={`https://wa.me/${phone}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactarnos por WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition duration-200 hover:scale-110 hover:shadow-xl active:scale-95"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.1-.198.05-.372-.025-.521-.075-.149-.67-1.611-.916-2.206-.242-.579-.487-.5-.67-.51-.173-.008-.372-.01-.57-.01-.198 0-.52.074-.793.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982 1-3.648-.235-.374a9.856 9.856 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.89-9.884 2.64 0 5.122 1.029 6.988 2.896a9.825 9.825 0 012.893 6.994c-.002 5.45-4.437 9.886-9.889 9.886m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.89c0 2.096.547 4.142 1.588 5.946L.057 24l6.31-1.654a11.875 11.875 0 005.68 1.448h.005c6.554 0 11.89-5.335 11.893-11.89a11.846 11.846 0 00-3.481-8.416" />
      </svg>
    </Link>
  );
}