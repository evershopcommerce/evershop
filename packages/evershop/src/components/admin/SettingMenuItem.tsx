import { cn } from '@evershop/evershop/lib/util/cn';
import { ChevronRight } from 'lucide-react';
import React from 'react';

export interface SettingMenuItemProps {
  /** Destination, resolved server-side via the `url(routeId:)` GraphQL field. */
  url: string;
  title: string;
  description: string;
}

/**
 * One row in the Settings navigation (`settingPageMenu` area).
 *
 * Shared by every core settings section — and available to extensions — so the
 * menu reads as ONE list instead of a stack of independently-styled cards.
 *
 * Design notes:
 * - The whole row is the link. The previous version wrapped only the title in
 *   an `<a>` and compensated with a duplicate icon-button in the actions slot
 *   that navigated to the same URL; that button was both redundant and
 *   unlabeled (screen readers announced a nameless "button" per row).
 * - Title outranks its own description (14px medium over 12px muted). It used
 *   to be the other way around — an 11px uppercase title above 14px body.
 * - Active state is a tint plus `aria-current="page"`, never a side stripe.
 */
export function SettingMenuItem({
  url,
  title,
  description
}: SettingMenuItemProps) {
  // Resolved after mount, not during render: `window` is undefined during SSR,
  // so computing this inline renders inactive on the server and active on the
  // client — a hydration mismatch. Same pattern as `NavigationItem`.
  const [isActive, setIsActive] = React.useState(false);

  React.useEffect(() => {
    setIsActive(
      new URL(url, window.location.origin).pathname === window.location.pathname
    );
  }, [url]);

  return (
    <a
      href={url}
      aria-current={isActive ? 'page' : undefined}
      data-active={isActive ? 'true' : 'false'}
      className={cn(
        'group flex items-start gap-3 px-4 py-3 outline-none transition-colors',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:ring-inset',
        isActive
          ? 'bg-primary/5 dark:bg-primary/10'
          : 'hover:bg-muted/60 active:bg-muted'
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            'text-sm leading-snug',
            isActive
              ? 'text-primary font-semibold'
              : 'text-foreground font-medium'
          )}
        >
          {title}
        </span>
        <span className="text-muted-foreground text-xs leading-normal text-pretty">
          {description}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className={cn(
          'mt-0.5 size-4 shrink-0 transition-transform motion-safe:group-hover:translate-x-0.5',
          isActive ? 'text-primary/70' : 'text-muted-foreground/50'
        )}
      />
    </a>
  );
}
