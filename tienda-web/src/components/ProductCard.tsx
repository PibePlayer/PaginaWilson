import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Omit<Product, "updatedAt"> & {
    updatedAt: string;
    webPrice: number;
    discountPercent: number;
  };
}

export default function ProductCard({
  product,
}: ProductCardProps) {
  const whatsappPhone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE;

  const whatsappMessage = encodeURIComponent(
    `Hola! Quisiera consultar por ${product.title}.`
  );

  return (
    <article className="font-proxima group flex h-full min-w-[300px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl">

      {/* Imagen */}
      <div className="relative aspect-[4/3] overflow-hidden bg-white">
        <img
          src={product.thumbnail}
          alt={product.title}
          className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-105"
        />

        {/* Descuento */}
        {product.discountPercent > 0 && (
          <span className="absolute right-4 top-4 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white shadow-sm">
            -{product.discountPercent}%
          </span>
        )}
      </div>

      {/* Información */}
      <div className="flex flex-1 flex-col p-5">

        {/* Nombre */}
        <h3 className="line-clamp-2 min-h-10 text-base font-bold leading-5 text-zinc-900">
          {product.title}
        </h3>

        {/* Precios */}
        <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200">
          <div className="grid grid-cols-2">

            {/* MercadoLibre */}
            <div className="border-r border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                MercadoLibre
              </p>

              <p className="mt-1 text-base font-bold text-zinc-400 line-through">
                ${product.meliPrice.toLocaleString("es-AR")}
              </p>
            </div>

            {/* Precio Web */}
            <div className="bg-emerald-600 px-4 py-3 text-white">
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/90">
                Precio Web
              </p>

              <p className="mt-1 text-xl font-bold tracking-tight text-white">
                ${product.webPrice.toLocaleString("es-AR")}
              </p>
            </div>

          </div>
        </div>

        {/* Aclaración */}
        <p className="mt-2 text-xs font-bold text-zinc-500">
          Precio especial comprando por nuestra web.
        </p>

        {/* Botones */}
        <div className="mt-auto space-y-2 pt-5">

          {/* WhatsApp */}
          {whatsappPhone && (
            <a
              href={`https://wa.me/${whatsappPhone}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-green-600 active:scale-[0.98]"
            >
              <img
              src="/whatsapp.svg"
              alt=""
              aria-hidden="true"
              className="h-6 w-6"
              />

              Consultar por WhatsApp
            </a>
          )}

          {/* MercadoLibre */}
          <a
            href={product.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#FFE600] px-4 py-3 text-sm font-bold text-[#333333] transition hover:bg-[#F5D900] active:scale-[0.98]"
          >
            <img
              src="/mercadolibre.svg"
              alt=""
              aria-hidden="true"
              className="h-6 w-6"
            />

            Ver en MercadoLibre
          </a>

        </div>
      </div>
    </article>
  );
}
