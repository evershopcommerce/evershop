import { _ } from '@evershop/evershop/lib/locale/translate/_';
import {
  Calendar,
  ChevronDown,
  Send,
  Trash2,
  Undo2
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { PublishMenuItem } from './PublishMenuItem.js';

type RolloutModeProps = {
  mode: 'rollout';
  /** Sync the editor's cursors into the rollout's saved snapshot. */
  onSave: () => void;
  /** Open the discard / revert dialog. */
  onRevert: () => void;
  /** Open the cancel-rollout confirmation. */
  onCancelRollout: () => void;
  isSyncing: boolean;
  /**
   * Save is a no-op when editor cursors equal saved cursors. Caller diffs
   * the two cursor maps and passes the result.
   */
  hasUnsavedChanges: boolean;
};

type DraftModeProps = {
  mode: 'draft';
  /** Open the publish-now dialog. */
  onPublish: () => void;
  /** Open the create-rollout dialog. */
  onSaveAsRollout: () => void;
  /** Open the discard dialog. */
  onDiscard: () => void;
  isPublishing: boolean;
};

type PrimaryActionButtonProps = RolloutModeProps | DraftModeProps;

/**
 * The split publish/save button on the editor topbar. Shape depends on
 * session mode:
 *
 *   - **Rollout-edit** — primary "Save" + chevron menu with "Revert to
 *     saved state…" and "Cancel rollout plan…".
 *   - **Draft** — primary "Publish" + chevron menu with "Publish now",
 *     "Save as rollout plan…", and "Discard pending changes…".
 *
 * The menu's open state and outside-click dismissal are owned here so the
 * parent doesn't have to plumb a ref + useEffect just to render this UI.
 */
export function PrimaryActionButton(
  props: PrimaryActionButtonProps
): React.ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close the dropdown on outside click. Cheap to wire up here so the
  // parent doesn't carry the ref / effect just to host the menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      const node = menuRef.current;
      if (!node) return;
      if (!node.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  if (props.mode === 'rollout') {
    const { onSave, onRevert, onCancelRollout, isSyncing, hasUnsavedChanges } =
      props;
    return (
      <div ref={menuRef} className="relative inline-flex">
        <button
          type="button"
          onClick={onSave}
          disabled={isSyncing || !hasUnsavedChanges}
          title={
            hasUnsavedChanges
              ? _('Save your pending edits — the live storefront will catch up')
              : _('No changes to save — the rollout matches the editor')
          }
          className="inline-flex items-center h-7 px-3 rounded-l-md bg-foreground text-background text-xs font-medium border-r border-background/20 hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSyncing ? _('Saving…') : _('Save')}
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="inline-flex items-center justify-center h-7 w-7 rounded-r-md bg-foreground text-background hover:opacity-90 transition-opacity"
          title={_('More rollout actions')}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1.5 z-30 w-[280px] bg-card border border-divider rounded-md shadow-lg p-1"
            role="menu"
          >
            <PublishMenuItem
              icon={<Undo2 className="h-3.5 w-3.5" />}
              title={_('Revert to saved state…')}
              description={_(
                'Roll back the editor to what the rollout currently shows on the storefront'
              )}
              onClick={() => {
                setMenuOpen(false);
                onRevert();
              }}
              destructive
              disabled={!hasUnsavedChanges}
              tooltip={
                hasUnsavedChanges
                  ? undefined
                  : _('Nothing to revert — the editor matches the saved state')
              }
            />
            <div className="h-px bg-divider my-1" />
            <PublishMenuItem
              icon={<Trash2 className="h-3.5 w-3.5" />}
              title={_('Cancel rollout plan…')}
              description={_('Remove the schedule — the changeset is preserved')}
              onClick={() => {
                setMenuOpen(false);
                onCancelRollout();
              }}
              destructive
            />
          </div>
        )}
      </div>
    );
  }

  const { onPublish, onSaveAsRollout, onDiscard, isPublishing } = props;
  return (
    <div ref={menuRef} className="relative inline-flex">
      <button
        type="button"
        onClick={onPublish}
        disabled={isPublishing}
        className="inline-flex items-center h-7 px-3 rounded-l-md bg-foreground text-background text-xs font-medium border-r border-background/20 hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {isPublishing ? _('Publishing…') : _('Publish')}
      </button>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        className="inline-flex items-center justify-center h-7 w-7 rounded-r-md bg-foreground text-background hover:opacity-90 transition-opacity"
        title={_('More publish options')}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {menuOpen && (
        <div
          className="absolute right-0 top-full mt-1.5 z-30 w-[260px] bg-card border border-divider rounded-md shadow-lg p-1"
          role="menu"
        >
          <PublishMenuItem
            icon={<Send className="h-3.5 w-3.5" />}
            title={_('Publish now')}
            description={_('Apply all edits to the live storefront immediately')}
            onClick={() => {
              setMenuOpen(false);
              onPublish();
            }}
          />
          <PublishMenuItem
            icon={<Calendar className="h-3.5 w-3.5" />}
            title={_('Save as rollout plan…')}
            description={_('Schedule these edits to roll out at a future time')}
            onClick={() => {
              setMenuOpen(false);
              onSaveAsRollout();
            }}
          />
          <div className="h-px bg-divider my-1" />
          <PublishMenuItem
            icon={<Trash2 className="h-3.5 w-3.5" />}
            title={_('Discard pending changes…')}
            description={_(
              'Choose between discarding the whole draft or just this page'
            )}
            onClick={() => {
              setMenuOpen(false);
              onDiscard();
            }}
            destructive
          />
        </div>
      )}
    </div>
  );
}
