"use client";

import { useState } from "react";

interface ProductGalleryProps {
  images: string[];
  title: string;
}

export default function ProductGallery({
  images,
  title,
}: ProductGalleryProps) {
  const uniqueImages = Array.from(
    new Set(images.filter(Boolean))
  ).slice(0, 8);

  const [selectedImage, setSelectedImage] =
    useState(
      uniqueImages[0] ?? ""
    );

  if (uniqueImages.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center bg-white text-sm text-zinc-400">
        Sin imagen disponible
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-white">
        <img
          src={selectedImage}
          alt={title}
          className="h-[clamp(300px,35vw,520px)] w-full object-contain p-6"
          decoding="async"
        />
      </div>

      {uniqueImages.length > 1 && (
        <div
          className="mt-4 flex gap-3 overflow-x-auto pb-2"
          aria-label="Imágenes del producto"
        >
          {uniqueImages.map(
            (image, index) => {
              const isSelected =
                image === selectedImage;

              return (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onMouseEnter={() =>
                    setSelectedImage(image)
                  }
                  onFocus={() =>
                    setSelectedImage(image)
                  }
                  onClick={() =>
                    setSelectedImage(image)
                  }
                  className={`relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white transition ${
                    isSelected
                      ? "border-2 border-emerald-600"
                      : "border border-zinc-200 hover:border-zinc-400"
                  }`}
                  aria-label={`Ver imagen ${
                    index + 1
                  } de ${uniqueImages.length}`}
                  aria-pressed={isSelected}
                >
                  <img
                    src={image}
                    alt={`${title} - miniatura ${
                      index + 1
                    }`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain p-1.5"
                  />
                </button>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}