import React from 'react';

interface MenuItem {
  name: string;
  url: string;
  type: string;
  uuid: string;
}

interface BasicMenuProps {
  basicMenuWidget: {
    menus: (MenuItem & {
      id: string;
      children: MenuItem[];
    })[];
    isMain: boolean;
    className: string;
  };
}

/**
 * Primary navigation. On desktop it is a horizontal row with hover dropdowns
 * and an animated underline; on mobile it collapses into a slide-down panel
 * behind a hamburger toggle.
 */
export default function BasicMenu({
  basicMenuWidget: { menus, isMain, className }
}: BasicMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  if (!menus || menus.length === 0) {
    return null;
  }

  const links = (
    <ul
      className={
        isMain
          ? 'flex flex-col md:flex-row md:items-center gap-1 md:gap-7'
          : 'flex flex-wrap items-center gap-6'
      }
    >
      {menus.map((item) => (
        <li key={item.id || item.uuid} className="relative md:group">
          <a
            href={item.url}
            className="nav__link inline-flex items-center gap-1 py-2.5 md:py-1 text-[0.9375rem] font-medium text-secondary hover:text-primary transition-colors"
          >
            {item.name}
            {item.children.length > 0 && (
              <svg
                className="w-3.5 h-3.5 opacity-60 transition-transform duration-200 md:group-hover:rotate-180"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="m6 8 4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </a>

          {item.children.length > 0 && (
            <ul className="nav__dropdown md:absolute md:left-0 md:top-full md:pt-3 md:w-56 md:invisible md:opacity-0 md:translate-y-1 md:group-hover:visible md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-200 z-40 pl-3 md:pl-0">
              <div className="md:surface-card md:overflow-hidden md:p-1.5">
                {item.children.map((subItem) => (
                  <li key={subItem.uuid}>
                    <a
                      href={subItem.url}
                      className="block rounded-lg px-3 py-2 text-[0.9375rem] text-secondary hover:bg-surfaceSubdued hover:text-primary transition-colors"
                    >
                      {subItem.name}
                    </a>
                  </li>
                ))}
              </div>
            </ul>
          )}
        </li>
      ))}
    </ul>
  );

  if (!isMain) {
    return <nav className={className}>{links}</nav>;
  }

  return (
    <nav className={`main-nav ${className || ''}`} aria-label="Main">
      {/* Desktop */}
      <div className="hidden md:block">{links}</div>

      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="md:hidden inline-flex items-center justify-center w-10 h-10 -ml-2 rounded-full text-primary hover:bg-surfaceSubdued transition-colors"
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 6l12 12M18 6L6 18"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 7h16M4 12h16M4 17h16"
            />
          )}
        </svg>
      </button>

      {/* Mobile panel */}
      {isOpen && (
        <div className="md:hidden fixed inset-x-0 top-[var(--header-height,64px)] z-40 border-t border-divider bg-white shadow-overlay animate-fadeUp">
          <div className="page-width py-4">{links}</div>
        </div>
      )}
    </nav>
  );
}

export const query = `
  query Query($settings: JSON) {
    basicMenuWidget(settings: $settings) {
      menus {
        id
        name
        url
        type
        uuid
        children {
          name
          url
          type
          uuid
        }
      }
      isMain
      className
    }
  }
`;

export const variables = `{
  settings: getWidgetSetting()
}`;
