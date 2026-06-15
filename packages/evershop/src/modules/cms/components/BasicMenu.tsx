import { useIsMobile } from '@components/common/ui/hooks/useIsMobile.js';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from '@components/common/ui/NavigationMenu.js';
import { cn } from '@evershop/evershop/lib/util/cn';
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

interface BasicMenuProps {
  basicMenuWidget: {
    menus: {
      id: string;
      name: string;
      url: string;
      type: string;
      uuid: string;
      children: {
        name: string;
        url: string;
        type: string;
        uuid: string;
      }[];
    }[];
    isMain: boolean;
    className: string;
  };
}

type BasicMenuNode = BasicMenuProps['basicMenuWidget']['menus'][number];

export default function BasicMenu({
  basicMenuWidget: { menus, isMain, className }
}: BasicMenuProps) {
  const [isOpen, setIsOpen] = React.useState(!isMain);
  const isMobile = useIsMobile();
  const [currentPath, setCurrentPath] = React.useState('');

  React.useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  const menuItems = toMenuArray<BasicMenuNode>(menus).map((item) => ({
    ...item,
    children: toMenuArray<BasicMenuNode['children'][number]>(item.children)
  }));

  const isActive = (url: string) => {
    if (url === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(url);
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`evershop-basic-menu ${className ?? ''}`}>
      <div className="evershop-basic-menu__inner flex justify-start gap-4 items-center">
        <nav className="evershop-basic-menu__nav p-2 relative md:flex md:justify-center w-full">
          <div className="flex justify-between items-center w-full">
            {isMain && isMobile && (
              <div className="evershop-basic-menu__toggle-wrapper">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleMenu();
                  }}
                  className="evershop-basic-menu__toggle text-black focus:outline-none"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16m-7 6h7"
                    />
                  </svg>
                </a>
              </div>
            )}
            <div
              className={cn(
                'evershop-basic-menu__panel',
                isMain
                  ? 'md:flex absolute md:relative -left-10 md:left-0 top-full md:top-auto mt-2 md:mt-0 w-screen md:w-auto p-2 md:p-0 min-w-62.5 bg-white md:bg-transparent z-30'
                  : 'flex relative -left-10 md:left-0 w-screen md:w-auto p-2 md:p-0 min-w-62.5 bg-white md:bg-transparent',
                isOpen ? 'block' : 'hidden',
                'md:flex'
              )}
            >
              <NavigationMenu className="evershop-basic-menu__menu w-full max-w-full">
                <NavigationMenuList className="evershop-basic-menu__items flex-col md:flex-row items-start md:items-center w-full md:w-auto">
                  {menuItems.map((item) => (
                    <NavigationMenuItem
                      key={item.uuid}
                      className="evershop-basic-menu__item w-full md:w-auto"
                    >
                      {item.children.length > 0 && !isMobile ? (
                        <>
                          <NavigationMenuTrigger className="evershop-basic-menu__trigger w-full md:w-auto justify-start md:justify-center bg-transparent hover:bg-transparent focus:bg-transparent data-open:bg-transparent data-open:hover:bg-transparent data-open:focus:bg-transparent data-popup-open:bg-transparent data-popup-open:hover:bg-transparent hover:font-semibold hover:text-primary">
                            {item.name}
                          </NavigationMenuTrigger>
                          <NavigationMenuContent>
                            <ul className="evershop-basic-menu__subs flex flex-col min-w-50 p-2">
                              {item.children.map((subItem) => (
                                <li key={subItem.uuid} className="evershop-basic-menu__sub">
                                  <NavigationMenuLink
                                    href={subItem.url}
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
                          className="evershop-basic-menu__link w-full md:w-auto px-4 py-2 hover:text-primary data-[active=true]:bg-transparent data-[active=true]:hover:bg-transparent transition-colors data-[active=true]:text-primary data-[active=true]:font-semibold hover:bg-transparent focus:bg-transparent hover:underline text-xl md:text-base"
                          data-active={isActive(item.url)}
                        >
                          {item.name}
                        </NavigationMenuLink>
                      )}
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
        </nav>
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
