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

interface MenuItem {
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
}

interface BasicMenuProps {
  basicMenuWidget: {
    menus: MenuItem[];
    isMain: boolean;
    className: string;
  };
}

/**
 * Accordion item for mobile: the parent name links to the category page
 * while a chevron toggle expands/collapses the list of child links.
 */
function MobileAccordionItem({
  item,
  isActive
}: {
  item: MenuItem;
  isActive: (url: string) => boolean;
}) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <li className="w-full">
      <div className="flex items-center justify-between w-full">
        <a
          href={item.url}
          className={cn(
            'flex-1 px-4 py-2 text-xl transition-colors hover:underline hover:text-primary',
            isActive(item.url) ? 'text-primary font-semibold' : ''
          )}
        >
          {item.name}
        </a>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${item.name}`}
          className="p-2 mr-2 cursor-pointer text-gray-500 hover:text-primary transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={cn(
              'w-5 h-5 transition-transform duration-200',
              expanded ? 'rotate-180' : ''
            )}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m19.5 8.25-7.5 7.5-7.5-7.5"
            />
          </svg>
        </button>
      </div>
      {expanded && (
        <ul className="pl-6 pb-1">
          {item.children.map((child) => (
            <li key={child.uuid}>
              <a
                href={child.url}
                className={cn(
                  'block px-4 py-1.5 text-base transition-colors hover:underline hover:text-primary',
                  isActive(child.url)
                    ? 'text-primary font-semibold'
                    : 'text-gray-600'
                )}
              >
                {child.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function BasicMenu({
  basicMenuWidget: { menus, isMain, className }
}: BasicMenuProps) {
  const [isOpen, setIsOpen] = React.useState(!isMain);
  const isMobile = useIsMobile();
  const [currentPath, setCurrentPath] = React.useState('');

  React.useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

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
    <div className={className}>
      <div className="flex justify-start gap-4 items-center">
        <nav className="p-2 relative md:flex md:justify-center w-full">
          <div className="flex justify-between items-center w-full">
            {isMain && isMobile && (
              <div>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleMenu();
                  }}
                  className="text-black focus:outline-none"
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
                isMain
                  ? 'md:flex absolute md:relative -left-10 md:left-0 top-full md:top-auto mt-2 md:mt-0 w-screen md:w-auto p-2 md:p-0 min-w-62.5 bg-white md:bg-transparent z-30'
                  : 'flex relative -left-10 md:left-0 w-screen md:w-auto p-2 md:p-0 min-w-62.5 bg-white md:bg-transparent',
                isOpen ? 'block' : 'hidden',
                'md:flex'
              )}
            >
              {isMobile ? (
                <ul className="flex flex-col w-full">
                  {menus.map((item) =>
                    item.children.length > 0 ? (
                      <MobileAccordionItem
                        key={item.uuid}
                        item={item}
                        isActive={isActive}
                      />
                    ) : (
                      <li key={item.uuid} className="w-full">
                        <NavigationMenuLink
                          href={item.url}
                          className="w-full px-4 py-2 hover:text-primary data-[active=true]:bg-transparent data-[active=true]:hover:bg-transparent transition-colors data-[active=true]:text-primary data-[active=true]:font-semibold hover:bg-transparent focus:bg-transparent hover:underline text-xl"
                          data-active={isActive(item.url)}
                        >
                          {item.name}
                        </NavigationMenuLink>
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <NavigationMenu className="w-full max-w-full">
                  <NavigationMenuList className="flex-col md:flex-row items-start md:items-center w-full md:w-auto">
                    {menus.map((item) => (
                      <NavigationMenuItem
                        key={item.uuid}
                        className="w-full md:w-auto"
                      >
                        {item.children.length > 0 ? (
                          <>
                            <NavigationMenuTrigger className="w-full md:w-auto justify-start md:justify-center bg-transparent hover:bg-transparent focus:bg-transparent data-open:bg-transparent data-open:hover:bg-transparent data-open:focus:bg-transparent data-popup-open:bg-transparent data-popup-open:hover:bg-transparent hover:font-semibold hover:text-primary">
                              {item.name}
                            </NavigationMenuTrigger>
                            <NavigationMenuContent>
                              <ul className="flex flex-col min-w-50 p-2">
                                {item.children.map((subItem) => (
                                  <li key={subItem.uuid}>
                                    <NavigationMenuLink
                                      href={subItem.url}
                                      className="w-full"
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
                            className="w-full md:w-auto px-4 py-2 hover:text-primary data-[active=true]:bg-transparent data-[active=true]:hover:bg-transparent transition-colors data-[active=true]:text-primary data-[active=true]:font-semibold hover:bg-transparent focus:bg-transparent hover:underline text-xl md:text-base"
                            data-active={isActive(item.url)}
                          >
                            {item.name}
                          </NavigationMenuLink>
                        )}
                      </NavigationMenuItem>
                    ))}
                  </NavigationMenuList>
                </NavigationMenu>
              )}
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
