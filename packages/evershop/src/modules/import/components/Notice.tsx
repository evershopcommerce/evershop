import { Alert, AlertDescription } from '@components/common/ui/Alert.js';
import { cn } from '@evershop/evershop/lib/util/cn';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import React from 'react';

export type NoticeTone = 'info' | 'warning' | 'success' | 'error';

/**
 * The colours of the four states of the import screens, the same ones the
 * badges of the admin use: a soft tint of the colour for the ground, a border
 * of the same colour but fainter, and dark text so that a sentence reads well.
 * The shared `Alert` has a border with no colour of its own, which is the text
 * colour: a black frame around every notice.
 */
const TONES: Record<
  NoticeTone,
  { box: string; icon: string; Icon: typeof Info }
> = {
  info: {
    box: 'border-border bg-muted/50 text-foreground',
    icon: 'text-muted-foreground',
    Icon: Info
  },
  warning: {
    box: 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100',
    icon: 'text-amber-600 dark:text-amber-400',
    Icon: TriangleAlert
  },
  success: {
    box: 'border-green-500/30 bg-green-500/10 text-green-950 dark:text-green-100',
    icon: 'text-green-600 dark:text-green-400',
    Icon: CircleCheck
  },
  error: {
    box: 'border-destructive/30 bg-destructive/10 text-red-950 dark:text-red-100',
    icon: 'text-destructive',
    Icon: CircleAlert
  }
};

/** The icon of a tone, for a line of text that is not a box (the result of a job). */
export function ToneIcon({
  tone,
  className
}: {
  tone: NoticeTone;
  className?: string;
}) {
  const { Icon, icon } = TONES[tone];
  return (
    <Icon
      aria-hidden="true"
      className={cn('size-4 shrink-0', icon, className)}
    />
  );
}

/**
 * A message in a box: an icon, a tint and a border of its tone. An error is
 * announced at once (`alert`); the others are read when the reader gets to them
 * (`status`).
 */
export function Notice({
  tone,
  children,
  className
}: {
  tone: NoticeTone;
  children: React.ReactNode;
  className?: string;
}) {
  const { box, icon, Icon } = TONES[tone];
  return (
    <Alert
      role={tone === 'error' ? 'alert' : 'status'}
      data-tone={tone}
      className={cn('items-center py-2.5', box, className)}
    >
      <Icon aria-hidden="true" className={cn('size-4', icon)} />
      <AlertDescription className="text-current">{children}</AlertDescription>
    </Alert>
  );
}
