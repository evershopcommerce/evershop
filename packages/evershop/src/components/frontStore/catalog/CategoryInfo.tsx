import Area from '@components/common/Area.js';
import { Editor } from '@components/common/Editor.js';
import { Image } from '@components/common/Image.js';
import { useCategory } from '@components/frontStore/catalog/CategoryContext.js';
import React from 'react';

export function CategoryInfo() {
  const { name, description, image } = useCategory();
  return (
    <>
      <Area id="beforeCategoryInfo" />
      {/* Re-skin (2026-07-10): image becomes a rounded hero with a dark scrim
          and the name/description overlaid (reference). No image → a plain
          title + prose description. */}
      <div className="category__general mb-8">
        {image ? (
          <div className="category__hero relative h-48 w-full overflow-hidden rounded-2xl border border-border md:h-56">
            {/* The core <Image> forces inline `height:auto` + aspectRatio, which
                beats Tailwind height classes — so we fix the height on the
                wrapper and absolutely fill it, overriding those inline styles. */}
            <Image
              className="category__image absolute inset-0 h-full w-full"
              src={image.url}
              alt={image.alt || name}
              width={1800}
              height={1029}
              objectFit="cover"
              priority={true}
              style={{ height: '100%', width: '100%', aspectRatio: 'auto' }}
            />
            {/* Legibility tint for the white overlay text — works on ANY image,
                including light/white ones. A flat scrim can't do this (35% black
                over white is still ~65% white). Instead: a faint global scrim
                plus a dark→transparent gradient anchored to the left, where the
                (left-aligned, vertically-centered) title/description sit, so the
                text zone is always dark enough while the rest of the image shows. */}
            <div className="absolute inset-0 bg-black/20 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center px-8 text-white">
              <h1 className="category__name text-3xl font-semibold tracking-tight text-white">
                {name}
              </h1>
              <div className="category__description mt-1 max-w-lg text-sm text-white/90 [&_*]:text-white/90">
                <Editor rows={description} />
              </div>
            </div>
          </div>
        ) : (
          <div className="category__info">
            <h1 className="category__name text-3xl font-semibold tracking-tight">
              {name}
            </h1>
            <div className="category__description prose prose-base mt-2 max-w-none text-muted-foreground">
              <Editor rows={description} />
            </div>
          </div>
        )}
      </div>
      <Area id="afterCategoryInfo" />
    </>
  );
}
