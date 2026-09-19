import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page-object for the publish-confirmation dialog. Surfaces:
 *   - The title ("Publish to the live storefront" / "Nothing to publish").
 *   - Stat cards: Added / Updated / Removed counts.
 *   - "Affects N pages" with route names.
 *   - Cancel + "Publish now" buttons.
 */
export class PublishDialog {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** The modal dialog. */
  get dialog(): Locator {
    return this.page.getByRole('dialog').filter({
      hasText: /Publish to the live storefront|Nothing to publish/
    });
  }

  get title(): Locator {
    return this.dialog.getByText(/Publish to the live storefront|Nothing to publish/);
  }

  /**
   * The summary stat card by label. The card renders the label in a
   * `<span>` followed by the count in another `<span>`; we anchor on
   * the label span and walk up to its containing card.
   */
  statCard(label: 'Added' | 'Updated' | 'Removed'): Locator {
    return this.dialog
      .locator('span', { hasText: new RegExp(`^${label}$`) })
      .first()
      .locator('xpath=..').locator('xpath=..');
  }

  /** "Affects N pages" badge block. */
  get affectsBlock(): Locator {
    return this.dialog.locator('div').filter({ hasText: /Affects \d+ page/ }).first();
  }

  get cancelButton(): Locator {
    return this.dialog.getByRole('button', { name: 'Cancel' });
  }

  /** Primary CTA — "Publish now". Disabled when no ops. */
  get publishNowButton(): Locator {
    return this.dialog.getByRole('button', { name: /Publish now/i });
  }

  /**
   * Click "Publish now" and wait for the dialog to close. Use this for
   * specs that follow up with storefront / DB assertions — the close
   * happens after the underlying `POST /publish` resolves.
   */
  async confirm(): Promise<void> {
    await this.publishNowButton.click();
    await this.dialog.waitFor({ state: 'detached' });
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await this.dialog.waitFor({ state: 'detached' });
  }

  /** Resolves to the "Added" count (number) rendered in the stat card. */
  async addedCount(): Promise<number> {
    const text = (await this.statCard('Added').textContent()) ?? '';
    const m = text.match(/(\d+)/);
    return m ? Number(m[1]) : 0;
  }

  async affectedRouteCount(): Promise<number> {
    const text = (await this.affectsBlock.textContent()) ?? '';
    const m = text.match(/Affects (\d+) page/);
    return m ? Number(m[1]) : 0;
  }
}
