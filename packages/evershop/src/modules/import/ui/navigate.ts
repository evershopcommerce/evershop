/** Leaves the page for another address. Apart so that a test can see where the page goes. */
export function goTo(url: string): void {
  window.location.href = url;
}
