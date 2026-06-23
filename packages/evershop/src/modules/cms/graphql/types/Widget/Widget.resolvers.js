import { select } from '@evershop/postgres-query-builder';
import sanitizeHtml from 'sanitize-html';
import uniqid from 'uniqid';
import { error } from '../../../../../lib/log/logger.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import {
  CatalogUrn,
  CmsUrn,
  UrnService
} from '../../../../../lib/urn/index.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getActiveTheme } from '../../../../../lib/util/getActiveTheme.js';
import { resolveLink } from '../../../../../lib/widget/linkResolver.js';
import {
  getEnabledWidgets,
  getWidget
} from '../../../../../lib/widget/widgetManager.js';
import { applyOverlayToWidgets } from '../../../../pageBuilder/services/applyOverlayToWidgets.js';
import { loadActiveOps } from '../../../../pageBuilder/services/loadActiveOps.js';
import { getWidgetsBaseQuery } from '../../../services/getWidgetsBaseQuery.js';
import { WidgetCollection } from '../../../services/WidgetCollection.js';

const COLUMNS_AREA_PREFIX = 'columnsContainer_';

/**
 * Resolve a CTA-shaped object ({ url, label, newTab, style, kind }) by
 * passing its `url` through the link loaders. Null/empty CTA → null.
 */
async function resolveCtaUrl(cta, linkLoaders) {
  if (!cta || typeof cta !== 'object') return null;
  const url = await resolveLink(cta.url, linkLoaders);
  if (!url) return null;
  return { ...cta, url };
}

/**
 * Resolve a link-shaped object ({ url, label, newTab }) by passing its
 * `url` through the link loaders. Null when missing/invalid so the
 * storefront can suppress the anchor entirely.
 */
async function resolveLinkObject(link, linkLoaders) {
  if (!link || typeof link !== 'object' || !link.url) return null;
  const url = await resolveLink(link.url, linkLoaders);
  if (!url) return null;
  return { ...link, url };
}

/**
 * Build the per-column children array for a container widget out of
 * already-overlay-applied widget + placement maps. Mirrors the SQL-based
 * `Widget.columns` resolver below — same prefix parsing, same ordering —
 * but operates on in-memory maps so the overlay merge is preserved.
 *
 * Each child also gets its own `_overlayPlacements` so a downstream
 * `Widget.placements` field resolution doesn't fall back to source SQL.
 * Children of children (nested containers) get `_overlayColumns` set
 * recursively so the Layers panel can render arbitrary nesting depth.
 */
function computeOverlayColumns(parentUuid, widgetMap, placementMap) {
  const prefix = `${COLUMNS_AREA_PREFIX}${parentUuid}_col_`;
  const groups = new Map();
  for (const p of placementMap.values()) {
    const area = p.area || '';
    if (!area.startsWith(prefix)) continue;
    const child = widgetMap.get(p.widget_instance_uuid);
    if (!child || child.status === false) continue;
    const idxRaw = area.slice(prefix.length);
    const idx = Number.parseInt(idxRaw, 10);
    if (!Number.isFinite(idx)) continue;
    if (!groups.has(idx)) groups.set(idx, []);
    groups.get(idx).push({ child, sortOrder: p.sort_order ?? 0 });
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, entries]) => {
      entries.sort((a, b) => a.sortOrder - b.sortOrder);
      return {
        index,
        widgets: entries.map(({ child }) => {
          const camel = camelCase(child);
          camel._overlayPlacements = [...placementMap.values()]
            .filter((p) => p.widget_instance_uuid === child.uuid)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map(camelCase);
          camel._overlayColumns = computeOverlayColumns(
            child.uuid,
            widgetMap,
            placementMap
          );
          return camel;
        })
      };
    });
}

export default {
  Query: {
    widget: async (root, { id }, { pool }) => {
      const query = getWidgetsBaseQuery();
      // Renamed in cms migration 1.3.0: widget_id → widget_instance_id.
      query.where('widget_instance_id', '=', id);
      const widget = await query.load(pool);
      return widget ? camelCase(widget) : null;
    },
    widgetByUuid: async (_, { uuid }, { pool }) => {
      const query = getWidgetsBaseQuery();
      query.where('uuid', '=', uuid);
      const widget = await query.load(pool);
      return widget ? camelCase(widget) : null;
    },
    widgets: async (_, { filters = [] }, { user }) => {
      const query = getWidgetsBaseQuery();
      // Theme isolation (spec 04 § 2): the widget admin grid lists only
      // widgets in the currently-active theme. A widget tagged for a dormant
      // theme — or the NULL bucket when no custom theme is active — is hidden
      // here; switch the active theme to manage it.
      const activeTheme = getActiveTheme();
      if (activeTheme === null) {
        query.andWhere('widget_instance.theme', 'IS NULL', null);
      } else {
        query.andWhere('widget_instance.theme', '=', activeTheme);
      }
      const root = new WidgetCollection(query);
      await root.init(filters, !!user);
      return root;
    },
    /**
     * Page-builder layers panel: top-level widgets for a route. Returns
     * one entry per widget (de-duplicated across multiple placements);
     * children of container widgets are returned nested in each entry's
     * `columns` field via the parent value, not as separate top-level
     * entries.
     *
     * When `changeset` is provided, the resolver loads source widget +
     * placement state into in-memory maps, applies that changeset's draft
     * ops via `applyOverlayToWidgets`, then filters/groups the merged
     * state. Result matches what the iframe renders for the same token.
     * Without `changeset`, the resolver still goes through the same code
     * path but with zero ops applied — equivalent to source-only.
     *
     * The Widget.placements / Widget.columns field resolvers honor the
     * `_overlayPlacements` / `_overlayColumns` private fields set here so
     * they don't re-query source SQL and lose the overlay merge.
     */
    widgetsForRoute: async (_, { route, changeset }, { pool }) => {
      // 1. Load source widget_instance state.
      const widgetRows = await pool.query(
        `SELECT widget_instance_id, uuid, name, type, settings, status,
                created_at, updated_at
         FROM widget_instance`
      );
      const widgetMap = new Map();
      for (const row of widgetRows.rows) {
        widgetMap.set(row.uuid, row);
      }

      // 2. Load source widget_placement state (with widget_instance.uuid
      //    joined so the overlay engine doesn't need to translate ids).
      const placementRows = await pool.query(
        `SELECT p.widget_placement_id, p.uuid, p.route, p.area, p.sort_order,
                p.entity_urn, wi.uuid AS widget_instance_uuid
         FROM widget_placement p
         INNER JOIN widget_instance wi
                 ON wi.widget_instance_id = p.widget_instance_id`
      );
      const placementMap = new Map();
      for (const row of placementRows.rows) {
        placementMap.set(row.uuid, row);
      }

      // 3. Apply overlay (preview changeset only — admin's draft state).
      //    Active rollouts are NOT applied here on purpose: the page-builder
      //    iframe also doesn't apply rollouts when a preview token is
      //    present (loadStorefrontWidgets in cms/services/widget). Layers
      //    must match the iframe.
      if (typeof changeset === 'string' && changeset.length > 0) {
        const { ops, changesetTheme } = await loadActiveOps({
          previewChangesetToken: changeset
        });
        // Only overlay when the previewed changeset matches the active theme
        // (spec 04 § 9.4). `changesetTheme === undefined` means the token
        // resolved to nothing — there's no overlay to apply anyway.
        const activeTheme = getActiveTheme();
        if (
          (changesetTheme === undefined || changesetTheme === activeTheme) &&
          ops.length > 0
        ) {
          applyOverlayToWidgets(widgetMap, placementMap, ops);
        }
      }

      // 4. Bucket placements per widget so we can compute the per-widget
      //    children + min_sort + filtered placements list in one pass.
      const placementsByWidget = new Map();
      for (const p of placementMap.values()) {
        const arr = placementsByWidget.get(p.widget_instance_uuid) ?? [];
        arr.push(p);
        placementsByWidget.set(p.widget_instance_uuid, arr);
      }

      // 5. Walk widgets, keeping only those with at least one route-matching,
      //    non-entity-scoped, non-synthetic placement. Compute min sort for
      //    ordering. Attach overlay-applied placements + columns as private
      //    fields the GraphQL field resolvers will short-circuit on.
      const result = [];
      for (const widget of widgetMap.values()) {
        if (widget.status === false) continue;
        const placements = placementsByWidget.get(widget.uuid) ?? [];
        const visiblePlacements = placements.filter(
          (p) =>
            p.entity_urn == null &&
            (p.route === 'all' || p.route === route) &&
            !(p.area || '').startsWith(COLUMNS_AREA_PREFIX)
        );
        if (visiblePlacements.length === 0) continue;
        const minSort = visiblePlacements.reduce(
          (m, p) => Math.min(m, p.sort_order ?? 0),
          Number.POSITIVE_INFINITY
        );
        const camel = camelCase(widget);
        camel._overlayPlacements = placements
          .slice()
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map(camelCase);
        camel._overlayColumns = computeOverlayColumns(
          widget.uuid,
          widgetMap,
          placementMap
        );
        result.push({ widget: camel, minSort });
      }

      result.sort((a, b) => a.minSort - b.minSort);
      return result.map((r) => r.widget);
    },
    widgetTypes: () => {
      const types = getEnabledWidgets();
      return types.map((row) => ({
        code: row.type,
        // English source strings (registered at bootstrap). They are localized at
        // the admin render site via _(), not here — widgetTypes is also served over
        // the public storefront GraphQL context (store language), so translating in
        // this shared resolver would localize to the wrong language.
        name: row.name,
        description: row.description,
        category: row.category ?? null,
        icon: row.icon ?? null,
        settingComponent: row.settingComponent,
        component: row.component,
        // Field name matches the schema's `defaultSetting` (singular). The
        // internal registration shape uses `defaultSettings` (plural).
        // Without this mapping the GraphQL field resolves to null and
        // freshly-added widgets get `settings: {}` instead of the
        // registered defaults — the widget renders invisible.
        defaultSetting: row.defaultSettings,
        createWidgetUrl: buildUrl('widgetNew', { type: row.type })
      }));
    },
    widgetType: (_, { code }) => {
      const types = getEnabledWidgets();
      const type = types.find((row) => row.type === code);
      return type
        ? {
            code: type.type,
            name: type.name,
            description: type.description,
            category: type.category ?? null,
            icon: type.icon ?? null,
            settingComponent: type.settingComponent,
            component: type.component,
            defaultSetting: type.defaultSettings,
            createWidgetUrl: buildUrl('widgetNew', { type: type.type })
          }
        : null;
    },
    columnsWidget(
      _,
      { columnCount, gap, ratio, background, padding, contentPosition }
    ) {
      // `ratio` (e.g. "1-2-1") is the new authoritative descriptor. When
      // absent on a pre-existing widget, derive an even split from the
      // legacy `columnCount` so old data keeps rendering.
      const rawRatio = typeof ratio === 'string' && ratio.length > 0
        ? ratio
        : null;
      const parts = rawRatio
        ? rawRatio
            .split('-')
            .map((p) => Math.max(1, Math.min(6, Number(p) || 1)))
        : [];
      const effectiveCount = parts.length
        ? parts.length
        : Math.max(1, Math.min(4, Number(columnCount) || 2));
      const effectiveRatio = parts.length
        ? parts.join('-')
        : Array.from({ length: effectiveCount }, () => '1').join('-');
      const allowedAnchors = [
        'tl',
        'tc',
        'tr',
        'ml',
        'mc',
        'mr',
        'bl',
        'bc',
        'br'
      ];
      return {
        // Inputs widened to Float so a slider mid-drag (e.g. 200.5) doesn't
        // crash GraphQL validation; outputs round to a clean integer.
        columnCount: Math.round(effectiveCount),
        gap: Math.round(Math.max(0, Math.min(80, Number(gap) ?? 16))),
        ratio: effectiveRatio,
        background:
          typeof background === 'string' && background.length > 0
            ? background
            : null,
        padding:
          typeof padding === 'string' && padding.length > 0 ? padding : 'none',
        contentPosition: allowedAnchors.includes(contentPosition)
          ? contentPosition
          : 'mc'
      };
    },
    textWidget(_, { text, className }) {
      // The storefront `TextBlock` component expects `text` to be a Row[]
      // (the EditorJS row/column/blocks tree). Settings stored by the
      // setting form are JSON-stringified arrays; defaults registered in
      // `bootstrap.ts` may also arrive as raw strings or already-parsed
      // arrays (JSONB column). Normalize all four cases here so the
      // component never has to defend.
      const wrapPlainText = (str) => [
        {
          size: 12,
          columns: [
            {
              size: 12,
              data: { blocks: [{ type: 'paragraph', data: { text: str } }] }
            }
          ]
        }
      ];
      if (Array.isArray(text)) {
        return { text, className };
      }
      if (typeof text === 'string') {
        const trimmed = text.trim();
        if (!trimmed) return { text: [], className };
        // Looks like JSON? Try to parse. Anything else is plain prose —
        // wrap it as a single-paragraph row so the user sees their default.
        const looksJson =
          (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
          (trimmed.startsWith('{') && trimmed.endsWith('}'));
        if (looksJson) {
          try {
            const parsed = JSON.parse(trimmed);
            return {
              text: Array.isArray(parsed) ? parsed : wrapPlainText(text),
              className
            };
          } catch {
            // fall through to plain-text wrap
          }
        }
        return { text: wrapPlainText(text), className };
      }
      return { text: [], className };
    },
    bannerWidget: async (
      _,
      {
        src,
        alignment,
        width,
        height,
        alt,
        link,
        eyebrow,
        heading,
        subText,
        contentPosition,
        overlayTint,
        overlayOpacity,
        cta,
        cta2,
        mobileImage,
        mobileImageWidth,
        mobileImageHeight
      },
      { linkLoaders }
    ) => {
      const allowedAnchors = [
        'tl',
        'tc',
        'tr',
        'ml',
        'mc',
        'mr',
        'bl',
        'bc',
        'br'
      ];
      const allowedTints = ['none', 'dark', 'light', 'gradient'];
      const op = Number(overlayOpacity);
      const mw = Number(mobileImageWidth);
      const mh = Number(mobileImageHeight);
      // resolveLink: URN → current URL (per-request batched), plain URL passthrough.
      const [resolvedLink, resolvedCta, resolvedCta2] = await Promise.all([
        resolveLink(link, linkLoaders),
        resolveCtaUrl(cta, linkLoaders),
        resolveCtaUrl(cta2, linkLoaders)
      ]);
      return {
        src,
        alignment,
        width,
        height,
        alt,
        link: resolvedLink,
        eyebrow: eyebrow || null,
        heading: heading || null,
        subText: subText || null,
        contentPosition: allowedAnchors.includes(contentPosition)
          ? contentPosition
          : 'mc',
        overlayTint: allowedTints.includes(overlayTint) ? overlayTint : 'none',
        overlayOpacity: Number.isFinite(op)
          ? Math.min(1, Math.max(0, op))
          : 0.3,
        cta: resolvedCta,
        cta2: resolvedCta2,
        mobileImage:
          typeof mobileImage === 'string' && mobileImage.length > 0
            ? mobileImage
            : null,
        mobileImageWidth:
          Number.isFinite(mw) && mw > 0 ? Math.round(mw) : null,
        mobileImageHeight:
          Number.isFinite(mh) && mh > 0 ? Math.round(mh) : null
      };
    },
    slideshowWidget: async (
      _,
      {
        slides,
        autoplay,
        autoplaySpeed,
        arrows,
        dots,
        transition,
        transitionSpeed,
        pauseOnHover,
        pauseOnInteraction,
        arrowsStyle,
        dotsStyle,
        aspectRatio,
        defaultContentPosition,
        defaultOverlayTint,
        defaultOverlayOpacity
      },
      { linkLoaders }
    ) => {
      // Defaults are picked so a slideshow created before these fields
      // existed renders the same as before:
      //   - transition slide, 500ms, pauseOnHover true, no pauseOnInteraction
      //   - arrowsStyle / dotsStyle derived from the legacy arrows / dots
      //     booleans when the new style fields are absent
      //   - aspectRatio "auto" mirrors slick's adaptiveHeight behavior
      //   - default content position "mc" mirrors the old centered overlay
      //   - default overlay is none — the prior render relied on
      //     text-shadow only.
      // Resolve slide CTAs (buttonLink / button2Link) and the
      // optional wholeSlideLink fallback. Both fields are plain strings
      // — URN or plain URL — so resolveLink handles each value.
      const rawSlides = Array.isArray(slides) ? slides : [];
      const resolvedSlides = await Promise.all(
        rawSlides.map(async (s) => {
          if (!s || typeof s !== 'object') return s;
          const [buttonLink, button2Link] = await Promise.all([
            resolveLink(s.buttonLink, linkLoaders),
            resolveLink(s.button2Link, linkLoaders)
          ]);
          return {
            ...s,
            buttonLink: buttonLink ?? s.buttonLink ?? null,
            button2Link: button2Link ?? s.button2Link ?? null
          };
        })
      );
      return {
        slides: resolvedSlides,
        autoplay: autoplay !== undefined ? Boolean(autoplay) : true,
        autoplaySpeed: Number.isFinite(Number(autoplaySpeed))
          ? Number(autoplaySpeed)
          : 3000,
        arrows: arrows !== undefined ? Boolean(arrows) : true,
        dots: dots !== undefined ? Boolean(dots) : true,
        transition: transition || 'slide',
        transitionSpeed: Number.isFinite(Number(transitionSpeed))
          ? Math.min(1500, Math.max(200, Number(transitionSpeed)))
          : 500,
        pauseOnHover:
          pauseOnHover !== undefined ? Boolean(pauseOnHover) : true,
        pauseOnInteraction: Boolean(pauseOnInteraction),
        arrowsStyle:
          arrowsStyle ?? (arrows === false ? 'hidden' : 'bottom-right'),
        dotsStyle: dotsStyle ?? (dots === false ? 'hidden' : 'dots'),
        aspectRatio: aspectRatio || 'auto',
        defaultContentPosition: defaultContentPosition || 'mc',
        defaultOverlayTint: defaultOverlayTint || 'none',
        defaultOverlayOpacity: Number.isFinite(Number(defaultOverlayOpacity))
          ? Math.min(1, Math.max(0, Number(defaultOverlayOpacity)))
          : 0.3
      };
    },
    brandStoryWidget: async (
      _,
      {
        layout,
        image,
        imageAlt,
        imageWidth,
        imageHeight,
        eyebrow,
        heading,
        body,
        bodySecondary,
        link,
        pullQuote,
        imageSize
      },
      { linkLoaders }
    ) => {
      const allowedLayouts = [
        'image-left',
        'image-right',
        'centered',
        'pull-quote'
      ];
      const allowedSizes = [40, 50, 60];
      const sizeNum = Math.round(Number(imageSize));
      const w = Number(imageWidth);
      const h = Number(imageHeight);
      return {
        layout: allowedLayouts.includes(layout) ? layout : 'image-left',
        image: image || null,
        imageAlt: imageAlt || '',
        imageWidth: Number.isFinite(w) && w > 0 ? Math.round(w) : null,
        imageHeight: Number.isFinite(h) && h > 0 ? Math.round(h) : null,
        eyebrow: eyebrow || null,
        heading: heading || '',
        body: body || '',
        bodySecondary: bodySecondary || null,
        link: await resolveLinkObject(link, linkLoaders),
        pullQuote: pullQuote || null,
        imageSize: allowedSizes.includes(sizeNum) ? sizeNum : 50
      };
    },
    categoryMosaicWidget: async (
      _,
      { heading, tiles, columns, aspect, layout, labelPosition },
      { linkLoaders }
    ) => {
      // Keep tiles with a label even when they have no image yet, so the page
      // builder can render them with an inline "add image" affordance. The
      // storefront still hides imageless tiles — that filter lives in the
      // CategoryMosaic component (which knows whether it's in the builder).
      const safeTiles = (Array.isArray(tiles) ? tiles : []).filter(
        (t) => t && typeof t === 'object' && t.label
      );
      // tile.link is a plain string (URN or URL).
      const resolvedTiles = await Promise.all(
        safeTiles.map(async (t) => ({
          ...t,
          link: (await resolveLink(t.link, linkLoaders)) ?? t.link
        }))
      );
      const colsNum = Number(columns);
      return {
        heading: heading || null,
        tiles: resolvedTiles,
        columns:
          Number.isFinite(colsNum) && colsNum >= 2 && colsNum <= 6
            ? Math.round(colsNum)
            : null,
        aspect: ['square', 'portrait', 'landscape'].includes(aspect)
          ? aspect
          : 'square',
        layout: layout === 'asymmetric' ? 'asymmetric' : 'uniform',
        labelPosition: labelPosition === 'below' ? 'below' : 'overlay'
      };
    },
    tieredCategoriesWidget: async (
      _,
      { groups, columns, imageAspect, showParentLink },
      { linkLoaders }
    ) => {
      const safeGroups = (Array.isArray(groups) ? groups : []).filter(
        (g) => g && typeof g === 'object' && g.parent?.label
      );
      // Resolve parent.url + every sub.url. Promise.all keeps them all in
      // the same microtask so DataLoader batches across rows.
      const resolvedGroups = await Promise.all(
        safeGroups.map(async (g) => ({
          ...g,
          parent: g.parent
            ? {
                ...g.parent,
                url: (await resolveLink(g.parent.url, linkLoaders)) ?? null
              }
            : g.parent,
          subs: Array.isArray(g.subs)
            ? await Promise.all(
                g.subs.map(async (s) => ({
                  ...s,
                  url: s ? (await resolveLink(s.url, linkLoaders)) ?? null : null
                }))
              )
            : []
        }))
      );
      const colsNum = Number(columns);
      return {
        groups: resolvedGroups,
        columns:
          Number.isFinite(colsNum) && colsNum >= 2 && colsNum <= 4
            ? Math.round(colsNum)
            : null,
        imageAspect: ['square', 'portrait', 'landscape'].includes(imageAspect)
          ? imageAspect
          : 'landscape',
        showParentLink:
          showParentLink !== undefined ? Boolean(showParentLink) : true
      };
    },
    footerMenuWidget: async (_, { columns }, { linkLoaders }) => {
      const safeColumns = (Array.isArray(columns) ? columns : []).filter(
        (c) => c && typeof c === 'object'
      );
      // Resolve every link url (URN → current URL). Promise.all keeps them in
      // the same microtask so the link loaders batch across all rows.
      const resolvedColumns = await Promise.all(
        safeColumns.map(async (c) => ({
          ...c,
          links: Array.isArray(c.links)
            ? await Promise.all(
                c.links.map(async (l) => ({
                  ...l,
                  url: l
                    ? (await resolveLink(l.url, linkLoaders)) ?? null
                    : null
                }))
              )
            : []
        }))
      );
      return { columns: resolvedColumns };
    },
    separatorWidget(_, { size, showLine, lineColor }) {
      const allowedSizes = ['xs', 'sm', 'md', 'lg', 'xl'];
      return {
        size: allowedSizes.includes(size) ? size : 'md',
        showLine: showLine !== undefined ? Boolean(showLine) : false,
        lineColor:
          typeof lineColor === 'string' && lineColor.length > 0
            ? lineColor
            : null
      };
    },
    sectionWidget(
      _,
      {
        width,
        padding,
        background,
        backgroundImage,
        backgroundImageWidth,
        backgroundImageHeight,
        overlayTint,
        overlayOpacity
      }
    ) {
      const allowedWidths = ['wide', 'boxed'];
      const allowedPaddings = ['none', 'sm', 'md', 'lg', 'xl'];
      const allowedTints = ['none', 'dark', 'light', 'gradient'];
      const w = Number(backgroundImageWidth);
      const h = Number(backgroundImageHeight);
      const op = Number(overlayOpacity);
      return {
        width: allowedWidths.includes(width) ? width : 'boxed',
        padding: allowedPaddings.includes(padding) ? padding : 'md',
        background:
          typeof background === 'string' && background.length > 0
            ? background
            : null,
        backgroundImage:
          typeof backgroundImage === 'string' && backgroundImage.length > 0
            ? backgroundImage
            : null,
        backgroundImageWidth:
          Number.isFinite(w) && w > 0 ? Math.round(w) : null,
        backgroundImageHeight:
          Number.isFinite(h) && h > 0 ? Math.round(h) : null,
        overlayTint: allowedTints.includes(overlayTint) ? overlayTint : 'none',
        overlayOpacity: Number.isFinite(op)
          ? Math.min(1, Math.max(0, op))
          : 0.3
      };
    },
    bentoGridWidget: async (_, { tiles, gap, minHeight }, { linkLoaders }) => {
      const safeTiles = (Array.isArray(tiles) ? tiles : [])
        .filter(
          (t) =>
            t && typeof t === 'object' && t.heading && t.link && t.link.url
        )
        .slice(0, 5);
      const resolvedTiles = await Promise.all(
        safeTiles.map(async (t) => ({
          ...t,
          link: await resolveLinkObject(t.link, linkLoaders)
        }))
      );
      // After resolution, drop tiles whose link no longer resolves so the
      // storefront doesn't render a CTA with no target.
      const finalTiles = resolvedTiles.filter((t) => t.link);
      const minH = Number(minHeight);
      return {
        tiles: finalTiles,
        gap: ['sm', 'md', 'lg'].includes(gap) ? gap : 'md',
        // Math.round guards the output side — input was widened to Float so
        // a slider mid-drag (e.g. 360.5) doesn't crash GraphQL validation,
        // but the response is still typed Int so the rendered widget
        // receives a clean integer.
        minHeight: Number.isFinite(minH)
          ? Math.round(Math.min(640, Math.max(240, minH)))
          : 360
      };
    },
    splitFeatureWidget: async (
      _,
      {
        image,
        imageAlt,
        imagePosition,
        width,
        height,
        eyebrow,
        heading,
        body,
        cta,
        verticalAlign,
        imageFit
      },
      { linkLoaders }
    ) => {
      const allowedPosition = imagePosition === 'right' ? 'right' : 'left';
      const allowedAlign = ['top', 'center', 'bottom'].includes(verticalAlign)
        ? verticalAlign
        : 'center';
      const allowedFit = imageFit === 'contain' ? 'contain' : 'cover';
      const w = Number(width);
      const h = Number(height);
      return {
        image: image || '',
        imageAlt: imageAlt || '',
        imagePosition: allowedPosition,
        // Natural intrinsic dimensions of the picked image. Null for widgets
        // saved before dimension capture; storefront falls back to a hero
        // default.
        width: Number.isFinite(w) && w > 0 ? Math.round(w) : null,
        height: Number.isFinite(h) && h > 0 ? Math.round(h) : null,
        eyebrow: eyebrow || null,
        heading: heading || '',
        body: body || null,
        cta: await resolveCtaUrl(cta, linkLoaders),
        verticalAlign: allowedAlign,
        imageFit: allowedFit
      };
    },
    announcementBarWidget: async (
      _,
      { backgroundColor, textColor, delay, announcements },
      { linkLoaders }
    ) => {
      const filtered = (Array.isArray(announcements) ? announcements : [])
        .filter((a) => a && typeof a === 'object' && a.content);
      const safeAnnouncements = await Promise.all(
        filtered.map(async (a) => {
          const resolvedUrl =
            a.link && a.link.url
              ? await resolveLink(a.link.url, linkLoaders)
              : null;
          return {
            id: a.id,
            content: String(a.content),
            link: resolvedUrl
              ? {
                  url: resolvedUrl,
                  label: a.link.label || a.content,
                  newTab: !!a.link.newTab
                }
              : null
          };
        })
      );
      const d = Number(delay);
      return {
        backgroundColor:
          typeof backgroundColor === 'string' && backgroundColor.length > 0
            ? backgroundColor
            : '#000000',
        textColor:
          typeof textColor === 'string' && textColor.length > 0
            ? textColor
            : '#ffffff',
        delay: Number.isFinite(d) ? Math.round(Math.max(1000, d)) : 4000,
        announcements: safeAnnouncements
      };
    },
    couponBlockWidget: async (
      _,
      {
        eyebrow,
        heading,
        body,
        code,
        ctaLabel,
        ctaLink,
        ctaNewTab,
        expires,
        borderStyle,
        backgroundColor
      },
      { linkLoaders }
    ) => {
      const allowedBorders = ['solid', 'dashed', 'none'];
      // Loosely-validate expires: it must parse to a date. Anything else is
      // dropped to null so the storefront script can branch cleanly.
      let safeExpires = null;
      if (expires && typeof expires === 'string') {
        const t = Date.parse(expires);
        if (Number.isFinite(t)) safeExpires = new Date(t).toISOString();
      }
      const resolvedCta = (await resolveLink(ctaLink, linkLoaders)) || '/';
      return {
        eyebrow: eyebrow || null,
        // Heading and code are required; default to sane placeholders so a
        // half-saved widget renders something instead of crashing the
        // route. Real validation lives on the admin form.
        heading: heading || 'Special offer',
        body: body || null,
        code: code || 'SAVE',
        ctaLabel: ctaLabel || null,
        ctaLink: resolvedCta,
        ctaNewTab: ctaNewTab !== undefined ? Boolean(ctaNewTab) : false,
        expires: safeExpires,
        borderStyle: allowedBorders.includes(borderStyle)
          ? borderStyle
          : 'dashed',
        backgroundColor:
          typeof backgroundColor === 'string' && backgroundColor.length > 0
            ? backgroundColor
            : null
      };
    },
    faqBlockWidget(_, { heading, sections, maxWidth, allowMultipleOpen }) {
      // `sections` storage is a JSONB array — defend against null/garbage so
      // a broken setting doesn't 500 the entire route. Each section is a
      // discriminated union (prose | faq); we keep only the recognised types.
      const safeSections = (Array.isArray(sections) ? sections : [])
        .filter((s) => s && typeof s === 'object' && (s.type === 'prose' || s.type === 'faq'))
        .map((s) => {
          if (s.type === 'prose') {
            // Prose content is the EditorJS Row[] shape. May arrive as an
            // array (parsed) or a JSON-stringified array (form-stored). Pass
            // through; the storefront component handles both shapes.
            return { id: s.id, type: 'prose', content: s.content ?? [] };
          }
          return {
            id: s.id,
            type: 'faq',
            heading: s.heading || null,
            items: (Array.isArray(s.items) ? s.items : [])
              .filter((it) => it && typeof it === 'object' && it.question)
              .map((it) => ({
                id: it.id,
                question: String(it.question),
                answer: it.answer ? String(it.answer) : ''
              }))
          };
        });
      const allowedWidths = ['narrow', 'normal', 'wide'];
      return {
        heading: heading || null,
        sections: safeSections,
        maxWidth: allowedWidths.includes(maxWidth) ? maxWidth : 'normal',
        allowMultipleOpen:
          allowMultipleOpen !== undefined ? Boolean(allowMultipleOpen) : false
      };
    },
    trustStripWidget: async (
      _,
      { items, columns, showIcons, iconSize, alignment, divider },
      { linkLoaders }
    ) => {
      // Coerce items defensively — JSONB storage doesn't enforce nullness,
      // so missing `link` should be null (not undefined) and missing
      // `description` should be null (not empty string) so the storefront
      // can branch cleanly.
      const filtered = (Array.isArray(items) ? items : []).filter(
        (it) => it && typeof it === 'object' && it.title
      );
      const safeItems = await Promise.all(
        filtered.map(async (it) => {
          const iw = Number(it.iconWidth);
          const ih = Number(it.iconHeight);
          const resolvedUrl =
            it.link && it.link.url
              ? await resolveLink(it.link.url, linkLoaders)
              : null;
          return {
            id: it.id,
            icon: it.icon || null,
            iconWidth: Number.isFinite(iw) && iw > 0 ? Math.round(iw) : null,
            iconHeight: Number.isFinite(ih) && ih > 0 ? Math.round(ih) : null,
            title: String(it.title),
            description: it.description || null,
            link: resolvedUrl
              ? { url: resolvedUrl, newTab: !!it.link.newTab }
              : null
          };
        })
      );
      const allowedIconSize = ['sm', 'md', 'lg'].includes(iconSize)
        ? iconSize
        : 'md';
      const allowedAlignment = alignment === 'left' ? 'left' : 'center';
      const colsNum = Number(columns);
      return {
        items: safeItems,
        columns:
          Number.isFinite(colsNum) && colsNum >= 2 && colsNum <= 6
            ? Math.round(colsNum)
            : null,
        showIcons: showIcons !== undefined ? Boolean(showIcons) : true,
        iconSize: allowedIconSize,
        alignment: allowedAlignment,
        divider: divider !== undefined ? Boolean(divider) : false
      };
    },
    basicMenuWidget: async (_, { settings }, { linkLoaders }) => {
      // Menu list settings arrive as a real array from the page-builder
      // drawer, but the legacy widget editor seeds list fields as a JSON
      // *string* (a stringified hidden input). A half-added widget can even
      // persist a stray "[]" string — truthy, so it sneaks past a plain
      // `if (!menus)` and then `menus.map` throws "is not a function".
      // Coerce so `.map` never sees a string.
      const toArray = (value) => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      };
      const menus = toArray(settings?.menus);
      const isMain = [1, '1', 'true', true].includes(settings?.isMain) || false;
      if (menus.length === 0) {
        return { menus: [] };
      }

      // Each menu item now stores its link as a URN (or a custom URL) in
      // `url`, resolved at request time via the shared link loaders — same
      // as every other widget. Items saved before the LinkPicker switch
      // only carry the legacy { type, uuid } shape, so synthesize a URN
      // from that when no URN is present. No data migration needed.
      const linkValueOf = (item) => {
        if (item.url && UrnService.isValid(item.url)) return item.url;
        if (item.type === 'category' && item.uuid) {
          return CatalogUrn.category(item.uuid);
        }
        if (item.type === 'page' && item.uuid) {
          return CmsUrn.page(item.uuid);
        }
        if (item.type === 'product' && item.uuid) {
          return CatalogUrn.product(item.uuid);
        }
        return item.url || null; // custom URL (or already-resolved legacy url)
      };

      // Cast the link-attribute flags to booleans: legacy items predate them
      // (undefined → false) and JSON-stored values can be stringy.
      const resolveItem = async (item) => ({
        ...item,
        id: uniqid(),
        url:
          (await resolveLink(linkValueOf(item), linkLoaders)) ??
          (item.type === 'custom' ? item.url : null),
        newTab: Boolean(item.newTab),
        nofollow: Boolean(item.nofollow),
        noReferrer: Boolean(item.noReferrer),
        children: await Promise.all(
          toArray(item.children).map(async (child) => ({
            ...child,
            id: uniqid(),
            url:
              (await resolveLink(linkValueOf(child), linkLoaders)) ??
              (child.type === 'custom' ? child.url : null),
            newTab: Boolean(child.newTab),
            nofollow: Boolean(child.nofollow),
            noReferrer: Boolean(child.noReferrer)
          }))
        )
      });

      const items = await Promise.all(menus.map(resolveItem));
      return { menus: items, isMain, className: settings?.className };
    }
  },
  // Phase 2b — typed widget settings union. `__resolveType` reads the
  // `__typename` we attach in `Widget.settings` below. Widgets without a
  // graphql block resolve to `null` from `settings` (the field is nullable).
  WidgetSettings: {
    __resolveType: (obj) => obj && obj.__typename
  },

  Widget: {
    // Backward-compat alias (cms migration 1.3.0 renamed widget_id → widget_instance_id).
    widgetId: (widget) => widget.widgetInstanceId,

    // Phase 2b — typed settings. Returns the raw settings tagged with the
    // widget's `graphql.settingsType` as `__typename`, or null if the widget
    // type didn't register a graphql block.
    settings: (widget) => {
      const registration = getWidget(widget.type);
      if (!registration?.graphql?.settingsType) return null;
      const raw = widget.settings ?? {};
      return {
        __typename: registration.graphql.settingsType,
        ...raw
      };
    },

    // Backward-compat raw access during the migration window.
    rawSettings: (widget) => widget.settings ?? {},

    editUrl: ({ uuid }) => buildUrl('widgetEdit', { id: uuid }),
    updateApi: (widget) => buildUrl('updateWidget', { id: widget.uuid }),
    deleteApi: (widget) => buildUrl('deleteWidget', { id: widget.uuid }),

    placements: async (widget, _, { pool }) => {
      // Short-circuit when the parent resolver already supplied an
      // overlay-applied placements list (page-builder Layers query path).
      // Otherwise legacy queries fall through to source SQL.
      if (Array.isArray(widget._overlayPlacements)) {
        return widget._overlayPlacements;
      }
      const query = select().from('widget_placement');
      query.where('widget_instance_id', '=', widget.widgetInstanceId);
      query.orderBy('sort_order', 'asc');
      const rows = await query.execute(pool);
      return rows.map(camelCase);
    },

    columns: async (widget, _, { pool }) => {
      // Same short-circuit pattern as `placements` above.
      if (Array.isArray(widget._overlayColumns)) {
        return widget._overlayColumns;
      }
      // Container children: placements whose `area` is the synthetic
      // `columnsContainer_<this-uuid>_col_<index>` pattern. Parse the index
      // out of the area name and group. Non-containers return `[]` because
      // no placements match the prefix.
      const prefix = `columnsContainer_${widget.uuid}_col_`;
      const result = await pool.query(
        `SELECT wi.*, wp.area, wp.sort_order
         FROM widget_placement wp
         INNER JOIN widget_instance wi
                 ON wi.widget_instance_id = wp.widget_instance_id
         WHERE LEFT(wp.area, $1) = $2
         ORDER BY wp.sort_order ASC`,
        [prefix.length, prefix]
      );
      if (result.rows.length === 0) return [];
      const groups = new Map();
      for (const child of result.rows) {
        const suffix = child.area.slice(prefix.length);
        const idx = Number.parseInt(suffix, 10);
        if (!Number.isFinite(idx)) continue;
        if (!groups.has(idx)) groups.set(idx, []);
        groups.get(idx).push(camelCase(child));
      }
      return [...groups.entries()]
        .sort(([a], [b]) => a - b)
        .map(([index, widgets]) => ({ index, widgets }));
    },

    // Deprecated route/area/sortOrder — derived from placements during the
    // transition window. The admin UI still reads these for the widget
    // edit/grid screens until Phase 3c rewrites that surface to use
    // `placements` directly.
    route: async (widget, _, { pool }) => {
      const query = select('route').from('widget_placement');
      query.where('widget_instance_id', '=', widget.widgetInstanceId);
      const rows = await query.execute(pool);
      return [...new Set(rows.map((r) => r.route))];
    },

    area: async (widget, _, { pool }) => {
      const query = select('area').from('widget_placement');
      query.where('widget_instance_id', '=', widget.widgetInstanceId);
      const rows = await query.execute(pool);
      return [...new Set(rows.map((r) => r.area))];
    },

    sortOrder: async (widget, _, { pool }) => {
      const query = select('sort_order').from('widget_placement');
      query.where('widget_instance_id', '=', widget.widgetInstanceId);
      query.orderBy('sort_order', 'asc');
      const rows = await query.execute(pool);
      return rows[0]?.sort_order ?? 0;
    }
  }
};
