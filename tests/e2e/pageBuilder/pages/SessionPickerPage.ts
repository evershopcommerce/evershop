import type { Locator, Page } from '@playwright/test';
import { sessionPicker as sp } from '../../shared/selectors.js';

/**
 * Page-object for the session-picker modal.
 *
 * Lifecycle:
 *   - Mounts automatically on `/admin/page-builder/edit/<route>` entry.
 *   - Three primary actions: continue an existing draft, start a fresh
 *     changeset, or open a saved rollout plan as a session.
 *   - Dismissable via the close (X) button or programmatically by clicking
 *     one of the cards.
 *
 * Spec convention: most tests call `startFresh()` to get a clean slate
 * (idempotent — if no draft / rollouts exist, the picker still mounts
 * with just the "Start new changeset" option, and this method picks it).
 */
export class SessionPickerPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get dialog(): Locator {
    return this.page.locator(sp.dialog);
  }

  get title(): Locator {
    return this.dialog.getByText(sp.title);
  }

  /**
   * Card: "Continue your draft". Visible only when the current admin has
   * uncommitted ops on the route they're entering. Tests that need a
   * pristine session should `startFresh()` instead so the picker doesn't
   * resurrect leftover state.
   */
  get continueDraftCard(): Locator {
    return this.dialog.getByRole('button', { name: /Continue your draft/i });
  }

  /** Card: "Start new changeset". Always present. */
  get startFreshCard(): Locator {
    return this.dialog.getByRole('button', { name: /Start new changeset/i });
  }

  /** Close (X) — only present when allowDismiss or a draft already exists. */
  get closeButton(): Locator {
    return this.dialog.getByRole('button', { name: /Close/i });
  }

  /**
   * Click "Start new changeset" and wait for the picker to unmount.
   * Default flow for specs that don't care about session-picker semantics.
   */
  async startFresh(): Promise<void> {
    await this.startFreshCard.click();
    await this.dialog.waitFor({ state: 'detached' });
  }
}
