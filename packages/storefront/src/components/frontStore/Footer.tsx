import Area from '@components/common/Area.js';
import React from 'react';

interface FooterProps {
  copyRight: string;
}

const PaymentMarks: React.FC = () => (
  <div className="card-icons flex items-center gap-2" aria-hidden="true">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="38"
      height="24"
      viewBox="0 0 38 24"
      className="h-6 w-auto opacity-70"
    >
      <path
        d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"
        opacity="0.07"
      />
      <path
        fill="#fff"
        d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"
      />
      <path
        fill="#142688"
        d="M28.3 10.1H28c-.4 1-.7 1.5-1 3h1.9c-.3-1.5-.3-2.2-.6-3zm2.9 5.9h-1.7c-.1 0-.1 0-.2-.1l-.2-.9-.1-.2h-2.4c-.1 0-.2 0-.2.2l-.3.9c0 .1-.1.1-.1.1h-2.1l.2-.5L27 8.7c0-.5.3-.7.8-.7h1.5c.1 0 .2 0 .2.2l1.4 6.5c.1.4.2.7.2 1.1.1.1.1.1.1.2zm-13.4-.3l.4-1.8c.1 0 .2.1.2.1.7.3 1.4.5 2.1.4.2 0 .5-.1.7-.2.5-.2.5-.7.1-1.1-.2-.2-.5-.3-.8-.5-.4-.2-.8-.4-1.1-.7-1.2-1-.8-2.4-.1-3.1.6-.4.9-.8 1.7-.8 1.2 0 2.5 0 3.1.2h.1c-.1.6-.2 1.1-.4 1.7-.5-.2-1-.4-1.5-.4-.3 0-.6 0-.9.1-.2 0-.3.1-.4.2-.2.2-.2.5 0 .7l.5.4c.4.2.8.4 1.1.6.5.3 1 .8 1.1 1.4.2.9-.1 1.7-.9 2.3-.5.4-.7.6-1.4.6-1.4 0-2.5.1-3.4-.2-.1.2-.1.2-.2.1zm-3.5.3c.1-.7.1-.7.2-1 .5-2.2 1-4.5 1.4-6.7.1-.2.1-.3.3-.3H18c-.2 1.2-.4 2.1-.7 3.2-.3 1.5-.6 3-1 4.5 0 .2-.1.2-.3.2M5 8.2c0-.1.2-.2.3-.2h3.4c.5 0 .9.3 1 .8l.9 4.4c0 .1 0 .1.1.2 0-.1.1-.1.1-.1l2.1-5.1c-.1-.1 0-.2.1-.2h2.1c0 .1 0 .1-.1.2l-3.1 7.3c-.1.2-.1.3-.2.4-.1.1-.3 0-.5 0H9.7c-.1 0-.2 0-.2-.2L7.9 9.5c-.2-.2-.5-.5-.9-.6-.6-.3-1.7-.5-1.9-.5L5 8.2z"
      />
    </svg>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="38"
      height="24"
      viewBox="0 0 38 24"
      className="h-6 w-auto opacity-70"
    >
      <path
        d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"
        opacity="0.07"
      />
      <path
        fill="#fff"
        d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"
      />
      <circle cx="15" cy="12" r="7" fill="#EB001B" />
      <circle cx="23" cy="12" r="7" fill="#F79E1B" />
      <path
        fill="#FF5F00"
        d="M22 12c0-2.4-1.2-4.5-3-5.7-1.8 1.3-3 3.4-3 5.7s1.2 4.5 3 5.7c1.8-1.2 3-3.3 3-5.7z"
      />
    </svg>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="38"
      height="24"
      viewBox="0 0 38 24"
      className="h-6 w-auto opacity-70"
    >
      <path
        opacity=".07"
        d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"
      />
      <path
        fill="#fff"
        d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"
      />
      <path
        fill="#003087"
        d="M23.9 8.3c.2-1 0-1.7-.6-2.3-.6-.7-1.7-1-3.1-1h-4.1c-.3 0-.5.2-.6.5L14 15.6c0 .2.1.4.3.4H17l.4-3.4 1.8-2.2 4.7-2.1z"
      />
      <path
        fill="#3086C8"
        d="M23.9 8.3l-.2.2c-.5 2.8-2.2 3.8-4.6 3.8H18c-.3 0-.5.2-.6.5l-.6 3.9-.2 1c0 .2.1.4.3.4H19c.3 0 .5-.2.5-.4v-.1l.4-2.4v-.1c0-.2.3-.4.5-.4h.3c2.1 0 3.7-.8 4.1-3.2.2-1 .1-1.8-.4-2.4-.1-.5-.3-.7-.5-.8z"
      />
      <path
        fill="#012169"
        d="M23.3 8.1c-.1-.1-.2-.1-.3-.1-.1 0-.2 0-.3-.1-.3-.1-.7-.1-1.1-.1h-3c-.1 0-.2 0-.2.1-.2.1-.3.2-.3.4l-.7 4.4v.1c0-.3.3-.5.6-.5h1.3c2.5 0 4.1-1 4.6-3.8v-.2c-.1-.1-.3-.2-.5-.2h-.1z"
      />
    </svg>
  </div>
);

export function Footer({ copyRight }: FooterProps) {
  return (
    <footer className="footer mt-24 border-t border-divider bg-surfaceSubdued">
      <Area id="footerTop" className="footer__top" />

      <div className="page-width">
        <div className="footer__middle grid grid-cols-1 gap-10 py-14 md:grid-cols-12 md:gap-8">
          {/* Brand + newsletter */}
          <div className="md:col-span-5 lg:col-span-4">
            <div className="flex items-center gap-2.5">
              <svg
                width="28"
                height="28"
                viewBox="0 0 32 32"
                fill="none"
                className="w-7 h-7 text-primary"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="3.25"
                  y="9.25"
                  width="25.5"
                  height="19.5"
                  rx="4.75"
                  stroke="currentColor"
                  strokeWidth="1.9"
                />
                <path
                  d="M10.75 12.5V8.5a5.25 5.25 0 1 1 10.5 0v4"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
                <circle cx="16" cy="19" r="2.75" fill="#c2410c" />
              </svg>
              <span className="font-display text-xl font-semibold tracking-tightest text-primary">
                Storefront
              </span>
            </div>
            <p className="mt-4 max-w-sm text-[0.9375rem] text-textSubdued">
              Considered objects for everyday use — chosen for how they feel in
              the hand, not just how they look on a shelf.
            </p>

            <Area id="footerMiddleLeft" className="footer__middle__left mt-6" />
          </div>

          {/* Link columns are extension points; core ships sensible defaults */}
          <div className="md:col-span-7 lg:col-span-8">
            <Area
              id="footerMiddleCenter"
              className="footer__middle__center"
              coreComponents={[
                {
                  component: {
                    default: (
                      <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                        <div>
                          <h6 className="mb-3 text-xs font-semibold uppercase tracking-widest text-textSubdued">
                            Shop
                          </h6>
                          <ul className="space-y-2.5 text-[0.9375rem]">
                            <li>
                              <a
                                className="text-secondary hover:text-accent"
                                href="/"
                              >
                                All products
                              </a>
                            </li>
                            <li>
                              <a
                                className="text-secondary hover:text-accent"
                                href="/search"
                              >
                                Search
                              </a>
                            </li>
                            <li>
                              <a
                                className="text-secondary hover:text-accent"
                                href="/cart"
                              >
                                Your cart
                              </a>
                            </li>
                          </ul>
                        </div>
                        <div>
                          <h6 className="mb-3 text-xs font-semibold uppercase tracking-widest text-textSubdued">
                            Company
                          </h6>
                          <ul className="space-y-2.5 text-[0.9375rem]">
                            <li>
                              <a
                                className="text-secondary hover:text-accent"
                                href="/page/about-us"
                              >
                                About us
                              </a>
                            </li>
                          </ul>
                        </div>
                        <div>
                          <h6 className="mb-3 text-xs font-semibold uppercase tracking-widest text-textSubdued">
                            Account
                          </h6>
                          <ul className="space-y-2.5 text-[0.9375rem]">
                            <li>
                              <a
                                className="text-secondary hover:text-accent"
                                href="/account"
                              >
                                My account
                              </a>
                            </li>
                            <li>
                              <a
                                className="text-secondary hover:text-accent"
                                href="/account/login"
                              >
                                Sign in
                              </a>
                            </li>
                          </ul>
                        </div>
                      </div>
                    )
                  },
                  sortOrder: 10
                }
              ]}
            />
            <Area id="footerMiddleRight" className="footer__middle__right" />
          </div>
        </div>
      </div>

      <div className="border-t border-divider">
        <div className="page-width">
          <Area
            id="footerBottom"
            className="footer__bottom"
            coreComponents={[
              {
                component: {
                  default: (
                    <div className="flex flex-col-reverse items-center justify-between gap-4 py-6 md:flex-row">
                      <div className="copyright text-sm text-textSubdued">
                        <span>{copyRight}</span>
                      </div>
                      <PaymentMarks />
                    </div>
                  )
                },
                sortOrder: 10
              }
            ]}
          />
        </div>
      </div>
    </footer>
  );
}
