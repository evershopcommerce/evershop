import { Button } from '@components/common/ui/Button.js';
import { useAsyncAction } from '@components/common/ui/hooks/useAsyncAction.js';
import React from 'react';

type AsyncButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  'onClick'
> & {
  /**
   * The click handler. When it returns a promise (it calls the server), the
   * button shows a spinner and ignores clicks until the promise settles; if
   * the handler reloads or leaves the page, the spinner stays until the next
   * page arrives. See `useAsyncAction`.
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => unknown;
};

/**
 * A `Button` for an action that waits on the server (save, delete, approve).
 * Each button keeps its own loading state, so it also works for the action
 * buttons of every row in a list.
 *
 * ```tsx
 * <AsyncButton variant="link" onClick={() => remove(row.deleteApi)}>
 *   {_('Delete')}
 * </AsyncButton>
 * ```
 */
export function AsyncButton({
  onClick,
  isLoading = false,
  ...props
}: AsyncButtonProps) {
  const [run, running] = useAsyncAction(
    (event: React.MouseEvent<HTMLButtonElement>) => onClick?.(event)
  );
  return <Button {...props} onClick={run} isLoading={isLoading || running} />;
}
