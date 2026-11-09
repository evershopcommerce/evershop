// Core bugs the release check has FOUND and that are not fixed yet. A spec
// that only passes through a page with one of these bugs may allow its
// message (through `test.use({ allowedErrors: [...] })`), so the rest of the
// flow is still checked. The bug itself must stay caught by another test
// (named in `caughtBy`), and the entry goes away when the bug is fixed.
export const KNOWN_BUGS = {
  /**
   * `<DialogTrigger><Button/></DialogTrigger>` renders a <button> inside a
   * <button>; React's hydration fails in production with error #418.
   * Seen in catalog/pages/admin/productEdit+productNew/Shipping.tsx
   * ("+ New package"), cms/pages/admin/widgetGrid/NewWidgetButton.tsx,
   * oms/pages/admin/orderEdit/CancelButton.tsx (the admin order page),
   * catalog/pages/admin/categoryEdit/Products.tsx ("Add Products") and
   * catalog/pages/admin/productEdit/variants/CreateVariant.tsx ("Add Variant").
   */
  nestedButtonHydration: {
    message: /Minified React error #418/,
    caughtBy: 'R-SMK-02 (visits /admin/products/new and /admin/widgets)'
  },
  /**
   * components/common/form/Editor.tsx seeds its first row with uuidv4() ids
   * inside useState, so the server and the browser make different ids;
   * hydration keeps the server's holder <div id>, and Editor.js cannot find
   * the holder it looks for. No description editor on /admin/categories/new,
   * /admin/pages/new, /admin/blog/posts/new (hidden on /admin/products/new,
   * where the #418 error makes React re-render on the client). Since 2.2.1.
   */
  editorHolderMissing: {
    message: /element with ID «c__[0-9a-f-]+» is missing/,
    caughtBy: 'R-CAT-11 (the new-category form)'
  }
} as const;
