import { Image } from '@components/common/Image.js';
import {
  Editable,
  EditableImageOverlay
} from '@components/common/page-builder/index.js';
import React from 'react';

/**
 * Bento grid — an asymmetric mosaic of CTA tiles. One large hero tile
 * plus 1–4 supporting tiles in a 3-column responsive grid. Tile count
 * adapts the layout (2/3/4/5 total).
 *
 *   - 2 tiles: hero spans column 1; small fills column 2 across both rows
 *   - 3 tiles: hero col-1, two smalls stacked in col-2
 *   - 4 tiles: hero col-1 (rows 1-2), three smalls in 2x2 right area
 *     (the 3rd small spans the full bottom width of the right area)
 *   - 5 tiles: hero col-1 (rows 1-2), four smalls in 2x2 right area
 *
 * Tile images render through the core `<Image>` component (absolute-
 * positioned to fill the tile under the content scrim) so they get
 * responsive srcSet behaviour. `aria-label` on each tile link carries
 * the semantics; the image is decorative.
 */

export type BentoGap = 'sm' | 'md' | 'lg';
export type BentoTextColor = 'light' | 'dark';

export interface BentoLink {
  label: string;
  url: string;
  newTab: boolean;
}

export interface BentoTile {
  id: string;
  size: 'lg' | 'sm';
  image: string | null;
  imageAlt: string;
  /** Natural intrinsic dimensions of `image`, captured at pick time. */
  imageWidth?: number | null;
  imageHeight?: number | null;
  backgroundColor: string;
  eyebrow: string | null;
  heading: string;
  body: string | null;
  link: BentoLink;
  textColor: BentoTextColor;
}

export interface BentoGridProps {
  bentoGridWidget: {
    tiles: BentoTile[];
    gap: BentoGap;
    minHeight: number;
  };
}

const GAP_CLASS: Record<BentoGap, string> = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6'
};

function smallTileSpan(totalSmall: number, index: number): string {
  // 0-indexed `index` is within the small-tiles list.
  // Layout rules:
  //   1 small → spans both rows
  //   2 smalls → stack vertically
  //   3 smalls → top-row 2-up, bottom row spans 2 columns
  //   4 smalls → 2×2
  if (totalSmall === 1) return 'md:row-span-2';
  if (totalSmall === 3) {
    return index === 2 ? 'md:col-span-2' : '';
  }
  return '';
}

function TileBackground({
  tile,
  isHero
}: {
  tile: BentoTile;
  isHero: boolean;
}) {
  if (!tile.image) return null;
  const fallbackWidth = isHero ? 1200 : 800;
  const fallbackHeight = isHero ? 1500 : 800;
  return (
    <Image
      src={tile.image}
      alt=""
      aria-hidden="true"
      width={
        tile.imageWidth && tile.imageWidth > 0 ? tile.imageWidth : fallbackWidth
      }
      height={
        tile.imageHeight && tile.imageHeight > 0
          ? tile.imageHeight
          : fallbackHeight
      }
      objectFit="cover"
      sizes={
        isHero
          ? '(max-width: 768px) 100vw, 33vw'
          : '(max-width: 768px) 100vw, 22vw'
      }
      className="evershop-bento-grid__image absolute inset-0 h-full w-full"
      style={{ aspectRatio: 'auto' }}
    />
  );
}

function TileContent({
  tile,
  isHero,
  originalIndex
}: {
  tile: BentoTile;
  isHero: boolean;
  originalIndex: number;
}) {
  const textClass =
    tile.textColor === 'light' ? 'text-white' : 'text-foreground';
  const base = `settings.tiles.${originalIndex}`;
  return (
    <div
      className={`evershop-bento-grid__content relative flex h-full flex-col justify-end gap-1 p-5 md:p-7 ${textClass}`}
    >
      {/* Scrim for legibility when there's a background image */}
      {tile.image && (
        <div
          aria-hidden="true"
          className={`evershop-bento-grid__overlay-tint pointer-events-none absolute inset-0 ${
            tile.textColor === 'light'
              ? 'bg-linear-to-t from-black/55 via-black/15 to-transparent'
              : 'bg-linear-to-t from-white/70 via-white/20 to-transparent'
          }`}
        />
      )}
      <div className="evershop-bento-grid__copy relative">
        {isHero && tile.eyebrow && (
          <Editable
            as="div"
            fieldPath={`${base}.eyebrow`}
            className="evershop-bento-grid__eyebrow mb-2 text-[11px] font-semibold uppercase tracking-widest opacity-90"
          >
            {tile.eyebrow}
          </Editable>
        )}
        <Editable
          as="div"
          fieldPath={`${base}.heading`}
          className={`evershop-bento-grid__heading font-semibold ${
            isHero ? 'text-xl md:text-2xl' : 'text-base'
          }`}
        >
          {tile.heading}
        </Editable>
        {isHero && tile.body && (
          <Editable
            as="p"
            fieldPath={`${base}.body`}
            multiline
            className="evershop-bento-grid__body mt-2 max-w-[24em] text-sm opacity-90"
          >
            {tile.body}
          </Editable>
        )}
        <div className="evershop-bento-grid__cta mt-3 inline-flex items-center gap-2 text-sm font-medium underline underline-offset-2">
          {tile.link.label}
          <span aria-hidden="true">→</span>
        </div>
      </div>
    </div>
  );
}

export default function BentoGrid({ bentoGridWidget }: BentoGridProps) {
  const { tiles = [], gap, minHeight } = bentoGridWidget;
  // Track the source index alongside the filter so inline edits write back
  // to `settings.tiles.${originalIndex}.{eyebrow|heading|body}`.
  const enriched = (tiles ?? [])
    .map((tile, originalIndex) => ({ tile, originalIndex }))
    .filter(({ tile }) => tile && tile.heading && tile.link?.url);
  if (enriched.length === 0) return null;
  const hero = enriched[0];
  const smalls = enriched.slice(1, 5);
  const totalSmall = smalls.length;
  const gapClass = GAP_CLASS[gap ?? 'md'];

  return (
    <div
      className={`evershop-bento-grid grid grid-cols-1 md:grid-cols-3 ${gapClass} py-6 md:py-10`}
    >
      {/* Hero */}
      <a
        href={hero.tile.link.url}
        target={hero.tile.link.newTab ? '_blank' : undefined}
        rel={hero.tile.link.newTab ? 'noopener noreferrer' : undefined}
        aria-label={`${hero.tile.heading} — ${hero.tile.link.label}`}
        className="evershop-bento-grid__tile evershop-bento-grid__tile--hero group relative block overflow-hidden rounded-md md:col-span-1 md:row-span-2"
        style={{
          backgroundColor: hero.tile.backgroundColor,
          minHeight
        }}
      >
        <TileBackground tile={hero.tile} isHero />
        <TileContent
          tile={hero.tile}
          isHero
          originalIndex={hero.originalIndex}
        />
        <EditableImageOverlay
          empty={!hero.tile.image}
          desktop={{
            urlField: `settings.tiles.${hero.originalIndex}.image`,
            widthField: `settings.tiles.${hero.originalIndex}.imageWidth`,
            heightField: `settings.tiles.${hero.originalIndex}.imageHeight`
          }}
        />
      </a>
      {/* Smalls */}
      {smalls.map(({ tile, originalIndex }, i) => (
        <a
          key={tile.id}
          href={tile.link.url}
          target={tile.link.newTab ? '_blank' : undefined}
          rel={tile.link.newTab ? 'noopener noreferrer' : undefined}
          aria-label={`${tile.heading} — ${tile.link.label}`}
          className={`evershop-bento-grid__tile evershop-bento-grid__tile--small group relative block overflow-hidden rounded-md ${smallTileSpan(
            totalSmall,
            i
          )}`}
          style={{
            backgroundColor: tile.backgroundColor,
            minHeight: Math.round(minHeight / 2)
          }}
        >
          <TileBackground tile={tile} isHero={false} />
          <TileContent
            tile={tile}
            isHero={false}
            originalIndex={originalIndex}
          />
          <EditableImageOverlay
            empty={!tile.image}
            desktop={{
              urlField: `settings.tiles.${originalIndex}.image`,
              widthField: `settings.tiles.${originalIndex}.imageWidth`,
              heightField: `settings.tiles.${originalIndex}.imageHeight`
            }}
          />
        </a>
      ))}
    </div>
  );
}

export const query = `
  query Query($tiles: JSON, $gap: String, $minHeight: Float) {
    bentoGridWidget(tiles: $tiles, gap: $gap, minHeight: $minHeight) {
      tiles
      gap
      minHeight
    }
  }
`;

export const variables = `{
  tiles: getWidgetSetting("tiles", []),
  gap: getWidgetSetting("gap", "md"),
  minHeight: getWidgetSetting("minHeight", 360)
}`;
