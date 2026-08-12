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
  // 0-indexed `index` is within the small-tiles list. These spans only apply on
  // the desktop 4-column layout (`lg:`), where the hero occupies the left 2×2
  // block and the small tiles fill the right two columns across two rows. On
  // mobile/tablet the grid is 2-up and small tiles are always a single column.
  // Desktop fills of the right 2×2 area, by small-tile count:
  //   1 → fills the whole right half (mirrors the hero)
  //   2 → two full-height columns beside the hero
  //   3 → 2-up on top, the third spans the bottom row
  //   4 → clean 2×2
  if (totalSmall === 1) return 'lg:col-span-2 lg:row-span-2';
  if (totalSmall === 2) return 'lg:row-span-2';
  if (totalSmall === 3) {
    return index === 2 ? 'lg:col-span-2' : '';
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
          ? '(max-width: 1023px) 100vw, 50vw'
          : '(max-width: 1023px) 50vw, 25vw'
      }
      className="evershop-bento-grid__image absolute inset-0 h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.06]"
      // `height: 100%` defeats the shared <Image>'s inline `height: auto`,
      // which otherwise renders the img at its intrinsic aspect height —
      // a few px shorter than the tile — exposing the tile's backgroundColor
      // as a thin bar at the bottom. `aspectRatio: auto` clears its inline
      // aspect so `object-cover` can fill the whole tile.
      style={{ aspectRatio: 'auto', height: '100%' }}
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
      {/* Legibility scrim. Render it over a background image, and ALSO whenever
          the tile uses light text with no image — otherwise white copy sits on
          the raw (often light) background color at ~1.6:1. A bottom-anchored
          dark gradient gives the text a dark backing either way. */}
      {(tile.image || tile.textColor === 'light') && (
        <div
          aria-hidden="true"
          className={`evershop-bento-grid__overlay-tint pointer-events-none absolute inset-0 ${
            tile.textColor === 'light'
              ? 'bg-linear-to-t from-black/75 via-black/30 to-transparent'
              : 'bg-linear-to-t from-white/80 via-white/25 to-transparent'
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
        <div className="evershop-bento-grid__cta mt-3 inline-flex items-center gap-2 text-sm font-medium">
          <span className="underline underline-offset-2">
            {tile.link.label}
          </span>
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
      className={`evershop-bento-grid grid grid-cols-2 lg:grid-cols-4 ${gapClass} py-6 md:py-10`}
    >
      {/* Hero */}
      <a
        href={hero.tile.link.url}
        target={hero.tile.link.newTab ? '_blank' : undefined}
        rel={hero.tile.link.newTab ? 'noopener noreferrer' : undefined}
        aria-label={`${hero.tile.heading} — ${hero.tile.link.label}`}
        className="evershop-bento-grid__tile evershop-bento-grid__tile--hero group relative block overflow-hidden shadow-[0_12px_30px_rgba(0,0,0,0.12)] col-span-2 lg:row-span-2"
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
          className={`evershop-bento-grid__tile evershop-bento-grid__tile--small group relative block overflow-hidden shadow-[0_12px_30px_rgba(0,0,0,0.12)] ${smallTileSpan(
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
