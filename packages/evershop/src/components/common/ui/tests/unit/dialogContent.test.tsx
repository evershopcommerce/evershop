import '../../../../frontStore/customer/address/tests/unit/domSetup.js';
import { afterEach, describe, expect, it } from '@jest/globals';

/**
 * `DialogContent` is a fixed, centred popup. Taller than the viewport it must
 * scroll inside itself: the page scroll is locked while a dialog is open, so
 * without a max-height and its own overflow a long form (an address with
 * wards, split names, extra fields) clipped at both ends and hid its Save
 * button with no way to reach it (theme-lab FINDINGS #48). Mounted through the
 * jsdom harness the address-form tests use — the popup portals to body.
 */
const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { Dialog, DialogContent, DialogTitle } = await import('../../Dialog.js');

describe('DialogContent', () => {
  let container: HTMLElement | undefined;
  let root: ReturnType<typeof createRoot> | undefined;
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  it('caps the popup at the viewport and scrolls inside it', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>A long dialog</DialogTitle>
            <div style={{ height: 4000 }} />
          </DialogContent>
        </Dialog>
      );
    });
    const popup = document.querySelector('[data-slot="dialog-content"]');
    expect(popup).not.toBeNull();
    const classes = popup!.className.split(/\s+/);
    expect(classes).toEqual(
      expect.arrayContaining(['max-h-[calc(100dvh-2rem)]', 'overflow-y-auto'])
    );
    // still a fixed, centred popup — the scroll is added, the placement kept
    expect(classes).toEqual(
      expect.arrayContaining(['fixed', 'top-1/2', 'left-1/2'])
    );
  });
});
