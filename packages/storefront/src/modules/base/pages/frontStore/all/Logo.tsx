import React from 'react';

interface LogoProps {
  themeConfig: {
    logo: {
      src?: string;
      alt?: string;
      width?: number;
      height?: number;
    };
  };
}

/**
 * Brand mark: an outlined tote/bag glyph with an amber accent, paired with
 * the wordmark set in the display serif.
 */
export default function Logo({
  themeConfig: {
    logo: { src, alt = 'Storefront', width = 128, height = 128 }
  }
}: LogoProps) {
  return (
    <div className="logo flex justify-start items-center">
      <a
        href="/"
        className="logo-icon group inline-flex items-center gap-2.5"
        aria-label={alt}
      >
        {src ? (
          <img src={src} alt={alt} width={width} height={height} />
        ) : (
          <>
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              className="w-8 h-8 shrink-0"
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
          </>
        )}
      </a>
    </div>
  );
}

export const layout = {
  areaId: 'headerMiddleLeft',
  sortOrder: 1
};

export const query = `
  query query {
    themeConfig {
      logo {
        src
        alt
        width
        height
      }
    }
  }
`;
