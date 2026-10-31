import Area from '@components/common/Area.js';
import { PoweredByEverShop } from '@components/common/PoweredByEverShop.js';
import React from 'react';

interface FooterProps {
  copyRight: string;
  /** `themeConfig.showPoweredBy`: add "Powered by EverShop" after the copyright line. */
  showPoweredBy?: boolean;
}

export function Footer({ copyRight, showPoweredBy = false }: FooterProps) {
  return (
    <footer className="footer mt-20 border-t border-border bg-muted/30 pt-14 pb-8">
      <Area
        id="footerTop"
        className="footer__top"
        isGlobal
        editableInPageBuilder
      />
      <div className="footer__middle page-width flex flex-wrap items-start justify-between gap-10">
        <Area
          id="footerMiddleLeft"
          className="footer__middle__left"
          isGlobal
          editableInPageBuilder
        />
        <Area
          id="footerMiddleCenter"
          className="footer__middle__center"
          isGlobal
          editableInPageBuilder
        />
        <Area
          id="footerMiddleRight"
          className="footer__middle__right"
          isGlobal
          editableInPageBuilder
        />
      </div>
      <Area
        id="footerBottom"
        className="footer__bottom mt-12 border-t border-border pt-6"
        isGlobal
        editableInPageBuilder
        coreComponents={[
          {
            component: {
              default: (
                <div className="page-width">
                  <div className="copyright text-center text-sm text-muted-foreground">
                    <span>{copyRight}</span>
                    {showPoweredBy && (
                      <>
                        <span aria-hidden="true">{' · '}</span>
                        <PoweredByEverShop
                          utmSource="footer_store"
                          className="underline-offset-4 hover:text-foreground hover:underline"
                        />
                      </>
                    )}
                  </div>
                </div>
              )
            },
            sortOrder: 10
          }
        ]}
      />
    </footer>
  );
}
