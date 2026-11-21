import { describe, it, expect } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * The storefront and admin footers add "Powered by EverShop", linking to
 * evershop.io in a new tab, when `themeConfig.showPoweredBy` is true; never
 * next to a store owner's own copyright text. On the storefront it shares one
 * centered line with the copyright, the only core content of `footerBottom`.
 */
const { AppProvider } = await import('../../../../components/common/context/app.js');
const { Footer } = await import('../../../../components/frontStore/Footer.js');
const base = await import('../../../base/pages/frontStore/all/Base.js');
const adminCopyRight = await import('../../pages/admin/all/CopyRight.js');

const AdminCopyRight = adminCopyRight.default;
const app = { config: { pageMeta: { route: { id: 'homepage' } } }, widgets: [], propsMap: {} } as unknown as React.ComponentProps<typeof AppProvider>['value'];
const storefront = (props: React.ComponentProps<typeof Footer>) =>
  renderToStaticMarkup(
    <AppProvider value={app}>
      <Footer {...props} />
    </AppProvider>
  );
const links = (html: string): string[] => html.match(/<a [^>]*>[^<]*<\/a>/g) ?? [];

describe('"Powered by EverShop" in the storefront footer', () => {
  it('one centered line in footerBottom: the copyright, a dot, then the link', () => {
    const html = storefront({ copyRight: '© 2026 Daylight', showPoweredBy: true });
    const bottom = html.slice(html.indexOf('data-evershop-area-id="footerBottom"'));
    expect(bottom).toMatch(
      /<div class="page-width"><div class="copyright text-center [^"]*"><span>© 2026 Daylight<\/span><span aria-hidden="true"> · <\/span><a [^>]*>Powered by EverShop<\/a><\/div><\/div>/
    );
    const [link] = links(bottom);
    expect(link).toContain('href="https://evershop.io/?utm_source=footer_store"');
    expect(link).toContain('target="_blank"');
    expect(link).toContain('rel="noopener noreferrer"');
  });

  it('no payment card icons any more', () => {
    const html = storefront({ copyRight: '© 2026 Daylight', showPoweredBy: true });
    expect(html).not.toContain('card-icons');
    expect(html).not.toContain('<svg');
  });

  it("only the copyright with the store owner's own text, or when the prop is missing", () => {
    for (const html of [
      storefront({ copyRight: '© Daylight Coffee Roasters', showPoweredBy: false }),
      storefront({ copyRight: '© Daylight Coffee Roasters' })
    ]) {
      expect(html).toContain('<span>© Daylight Coffee Roasters</span></div>');
      expect(html).not.toContain('Powered by EverShop');
    }
  });

  it('Base asks for showPoweredBy and hands it to the footer', () => {
    expect(base.query).toMatch(/themeConfig\s*{\s*copyRight\s+showPoweredBy\s*}/);
    const page = (showPoweredBy: boolean) =>
      renderToStaticMarkup(
        <AppProvider value={app}>
          <base.default
            {...({
              myCart: null,
              customer: null,
              themeConfig: { copyRight: '© 2026 Daylight', showPoweredBy },
              addMineCartItemApi: '/api/cart/mine/items',
              loginApi: '/customer/login',
              logoutApi: '/customer/logout',
              registerApi: '/api/customers'
            } as unknown as React.ComponentProps<typeof base.default>)}
          />
        </AppProvider>
      );
    expect(links(page(true)).filter((l) => l.includes('Powered by EverShop'))).toHaveLength(1);
    expect(page(false)).not.toContain('Powered by EverShop');
  });
});

describe('"Powered by EverShop" in the admin footer', () => {
  it('same rule and dot, its own utm_source', () => {
    const shown = renderToStaticMarkup(<AdminCopyRight themeConfig={{ copyRight: '© 2026 Daylight', showPoweredBy: true }} />);
    expect(shown).toContain('<span>© 2026 Daylight</span><span aria-hidden="true"> · </span><a ');
    const [link] = links(shown);
    expect(link).toContain('href="https://evershop.io/?utm_source=footer_admin"');
    expect(link).toContain('target="_blank"');
    expect(link).toContain('>Powered by EverShop</a>');
    const hidden = renderToStaticMarkup(<AdminCopyRight themeConfig={{ copyRight: '© Daylight Coffee Roasters', showPoweredBy: false }} />);
    expect(hidden).toContain('© Daylight Coffee Roasters');
    expect(hidden).not.toContain('Powered by EverShop');
    expect(adminCopyRight.query).toContain('showPoweredBy');
  });
});
