import { settle } from './fakeTab.js';

/**
 * The controls of the core (base-ui), as a jsdom test meets them: a radio and a
 * checkbox are elements with a role (the `<input>` beside them is a hidden twin),
 * and a select is a button that opens its list in the body of the page.
 */
type Act = (callback: () => Promise<void>) => Promise<void>;

export const radioNamed = (root: ParentNode, name: string) =>
  root.querySelector<HTMLElement>(`[role="radio"][aria-label="${name}"]`);

export const checkboxNamed = (root: ParentNode, name: string) =>
  root.querySelector<HTMLElement>(`[role="checkbox"][aria-label="${name}"]`);

export const comboboxNamed = (root: ParentNode, name: string) =>
  root.querySelector<HTMLElement>(`[role="combobox"][aria-label="${name}"]`);

/** The select that a visible label with this text points at. */
export function comboboxLabelled(root: ParentNode, text: string) {
  const label = [...root.querySelectorAll('label')].find(
    (candidate) => candidate.textContent === text
  );
  const id = label?.getAttribute('for');
  return id ? root.querySelector<HTMLElement>(`[id="${id}"]`) : null;
}

/** True for a radio or a checkbox that is on. */
export const isOn = (element: Element | null) =>
  element?.getAttribute('aria-checked') === 'true';

/** True for a control the core holds (`disabled` or `data-disabled`). */
export const isHeld = (element: Element | null) =>
  element !== null &&
  (element.hasAttribute('disabled') ||
    element.hasAttribute('data-disabled') ||
    element.getAttribute('aria-disabled') === 'true');

/** What a select shows as its choice (the arrow beside it is not text). */
export const shown = (trigger: Element | null) =>
  trigger?.querySelector('[data-slot="select-value"]')?.textContent ?? null;

/** The choices a select shows while it is open. */
export const openChoices = () =>
  [...document.querySelectorAll('[role="option"]')].map(
    (option) => option.textContent
  );

const press = (element: Element, type: string) =>
  element.dispatchEvent(
    new window.MouseEvent(type, { bubbles: true, cancelable: true, button: 0 })
  );

/** Opens the select and lets the page settle. */
export async function openList(act: Act, trigger: HTMLElement) {
  await act(async () => {
    press(trigger, 'mousedown');
    press(trigger, 'mouseup');
    press(trigger, 'click');
    await settle();
  });
}

/** Opens the select, picks the choice with this text and lets the page settle. */
export async function choose(act: Act, trigger: HTMLElement, text: string) {
  await openList(act, trigger);
  const option = [...document.querySelectorAll('[role="option"]')].find(
    (candidate) => candidate.textContent === text
  );
  if (!option) {
    throw new Error(
      `No choice "${text}" in the list: ${JSON.stringify(openChoices())}`
    );
  }
  // The list takes a click only on the choice it has lit: the pointer moves over it first.
  await act(async () => {
    press(option, 'mousemove');
    await settle();
  });
  await act(async () => {
    press(option, 'click');
    await settle();
  });
}
