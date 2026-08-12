import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page-object for the right-side Settings drawer.
 *
 * The drawer is an `<aside>` mounted alongside the iframe whenever a
 * widget is selected (either by dropping a new one or by clicking an
 * existing widget in the canvas).
 *
 * Layout from `SettingsDrawer.tsx`:
 *   - top: widget title + pin + close.
 *   - middle: scrollable settings form (`<Area id="widget_setting_form" />`).
 *   - bottom: "Share" button that toggles a menu listing routes.
 *
 * Share menu items: an "All routes" entry at the top, then one entry
 * per shareable route. Each is `<button role="menuitemcheckbox">` with
 * `aria-checked` reflecting whether the widget is currently placed
 * there. The current route shows a "Current" badge.
 */
export class SettingsDrawer {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** The drawer container. Specific to the editor — narrowed to avoid
   * matching the SessionPicker dialog's aside-shaped panel. */
  get drawer(): Locator {
    return this.page
      .locator('.page-builder-editor aside')
      // The leftmost sidebar is also an `<aside>`; the drawer is the
      // second one (rightmost). Filter by presence of the Share footer
      // which is unique to the drawer. The button's accessible name is
      // `"Share<N>"` (text "Share" + a count badge) so we match the
      // prefix rather than the exact string.
      .filter({ has: this.page.getByRole('button', { name: /^Share\b/ }) });
  }

  /** Title text in the drawer header (e.g. "Coupon Block"). */
  title(label: string): Locator {
    return this.drawer.getByText(label).first();
  }

  // ---------- Share dropdown ----------

  get shareTrigger(): Locator {
    return this.drawer.getByRole('button', { name: /^Share\b/ });
  }

  /** Menu element — only mounted while the dropdown is open. */
  get shareMenu(): Locator {
    return this.drawer.getByRole('menu');
  }

  /** "All routes" toggle inside the share menu. */
  get allRoutesItem(): Locator {
    return this.shareMenu.getByRole('menuitemcheckbox', {
      name: /All routes/i
    });
  }

  /** Per-route entry by route name (e.g. "Home Page", "Cart"). */
  routeItem(routeName: string): Locator {
    return this.shareMenu.getByRole('menuitemcheckbox', { name: routeName });
  }

  // ---------- Actions ----------

  /** Open the share dropdown; safe to call when already open. */
  async openShareMenu(): Promise<void> {
    if (await this.shareMenu.isVisible().catch(() => false)) return;
    await this.shareTrigger.click();
    await expect(this.shareMenu).toBeVisible();
  }

  async closeShareMenu(): Promise<void> {
    if (!(await this.shareMenu.isVisible().catch(() => false))) return;
    // Click trigger again toggles closed. Could also press Escape.
    await this.shareTrigger.click();
    await expect(this.shareMenu).not.toBeVisible();
  }

  /** Click the "All routes" item. */
  async toggleAllRoutes(): Promise<void> {
    await this.openShareMenu();
    await this.allRoutesItem.click();
  }

  async toggleRoute(routeName: string): Promise<void> {
    await this.openShareMenu();
    await this.routeItem(routeName).click();
  }

  // ---------- Assertions helpers ----------

  /** Resolves to true / false based on the All routes item's aria-checked. */
  async isAllRoutesChecked(): Promise<boolean> {
    await this.openShareMenu();
    const ariaChecked = await this.allRoutesItem.getAttribute('aria-checked');
    return ariaChecked === 'true';
  }

  async isRouteChecked(routeName: string): Promise<boolean> {
    await this.openShareMenu();
    const ariaChecked = await this.routeItem(routeName).getAttribute(
      'aria-checked'
    );
    return ariaChecked === 'true';
  }
}
