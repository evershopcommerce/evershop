import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@components/common/ui/AlertDialog.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import * as React from 'react';

export interface ConfirmDialogProps {
  /**
   * The element that opens the dialog — typically a `<Button>`. It is rendered
   * AS the AlertDialogTrigger (via base-ui's `render` prop), so its own click is
   * consumed by the open machinery: don't attach the destructive action to the
   * trigger's `onClick`, put it in `onConfirm` instead.
   */
  trigger: React.ReactElement;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Affirmative button label. Defaults to a translated "Confirm". */
  confirmLabel?: React.ReactNode;
  /** Dismiss button label. Defaults to a translated "Cancel". */
  cancelLabel?: React.ReactNode;
  /** Use `destructive` (red) styling for irreversible actions. */
  confirmVariant?: 'default' | 'destructive';
  /**
   * Runs when the user confirms. May be async — the affirmative button shows a
   * loading state until it settles, then the dialog closes (on success OR
   * failure; surface errors via toast inside the handler).
   */
  onConfirm: () => void | Promise<void>;
}

/**
 * Shadcn `AlertDialog`-backed confirmation prompt. Drop-in replacement for the
 * browser-native `window.confirm()` so destructive admin actions share the same
 * visual language as the rest of the UI.
 *
 * The passed `trigger` becomes the dialog trigger; the real work lives in
 * `onConfirm`. The dialog manages its own open/loading state.
 *
 * ```tsx
 * <ConfirmDialog
 *   trigger={<Button variant="destructive" size="sm">Delete</Button>}
 *   title={`Delete "${name}"?`}
 *   description="This cannot be undone."
 *   confirmLabel="Delete"
 *   confirmVariant="destructive"
 *   onConfirm={() => remove(uuid)}
 * />
 * ```
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = _('Confirm'),
  cancelLabel = _('Cancel'),
  confirmVariant = 'default',
  onConfirm
}: ConfirmDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={confirmVariant}
            onClick={handleConfirm}
            isLoading={busy}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
