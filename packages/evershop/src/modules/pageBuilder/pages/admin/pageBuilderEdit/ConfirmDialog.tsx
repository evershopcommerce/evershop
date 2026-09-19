import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@components/common/ui/AlertDialog.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Generic confirm dialog wrapping `AlertDialog`. Use it instead of
 * `window.confirm` so the page-builder admin can render the prompt in its
 * own surface (with copy, destructive styling, and consistent typography)
 * rather than handing off to the browser's native chrome.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = _('Confirm'),
  cancelLabel = _('Cancel'),
  destructive = false,
  busy = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps): React.ReactElement {
  return (
    <AlertDialog open={open} onOpenChange={(o) => (!o ? onCancel() : null)}>
      {/* The page-builder editor's root sits at z-[1100], so the default
          AlertDialog z-50 would be hidden behind it. Override both the
          backdrop and popup z-index so the dialog floats over the editor.
          `text-sm` on the container matches the page-builder Dialog
          (RolloutDialog) typography — AlertDialog primitive has no base
          font size of its own. */}
      <AlertDialogContent
        className="z-[1300] text-sm"
        overlayClassName="z-[1300]"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm font-medium">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            variant={destructive ? 'destructive' : 'default'}
            onClick={() => {
              void onConfirm();
            }}
          >
            {busy ? _('Working…') : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
