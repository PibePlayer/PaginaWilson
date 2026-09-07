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

  const [selectedImage, setSelectedImage] = useState(
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
      {/* Imagen grande */}
      <div className="relative overflow-hidden rounded-xl bg-white">
        <img
          src={selectedImage}
          alt={title}
          className="aspect-[4/3] w-full object-contain p-6 sm:aspect-[16/10]"
        />
      </div>

      {/* Thumbnails */}
      {uniqueImages.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {uniqueImages.map((image, index) => {
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
          })}
        </div>
      )}
    </div>
  );
}