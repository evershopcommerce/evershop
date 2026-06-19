import type { FrameLocator, Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { editor as ed } from '../../shared/selectors.js';

/**
 * Page-object model for the page-builder editor.
 *
 * Two surfaces matter: the parent `Page` (topbar, sidebar tabs, drawer) and
 * the storefront preview `iframe`. Playwright treats them as separate
 * frames; `previewFrame()` returns a FrameLocator scoped to the iframe.
 *
 * Convention: every navigation method awaits a render signal (a stable
 * selector that's only present once the editor has finished mounting).
 * Bare URL navigation isn't enough — the editor lazy-loads its bundle
 * via webpack-dev-middleware in dev mode, so the iframe content lags
 * the outer page.
 */
export class EditorPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ---------- Navigation ----------

  /**
   * Open the editor for the given route id (e.g. `homepage`, `cart`).
   *
   * Steps:
   *   1. Navigate to `/admin/page-builder/edit/<routeId>`.
   *   2. Dismiss the SessionPicker that mounts on entry (by default,
   *      choose "Start new changeset" so each spec starts pristine).
   *      Pass `{ session: 'continueDraft' }` to keep the existing draft
   *      instead — useful for specs that explicitly test draft recovery.
   *   3. Wait for the topbar AND the iframe's first paint, so subsequent
   *      assertions don't need their own waitFor.
   */
  async open(
    routeId: string,
    opts: { session?: 'startFresh' | 'continueDraft' } = {}
  ): Promise<void> {
    // Suppress the SessionPicker for the lifetime of this page context.
    // Editor.tsx mounts the picker based on a per-changeset sessionStorage
    // key (`pb_session_ack_<changesetId>` = '1' → suppressed). We override
    // `sessionStorage.getItem` to short-circuit reads of any key matching
    // that prefix to '1' WHILE `window.__pbSuppressPicker` is truthy.
    // Cheap, deterministic, survives reloads (the init script runs on
    // every navigation in the page context).
    //
    // Tests that intentionally verify picker mounting (e.g. the "create
    // succeeds → editor navigates to picker home" rollout test) call
    // `editor.allowPicker()` before the navigation that should surface
    // the picker; that flips the flag and lets the next getItem return
    // its real value.
    await this.page.addInitScript(() => {
      const orig = window.sessionStorage.getItem.bind(window.sessionStorage);
      window.sessionStorage.getItem = (key: string) => {
        if (
          (window as unknown as { __pbSuppressPicker?: boolean })
            .__pbSuppressPicker &&
          typeof key === 'string' &&
          key.startsWith('pb_session_ack_')
        ) {
          return '1';
        }
        return orig(key);
      };
      (window as unknown as { __pbSuppressPicker?: boolean }).__pbSuppressPicker =
        true;
    });

    await this.page.goto(`/admin/page-builder/edit/${routeId}`);

    // Topbar is the "React tree mounted" signal — rendered unconditionally
    // by the page-builder shell. Picker (suppressed above) wouldn't have
    // shown anyway, so no dismissal step.
    await expect(this.page.locator(ed.topbar)).toBeVisible({
      timeout: 15_000
    });

    // `continueDraft` mode previously meant "click the continue card on the
    // picker." With suppression, there's no picker. The semantics shift to
    // "assume the draft is already open and continue editing" — same effect
    // since getOrCreateDraftChangeset returns the existing draft if any.
    void opts;
    // Iframe is the heaviest part of the mount; the spec is allowed to
    // assume it's settled before any preview-side assertions.
    const frame = await this.previewFrame();
    // Header is rendered by every storefront page via base/.../Base.tsx,
    // so its presence is a reliable "first paint complete" signal.
    await expect(frame.locator('header').first()).toBeVisible({
      timeout: 20_000
    });
  }

  // ---------- Topbar (parent page) ----------

  get topbar(): Locator {
    return this.page.locator(ed.topbar);
  }

  /**
   * The dropdown that shows the current page name (e.g. "Home Page") and
   * opens the page picker. Used by tests to verify which page is active.
   */
  get pageSelector(): Locator {
    // The chip with the page name is the first button in the topbar that
    // contains the FileText icon — Editor.tsx renders it via the
    // `currentPage` dropdown trigger.
    return this.topbar.getByRole('button', { name: /Page/i }).first();
  }

  get publishButton(): Locator {
    // `exact: true` excludes the sibling caret button whose aria-label
    // is "More publish options" — without it the substring "Publish"
    // matches both and triggers strict-mode.
    return this.topbar.getByRole('button', { name: 'Publish', exact: true });
  }

  /** The caret next to Publish that opens the "Save as rollout plan" menu. */
  get publishMoreButton(): Locator {
    return this.topbar.getByRole('button', { name: 'More publish options' });
  }

  /** Preview is an `<a target="_blank">`, not a button. */
  get previewButton(): Locator {
    return this.topbar.getByRole('link', { name: 'Preview', exact: true });
  }

  get undoButton(): Locator {
    // Exact aria-label — `/undo/i` would also match the redo button's
    // "Redo last undone change on this page" (substring "undone").
    return this.topbar.getByRole('button', {
      name: 'Undo last change on this page'
    });
  }

  get redoButton(): Locator {
    return this.topbar.getByRole('button', {
      name: 'Redo last undone change on this page'
    });
  }

  /**
   * `aria-label` overrides visible text for accessible-name calculation,
   * so this matches "Show global areas" / "Hide global areas" depending
   * on the toggle state — NOT the visible "Globals" string.
   */
  get globalsToggle(): Locator {
    return this.topbar.getByRole('button', { name: /global areas/i });
  }

  /**
   * The "New changeset" badge (SessionModeBadge component) — visible
   * text doubles as the accessible name (no aria-label override).
   */
  get newChangesetButton(): Locator {
    return this.topbar.getByRole('button', { name: 'New changeset' });
  }

  // ---------- Preview iframe ----------

  /**
   * Returns a FrameLocator scoped to the storefront iframe. Use this for
   * any assertion that targets rendered storefront DOM (widgets, header
   * areas, footer, etc.). Returns a fresh locator each call so callers
   * don't have to worry about stale references across navigations.
   */
  async previewFrame(): Promise<FrameLocator> {
    return this.page.frameLocator(ed.iframe);
  }

  /**
   * Release the SessionPicker suppression installed by `open()`. Use this
   * when a test deliberately wants the picker to mount on a subsequent
   * navigation (e.g. asserting "create rollout → editor redirects to
   * picker home → picker visible"). After this call, the suppression
   * stays off for the rest of the page context's lifetime — re-running
   * `open()` re-enables it.
   */
  async allowPicker(): Promise<void> {
    await this.page.evaluate(() => {
      (window as unknown as { __pbSuppressPicker?: boolean }).__pbSuppressPicker =
        false;
    });
    // Also persist across reloads — the init script sets the flag to
    // true on every navigation, so we need to re-add an init script that
    // sets it false from now on.
    await this.page.addInitScript(() => {
      (window as unknown as { __pbSuppressPicker?: boolean }).__pbSuppressPicker =
        false;
    });
  }
}
