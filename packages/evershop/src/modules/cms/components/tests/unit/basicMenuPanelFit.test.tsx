import '../../../../../components/frontStore/customer/address/tests/unit/domSetup.js';
import { afterEach, describe, expect, it, jest } from '@jest/globals';

/**
 * The mobile menu panel hangs from its toggle's left edge. With a centred toggle that is the middle
 * of a phone, so the 256px panel ran off the right (theme-lab FINDINGS #53). Once open it now
 * measures where it landed and moves back inside the viewport.
 *
 * jsdom has no layout, so the panel's box is stated: the test says where the browser WOULD have put
 * it and checks what the component does about it.
 */
// The desktop half of the menu is Base UI; only the mobile panel is under test.
jest.unstable_mockModule('@components/common/ui/NavigationMenu.js', () => {
  const Pass = ({ children }: { children?: unknown }) => children ?? null;
  return {
    NavigationMenu: Pass,
    NavigationMenuContent: Pass,
    NavigationMenuItem: Pass,
    NavigationMenuLink: Pass,
    NavigationMenuList: Pass,
    NavigationMenuTrigger: Pass
  };
});
const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { default: BasicMenu } = await import('../../BasicMenu.js');

const VIEWPORT = 390;
const PANEL = 'evershop-basic-menu__mobile-panel';
let box = { left: 175, right: 431 };

// Where the browser would have put the panel; everything else is a zero box.
const realRect = window.HTMLElement.prototype.getBoundingClientRect;
window.HTMLElement.prototype.getBoundingClientRect = function rect(this: HTMLElement) {
  if (this.className.includes(PANEL)) {
    return { left: box.left, right: box.right, top: 0, bottom: 0, width: box.right - box.left, height: 0, x: box.left, y: 0, toJSON() {} } as DOMRect;
  }
  return realRect.call(this);
};
Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, get: () => VIEWPORT });

const menu = {
  menus: [{ id: 'm1', name: 'Shop', url: '/shop', type: 'custom', uuid: null, newTab: false, nofollow: false, noReferrer: false, children: [] }],
  isMain: true,
  className: ''
};

describe('BasicMenu mobile panel', () => {
  let container: HTMLElement;
  let root: ReturnType<typeof createRoot>;
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const open = async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<BasicMenu basicMenuWidget={menu as unknown as React.ComponentProps<typeof BasicMenu>['basicMenuWidget']} />);
    });
    const toggle = container.querySelector('.evershop-basic-menu__toggle') as HTMLButtonElement;
    await act(async () => {
      toggle.click();
    });
    return container.querySelector(`.${PANEL}`) as HTMLElement;
  };

  it('is not drawn until the toggle is pressed', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<BasicMenu basicMenuWidget={menu as unknown as React.ComponentProps<typeof BasicMenu>['basicMenuWidget']} />);
    });
    expect(container.querySelector(`.${PANEL}`)).toBeNull();
  });

  it('is pulled back inside a 390px viewport when a centred toggle puts it past the right edge', async () => {
    box = { left: 175, right: 431 };
    const panel = await open();
    expect(panel).not.toBeNull();
    expect(panel.style.translate).toBe('-49px 0');
  });

  it('is left exactly where it is when it already fits', async () => {
    box = { left: 8, right: 264 };
    const panel = await open();
    expect(panel.style.translate).toBe('');
  });

  it('uses `translate`, not `transform`, so a theme that positions the panel with a transform keeps it', async () => {
    box = { left: 175, right: 431 };
    const panel = await open();
    expect(panel.style.transform).toBe('');
  });

  it('fits it again when the window is resized', async () => {
    box = { left: 8, right: 264 };
    const panel = await open();
    expect(panel.style.translate).toBe('');
    box = { left: 150, right: 406 };
    await act(async () => {
      window.dispatchEvent(new window.Event('resize'));
    });
    expect(panel.style.translate).toBe('-24px 0');
  });

  it('stops listening once the panel is closed', async () => {
    box = { left: 175, right: 431 };
    const panel = await open();
    const toggle = container.querySelector('.evershop-basic-menu__toggle') as HTMLButtonElement;
    await act(async () => {
      toggle.click();
    });
    expect(container.querySelector(`.${PANEL}`)).toBeNull();
    // A resize with no panel must be a no-op, not an error.
    await act(async () => {
      window.dispatchEvent(new window.Event('resize'));
    });
    expect(panel.isConnected).toBe(false);
  });
});
