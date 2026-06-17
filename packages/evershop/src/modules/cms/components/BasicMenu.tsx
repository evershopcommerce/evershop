import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from '@components/common/ui/NavigationMenu.js';
import { cn } from '@evershop/evershop/lib/util/cn';
import { ChevronDown, Menu, X } from 'lucide-react';
import React from 'react';

/**
 * Coerce a list setting into an array. Menu settings normally arrive as a
 * real array, but a half-configured widget can persist them as a JSON
 * string (the legacy editor seeds list fields as stringified hidden
 * inputs) — guard so `.map`/`.length` never run on a string.
 */
function toMenuArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

interface BasicMenuLinkFlags {
  newTab?: boolean;
  nofollow?: boolean;
  noReferrer?: boolean;
}

/**
 * Compose anchor `rel`. New-tab links always carry noopener+noreferrer
 * (tab-nabbing protection); nofollow and same-tab noreferrer are independent
 * opt-ins. Undefined when no token applies so we don't emit an empty rel.
 */
function relFor(link: BasicMenuLinkFlags): string | undefined {
  const tokens = [
    link.newTab ? 'noopener' : null,
    link.newTab || link.noReferrer ? 'noreferrer' : null,
    link.nofollow ? 'nofollow' : null
  ].filter(Boolean);
  return tokens.length > 0 ? tokens.join(' ') : undefined;
}

interface BasicMenuProps {
  basicMenuWidget: {
    menus: ({
      id: string;
      name: string;
      url: string;
      type: string;
      uuid: string;
      children: ({
        name: string;
        url: string;
        type: string;
        uuid: string;
      } & BasicMenuLinkFlags)[];
    } & BasicMenuLinkFlags)[];
    isMain: boolean;
    className: string;
  };
}

type BasicMenuNode = BasicMenuProps['basicMenuWidget']['menus'][number];

/**
 * A plain anchor that applies a link's new-tab / SEO flags. Split into two
 * literal branches so `react/jsx-no-target-blank` can statically verify the
 * new-tab branch carries `noopener noreferrer`.
 */
function MenuAnchor({
  link,
  className,
  children
}: {
  link: BasicMenuLinkFlags & { url: string };
  className?: string;
  children: React.ReactNode;
}) {
  return link.newTab ? (
    <a
      href={link.url}
      target="_blank"
      rel={
        link.nofollow ? 'noopener noreferrer nofollow' : 'noopener noreferrer'
      }
      className={className}
    >
      {children}
    </a>
  ) : (
    <a href={link.url} rel={relFor(link)} className={className}>
      {children}
    </a>
  );
}

/**
 * The mobile list of every root item + its sub-items. Used both inside the
 * hamburger panel (main menus) and rendered inline (non-main menus, e.g. a
 * simple footer link list).
 */
function MobileItemList({
  items,
  isActive
}: {
  items: BasicMenuNode[];
  isActive: (url: string) => boolean;
}) {
  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <li key={item.uuid} className="evershop-basic-menu__mobile-group">
          <MenuAnchor
            link={item}
            className={cn(
              'evershop-basic-menu__mobile-link block rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/60',
              isActive(item.url) && 'text-primary'
            )}
          >
            {item.name}
          </MenuAnchor>
          {item.children.length > 0 && (
            <ul className="evershop-basic-menu__mobile-subs mb-1 ml-3 flex flex-col border-l border-divider pl-2">
              {item.children.map((subItem) => (
                <li key={subItem.uuid}>
                  <MenuAnchor
                    link={subItem}
                    className="evershop-basic-menu__mobile-sub-link block rounded-md px-3 py-1.5 text-sm text-foreground/70 transition-colors hover:bg-muted/50 hover:text-foreground"
                  >
                    {subItem.name}
                  </MenuAnchor>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function BasicMenu({
  basicMenuWidget: { menus, isMain, className }
}: BasicMenuProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [currentPath, setCurrentPath] = React.useState('');

  React.useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  const menuItems = toMenuArray<BasicMenuNode>(menus).map((item) => ({
    ...item,
    children: toMenuArray<BasicMenuNode['children'][number]>(item.children)
  }));

  const isActive = (url: string) =>
    url === '/' ? currentPath === '/' : !!url && currentPath.startsWith(url);

  return (
    <div className={`evershop-basic-menu ${className ?? ''}`}>
      {/* Desktop (md+): horizontal menu; a parent with children opens a
          hover/focus dropdown. The trigger itself is a real link. */}
      <nav className="evershop-basic-menu__desktop hidden md:block">
        <NavigationMenu className="evershop-basic-menu__menu max-w-full">
          <NavigationMenuList className="evershop-basic-menu__items items-center gap-1">
            {menuItems.map((item) => (
              <NavigationMenuItem
                key={item.uuid}
                className="evershop-basic-menu__item"
              >
                {item.children.length > 0 ? (
                  <>
                    {/* Trigger renders as an <a> (Base UI render prop,
                        nativeButton={false}) so it navigates on click and
                        still opens on hover. rel split into literals for
                        jsx-no-target-blank. */}
                    <NavigationMenuTrigger
                      className="evershop-basic-menu__trigger justify-center bg-transparent hover:bg-transparent focus:bg-transparent data-open:bg-transparent data-popup-open:bg-transparent hover:font-semibold hover:text-primary"
                      nativeButton={false}
                      render={
                        item.newTab ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel={
                              item.nofollow
                                ? 'noopener noreferrer nofollow'
                                : 'noopener noreferrer'
                            }
                          >
                            {item.name}
                            <ChevronDown
                              className="relative top-px ml-1 size-3"
                              aria-hidden="true"
                            />
                          </a>
                        ) : (
                          <a href={item.url} rel={relFor(item)}>
                            {item.name}
                            <ChevronDown
                              className="relative top-px ml-1 size-3"
                              aria-hidden="true"
                            />
                          </a>
                        )
                      }
                    />
                    <NavigationMenuContent>
                      <ul className="evershop-basic-menu__subs flex flex-col min-w-50 p-2">
                        {item.children.map((subItem) => (
                          <li
                            key={subItem.uuid}
                            className="evershop-basic-menu__sub"
                          >
                            <NavigationMenuLink
                              href={subItem.url}
                              target={subItem.newTab ? '_blank' : undefined}
                              rel={relFor(subItem)}
                              className="evershop-basic-menu__sub-link w-full"
                            >
                              {subItem.name}
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </>
                ) : (
                  <NavigationMenuLink
                    href={item.url}
                    target={item.newTab ? '_blank' : undefined}
                    rel={relFor(item)}
                    className="evershop-basic-menu__link px-4 py-2 hover:text-primary transition-colors data-[active=true]:text-primary data-[active=true]:font-semibold hover:bg-transparent focus:bg-transparent hover:underline"
                    data-active={isActive(item.url)}
                  >
                    {item.name}
                  </NavigationMenuLink>
                )}
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </nav>

      {/* Mobile (<md). A "main" menu collapses behind a hamburger; a non-main
          menu (e.g. a simple footer link list) renders inline with no
          hamburger — that is the one thing `isMain` controls. Both list every
          root + sub-item (no hover dropdowns on touch). */}
      <div className="evershop-basic-menu__mobile relative md:hidden">
        {isMain ? (
          <>
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className="evershop-basic-menu__toggle inline-flex items-center justify-center rounded-md p-2 text-foreground transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              {mobileOpen ? (
                <X className="size-6" aria-hidden="true" />
              ) : (
                <Menu className="size-6" aria-hidden="true" />
              )}
            </button>
            {mobileOpen && (
              <div className="evershop-basic-menu__mobile-panel absolute left-0 top-full z-40 mt-2 w-64 max-w-[85vw] rounded-lg border border-divider bg-card p-1.5 shadow-lg">
                <MobileItemList items={menuItems} isActive={isActive} />
              </div>
            )}
          </>
        ) : (
          <div className="evershop-basic-menu__mobile-inline py-1">
            <MobileItemList items={menuItems} isActive={isActive} />
          </div>
        )}
      </div>
    </div>
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
        newTab
        nofollow
        noReferrer
        children {
          name
          url
          type
          uuid
          newTab
          nofollow
          noReferrer
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
