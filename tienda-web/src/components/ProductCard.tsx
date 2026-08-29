import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product & {
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
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Imagen */}
      <div className="relative aspect-square overflow-hidden bg-white">
        <img
          src={product.thumbnail}
          alt={product.title}
          className="h-full w-full object-contain p-6 transition duration-300 group-hover:scale-105"
        />

        {product.discountPercent > 0 && (
          <span className="absolute left-4 top-4 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white">
            -{product.discountPercent}%
          </span>
        )}
      </div>

      {/* Información */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 min-h-10 text-sm font-medium text-zinc-900">
          {product.title}
        </h3>

        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Precio MercadoLibre
          </p>

          <p className="mt-1 text-sm text-zinc-400 line-through">
            ${product.meliPrice.toLocaleString("es-AR")}
          </p>

          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Precio web
          </p>

          <p className="mt-1 text-2xl font-bold text-zinc-950">
            ${product.webPrice.toLocaleString("es-AR")}
          </p>

          {product.discountPercent > 0 && (
            <p className="mt-1 text-xs text-zinc-500">
              Ahorrás{" "}
              <span className="font-semibold text-emerald-600">
                {product.discountPercent}%
              </span>{" "}
              comprando directamente con nosotros.
            </p>
          )}
        </div>

        {/* Botones */}
        <div className="mt-auto space-y-2 pt-5">
          {whatsappPhone && (
            <a
              href={`https://wa.me/${whatsappPhone}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl bg-green-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-600"
            >
              Consultar por WhatsApp
            </a>
          )}

          <a
            href={product.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-[#FFE600]
              px-4
              py-3
              text-sm
              font-semibold
              text-[#333333]
              transition
              hover:bg-[#F5D900]
              active:scale-[0.98]
            "
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