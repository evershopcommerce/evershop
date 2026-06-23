 
import { Image } from '@components/common/Image.js';
import {
  Editable,
  EditableImageOverlay,
  isPageBuilderActive
} from '@components/common/page-builder/index.js';
import { ImagePlus } from 'lucide-react';
import React, { useEffect, useState } from 'react';

/**
 * Category mosaic — a grid of category tiles, each with a full-bleed image
 * and label. Tile shape (square/portrait/landscape) is uniform. Layout is
 * either uniform (equal columns) or asymmetric (first tile spans 2 cols).
 *
 * No data fetch — spec stores image URLs and link URLs as free text. The
 * admin form uses the CategoryPicker to autofill URLs from real category
 * records, but storage and rendering treat them as plain strings.
 */

export type MosaicAspect = 'square' | 'portrait' | 'landscape';
export type MosaicLayout = 'uniform' | 'asymmetric';
export type MosaicLabelPosition = 'overlay' | 'below';

export interface MosaicTile {
  id: string;
  image: string;
  imageAlt: string;
  /** Natural intrinsic width of the tile image. Captured at pick time;
   *  drives the responsive srcSet. Falls back to a square-ish default. */
  imageWidth?: number | null;
  imageHeight?: number | null;
  label: string;
  link: string;
  newTab: boolean;
}

export interface CategoryMosaicProps {
  categoryMosaicWidget: {
    heading: string | null;
    tiles: MosaicTile[];
    columns: number | null;
    aspect: MosaicAspect;
    layout: MosaicLayout;
    labelPosition: MosaicLabelPosition;
  };
}

const ASPECT_PADDING: Record<MosaicAspect, string> = {
  square: '100%',
  portrait: '125%',
  landscape: '66.66%'
};

// Responsive column counts: 2-up on phones, scaling to the configured count on
// wider screens. Literal class strings so Tailwind's scanner emits them (a
// dynamic `grid-cols-${n}` would be purged).
const MOSAIC_GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
  5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
};

function effectiveColumns(
  tiles: MosaicTile[],
  columns: number | null
): number {
  if (columns && columns >= 2) return Math.min(columns, 6);
  return Math.min(Math.max(tiles.length, 1), 4);
}

// Page-builder-only placeholder. Mirrors the configured grid: N tile
// outlines with a label slot so the merchant sees the final grid shape
// before any images are picked.
function Placeholder({
  heading,
  count,
  aspectPadding,
  labelPosition
}: {
  heading: string | null;
  count: number;
  aspectPadding: string;
  labelPosition: MosaicLabelPosition;
}) {
  return (
    <div className="evershop-category-mosaic evershop-category-mosaic--placeholder py-6 md:py-10">
      {heading && (
        <Editable
          as="h2"
          fieldPath="settings.heading"
          className="evershop-category-mosaic__heading mb-4 text-2xl font-semibold tracking-tight"
        >
          {heading}
        </Editable>
      )}
      <div
        className={`evershop-category-mosaic__tiles grid gap-4 ${
          MOSAIC_GRID_COLS[count] ?? 'grid-cols-2 md:grid-cols-3'
        }`}
      >
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="evershop-category-mosaic__tile evershop-category-mosaic__tile--placeholder block">
            <div
              className="evershop-category-mosaic__placeholder relative flex items-center justify-center border-2 border-dashed border-foreground/15 bg-muted/30 text-muted-foreground"
              style={{ paddingTop: aspectPadding }}
            >
              <ImagePlus className="absolute h-6 w-6" />
              {labelPosition === 'overlay' && (
                <div className="evershop-category-mosaic__label evershop-category-mosaic__label--overlay absolute bottom-3 left-3 right-3 flex items-center justify-between text-muted-foreground">
                  <div className="h-2 w-20 rounded-sm bg-muted-foreground/40" />
                  <span aria-hidden="true">→</span>
                </div>
              )}
            </div>
            {labelPosition === 'below' && (
              <div className="evershop-category-mosaic__label evershop-category-mosaic__label--below mt-2 flex items-center justify-between">
                <div className="h-2 w-24 rounded-sm bg-muted-foreground/40" />
                <span aria-hidden="true" className="text-muted-foreground">
                  →
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CategoryMosaic({
  categoryMosaicWidget
}: CategoryMosaicProps) {
  const { heading, tiles = [], columns, aspect, layout, labelPosition } =
    categoryMosaicWidget;
  const [inPb, setInPb] = useState(false);
  useEffect(() => {
    setInPb(isPageBuilderActive());
  }, []);
  // Preserve the original settings index alongside the filter so inline
  // editing can write back to `settings.tiles.${originalIndex}.label`.
  // In the builder we keep imageless tiles so each one shows an inline
  // "add image" affordance; the live storefront still requires an image.
  const visible = tiles
    .map((tile, originalIndex) => ({ tile, originalIndex }))
    .filter(({ tile }) => tile && tile.label && (inPb || tile.image));
  if (visible.length === 0) {
    if (inPb) {
      // Use the configured-but-unfilled tiles' count when present so the
      // placeholder grid matches what the merchant will see once they pick
      // images. Falls back to 3 (the default tile count).
      const count = Math.max(1, Math.min(6, (tiles ?? []).length || 3));
      return (
        <Placeholder
          heading={heading}
          count={count}
          aspectPadding={ASPECT_PADDING[aspect ?? 'square']}
          labelPosition={labelPosition ?? 'overlay'}
        />
      );
    }
    return null;
  }

  const cols = effectiveColumns(
    visible.map(({ tile }) => tile),
    columns
  );
  const asymmetric = layout === 'asymmetric' && (cols === 3 || cols === 4);
  const aspectPadding = ASPECT_PADDING[aspect ?? 'square'];

  return (
    <div className="evershop-category-mosaic py-6 md:py-10">
      {heading && (
        <Editable
          as="h2"
          fieldPath="settings.heading"
          className="evershop-category-mosaic__heading mb-4 text-2xl font-semibold tracking-tight"
        >
          {heading}
        </Editable>
      )}
      <div
        className={`evershop-category-mosaic__tiles grid gap-4 ${
          MOSAIC_GRID_COLS[cols] ?? 'grid-cols-2 md:grid-cols-3'
        }`}
      >
        {visible.map(({ tile, originalIndex }, i) => {
          const span = asymmetric && i === 0 ? 2 : 1;
          const labelFieldPath = `settings.tiles.${originalIndex}.label`;
          return (
            <a
              key={tile.id}
              href={tile.link}
              target={tile.newTab ? '_blank' : undefined}
              rel={tile.newTab ? 'noopener noreferrer' : undefined}
              aria-label={`Shop ${tile.label}`}
              className="evershop-category-mosaic__tile group block overflow-hidden"
              style={{ gridColumn: `span ${span}` }}
            >
              <div
                className="evershop-category-mosaic__image-wrapper relative overflow-hidden bg-muted/30"
                style={{ paddingTop: aspectPadding }}
              >
                {tile.image ? (
                  <Image
                    src={tile.image}
                    alt={tile.imageAlt || ''}
                    width={
                      tile.imageWidth && tile.imageWidth > 0
                        ? tile.imageWidth
                        : 800
                    }
                    height={
                      tile.imageHeight && tile.imageHeight > 0
                        ? tile.imageHeight
                        : 800
                    }
                    objectFit="cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="evershop-category-mosaic__image absolute inset-0 h-full w-full transition-transform duration-200 group-hover:scale-[1.03]"
                    style={{ aspectRatio: 'auto' }}
                  />
                ) : (
                  <div className="evershop-category-mosaic__image-placeholder absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <ImagePlus className="h-6 w-6" />
                  </div>
                )}
                {labelPosition === 'overlay' && (
                  <>
                    <div
                      aria-hidden="true"
                      className="evershop-category-mosaic__overlay-tint pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"
                    />
                    <div className="evershop-category-mosaic__label evershop-category-mosaic__label--overlay absolute bottom-0 left-0 right-0 flex items-center justify-between p-4 text-white">
                      <Editable
                        as="span"
                        fieldPath={labelFieldPath}
                        className="text-base font-semibold"
                      >
                        {tile.label}
                      </Editable>
                      <span aria-hidden="true" className="text-base">
                        →
                      </span>
                    </div>
                  </>
                )}
                <EditableImageOverlay
                  empty={!tile.image}
                  desktop={{
                    urlField: `settings.tiles.${originalIndex}.image`,
                    widthField: `settings.tiles.${originalIndex}.imageWidth`,
                    heightField: `settings.tiles.${originalIndex}.imageHeight`
                  }}
                />
              </div>
              {labelPosition === 'below' && (
                <div className="evershop-category-mosaic__label evershop-category-mosaic__label--below mt-2 flex items-center justify-between text-foreground">
                  <Editable
                    as="span"
                    fieldPath={labelFieldPath}
                    className="text-sm font-semibold"
                  >
                    {tile.label}
                  </Editable>
                  <span aria-hidden="true">→</span>
                </div>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}

export const query = `
  query Query(
    $heading: String
    $tiles: JSON
    $columns: Int
    $aspect: String
    $layout: String
    $labelPosition: String
  ) {
    categoryMosaicWidget(
      heading: $heading
      tiles: $tiles
      columns: $columns
      aspect: $aspect
      layout: $layout
      labelPosition: $labelPosition
    ) {
      heading
      tiles
      columns
      aspect
      layout
      labelPosition
    }
  }
`;

export const variables = `{
  heading: getWidgetSetting("heading"),
  tiles: getWidgetSetting("tiles", []),
  columns: getWidgetSetting("columns"),
  aspect: getWidgetSetting("aspect", "square"),
  layout: getWidgetSetting("layout", "uniform"),
  labelPosition: getWidgetSetting("labelPosition", "overlay")
}`;
