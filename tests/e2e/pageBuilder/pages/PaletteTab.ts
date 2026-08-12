import type { FrameLocator, Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page-object for the editor's left sidebar — Widgets tab specifically.
 *
 * Each widget type appears as a `<button draggable>` in the palette.
 * Dragging it sets `application/x-evershop-widget` on the dataTransfer
 * and posts a `pb-drag-start` message to the iframe; the iframe arms
 * its drop zones (`body[data-evershop-pb-drag="true"]`).
 *
 * Cross-frame drag-and-drop is handled by Playwright's `dragTo` — it
 * uses real mouse events with a synthesized DataTransfer that survives
 * the iframe boundary because the browser treats the drag operation as
 * a single OS-level gesture across documents.
 */
export class PaletteTab {
  readonly page: Page;
  readonly sidebar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('.page-builder-editor aside');
  }

  /** The Widgets tab button (icon-only, aria-labelled). */
  get widgetsTab(): Locator {
    return this.sidebar.getByRole('button', { name: /Widgets/i }).first();
  }

  /**
   * The left rail starts collapsed (`leftRailCollapsed = true`); only
   * the icon-only tab buttons are rendered. Palette cards don't mount
   * until the rail is expanded. Call this before any `card()` /
   * `dragCardTo*` operation.
   *
   * Idempotent — if already expanded, no-op.
   */
  async ensureExpanded(): Promise<void> {
    const expandButton = this.sidebar.getByRole('button', {
      name: 'Expand left rail'
    });
    if (await expandButton.isVisible().catch(() => false)) {
      await expandButton.click();
    }
    // After expand, the Widgets tab is active by default. Confirm a
    // palette structure element is reachable.
    await expect(this.searchInput).toBeVisible();
  }

  /** Search field inside the palette. */
  get searchInput(): Locator {
    return this.sidebar.getByRole('searchbox', { name: /Search widgets/i });
  }

  /**
   * Locator for a single palette item by widget type code (e.g.
   * `coupon_block`). Each card is rendered as a `<button draggable>`
   * containing the human-readable widget name. The button also wraps
   * the widget's description, so the accessible name concatenates as
   * `"Coupon block <description>"` — we can't use `exact: true`.
   *
   * Convention: callers pass the widget's human label (`'Coupon block'`,
   * `'Banner'`, etc.) which matches the start of the button's name.
   */
  card(widgetLabel: string): Locator {
    // Anchor to start of accessible name so e.g. "Brand story" doesn't
    // match "Brand story title…" + "Brand story subtitle…" if any
    // future card description starts the same way. `^...\b` keeps the
    // boundary at the end of the label word.
    const safe = widgetLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.sidebar
      .getByRole('button', { name: new RegExp(`^${safe}\\b`) })
      .first();
  }

  /**
   * Drag a palette card onto the given target. The target is a Locator
   * that resolves inside the iframe (use `FrameLocator.locator(...)` to
   * construct it). Playwright's `dragTo` performs:
   *   1. dragstart on source (sets dataTransfer).
   *   2. dragover on target.
   *   3. drop on target (target reads dataTransfer).
   *
   * After the drop the editor's `pb-drop` message handler runs in the
   * parent frame and creates the widget instance + placement. Caller
   * is expected to wait for whatever follow-up state matters (drawer
   * mount, iframe widget appearance, ...).
   */
  async dragCardTo(widgetLabel: string, target: Locator): Promise<void> {
    await this.ensureExpanded();
    const source = this.card(widgetLabel);
    await expect(source).toBeVisible();
    await source.dragTo(target);
  }

  /**
   * Convenience: drag onto an Area inside the iframe. `areaId` matches
   * the storefront `<Area id="...">` (e.g. `headerTop`, `content`).
   *
   * Targets the AreaStartDropZone (the first dropzone rendered as the
   * Area's first child — drops above any existing children).
   */
  async dragCardToArea(
    widgetLabel: string,
    iframe: FrameLocator,
    areaId: string
  ): Promise<void> {
    const dropZone = iframe.locator(
      `[data-evershop-pb-area-start="${areaId}"]`
    );
    await this.dragCardTo(widgetLabel, dropZone);
  }

  /**
   * Drop a widget via the `pb-drop` postMessage shortcut. This skips the
   * HTML5 drag-and-drop event chain (palette dragstart → iframe drop
   * zone dragover/drop → postMessage to parent) and directly fires the
   * message the Editor listens for. Same outcome from the Editor's
   * perspective — the widget instance + placement get inserted via
   * `handleAddWidget` exactly as if the user had dragged.
   *
   * Use this for specs that test what happens AFTER a drop (drawer
   * state, share behavior, undo/redo, ...). Real-drag tests live in
   * `pageBuilder/specs/03-drag-drop/` and exercise the full chain.
   *
   * `widgetCode` is the canonical type from `registerWidget` — e.g.
   * `coupon_block`, `banner`, `text_block`. NOT the human label.
   */
  /**
   * Real cross-frame drag-and-drop, synthesised in two pieces:
   *   1. dragstart on the palette card in the parent frame.
   *   2. drop on the AreaStartDropZone inside the iframe.
   *
   * Both events share a DataTransfer carrying
   * `application/x-evershop-widget`. The Editor's pb-drop handler runs
   * `handleAddWidget` which POSTs the widget_instance + widget_placement
   * ops — same flow as a user-initiated drag.
   *
   * Playwright's high-level `dragTo` doesn't reliably cross frames for
   * HTML5 drag-and-drop, hence the manual approach. Empirically the
   * `dragstart` step is required: dispatching `drop` alone doesn't
   * trigger the Editor handler reliably.
   *
   * `widgetCode` is the canonical registration type (e.g. `coupon_block`,
   * `simple_slider`) — NOT the human label. The palette's drag handler
   * reads it from React closure, so we set it on our own DataTransfer
   * for the drop handler to read on the iframe side. `widgetLabel` is
   * the human label used only to find the source card in the DOM.
   */
  async dragToArea(
    widgetLabel: string,
    widgetCode: string,
    areaId: string
  ): Promise<void> {
    await this.ensureExpanded();
    await this.page.evaluate(
      ({ widgetLabel, widgetCode, areaId }) => {
        const cards = Array.from(
          document.querySelectorAll(
            '.page-builder-editor aside button[draggable="true"]'
          )
        ) as HTMLButtonElement[];
        const card = cards.find((c) =>
          (c.textContent || '').trim().startsWith(widgetLabel)
        );
        if (!card) {
          throw new Error(`Palette card "${widgetLabel}" not found.`);
        }
        const iframe = document.querySelector(
          '.page-builder-editor iframe'
        ) as HTMLIFrameElement | null;
        if (!iframe?.contentDocument) {
          throw new Error('Editor iframe missing.');
        }
        const zone = iframe.contentDocument.querySelector(
          `[data-evershop-pb-area-start="${areaId}"]`
        ) as HTMLElement | null;
        if (!zone) {
          throw new Error(
            `Drop zone for area "${areaId}" not found in iframe.`
          );
        }
        const dt = new DataTransfer();
        dt.setData('application/x-evershop-widget', widgetCode);
        dt.setData('text/plain', widgetCode);
        const dragstart = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt
        });
        card.dispatchEvent(dragstart);
        const drop = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt
        });
        zone.dispatchEvent(drop);
      },
      { widgetLabel, widgetCode, areaId }
    );
  }
}
