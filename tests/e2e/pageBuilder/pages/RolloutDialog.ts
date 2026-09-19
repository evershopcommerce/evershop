import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page-object for the "Save as rollout plan" / "Edit rollout schedule"
 * dialog. The dialog is the same component in both modes — caller
 * differentiates via the title locator.
 *
 * Field shape per `RolloutDialog.tsx`:
 *   - `Name` text input (autofocused)
 *   - `Start` datetime-local input
 *   - `End (optional)` datetime-local input (disabled until Start has a value)
 *   - Inline overlap error + a chip row listing conflicting plan names
 *   - Status badge: "Scheduled" (valid) / "Conflicts with X" / "Invalid window" / etc.
 *   - "Cancel" + "Create rollout plan" buttons (label changes to
 *     "Save changes" in edit mode)
 */
export class RolloutDialogPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get dialog(): Locator {
    // Dialog title is unique enough to disambiguate from other modals.
    return this.page.getByRole('dialog').filter({
      hasText: /Save as rollout plan|Edit rollout schedule/
    });
  }

  get title(): Locator {
    return this.dialog.getByText(/Save as rollout plan|Edit rollout schedule/);
  }

  get nameInput(): Locator {
    // The Name input is the first text input in the dialog. Anchor via
    // role+name="" doesn't work because the visible label isn't bound
    // with `htmlFor`. Use a stable structural locator instead.
    return this.dialog.locator('input[type="text"]').first();
  }

  get startInput(): Locator {
    return this.dialog.locator('input[type="datetime-local"]').nth(0);
  }

  get endInput(): Locator {
    return this.dialog.locator('input[type="datetime-local"]').nth(1);
  }

  /** Status badge — "Scheduled" / "Conflicts with …" / "Invalid window" / etc. */
  get statusBadge(): Locator {
    return this.dialog
      .locator(
        'span.inline-flex.items-center.px-1\\.5.py-0\\.5.rounded-full'
      )
      .first();
  }

  /** Inline cross-field overlap error block (rendered as role="alert"). */
  get overlapError(): Locator {
    return this.dialog.locator('[role="alert"]', {
      hasText: /Overlaps with existing rollout/i
    });
  }

  /** The submit CTA — label varies by mode. */
  get submitButton(): Locator {
    return this.dialog.getByRole('button', {
      name: /Create rollout plan|Save changes/i
    });
  }

  get cancelButton(): Locator {
    return this.dialog.getByRole('button', { name: 'Cancel' });
  }

  /**
   * Format a Date into the value `<input type="datetime-local">` expects
   * (`yyyy-MM-ddTHH:mm` in local timezone). Mirrors `RolloutDialog.tsx`'s
   * `isoToLocalInput`.
   */
  static toLocalInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  }

  async fill(opts: {
    name?: string;
    start?: Date;
    end?: Date | null;
  }): Promise<void> {
    if (opts.name !== undefined) {
      await this.nameInput.fill(opts.name);
    }
    if (opts.start !== undefined) {
      await this.startInput.fill(RolloutDialogPage.toLocalInput(opts.start));
    }
    if (opts.end !== undefined) {
      if (opts.end === null) {
        await this.endInput.fill('');
      } else {
        await this.endInput.fill(RolloutDialogPage.toLocalInput(opts.end));
      }
    }
  }

  async waitForOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await this.dialog.waitFor({ state: 'detached' });
  }
}
