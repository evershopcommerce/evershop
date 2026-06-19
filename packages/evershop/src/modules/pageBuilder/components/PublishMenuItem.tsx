import React from 'react';

interface PublishMenuItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  destructive?: boolean;
  /**
   * Disabled items keep their visual slot in the menu so the layout stays
   * stable when state changes (e.g. Revert in rollout mode disables in
   * lock-step with the Save button — both gated on `hasUnsavedChanges`).
   */
  disabled?: boolean;
  /** Native tooltip — useful for explaining why a disabled item can't be clicked. */
  tooltip?: string;
}

export function PublishMenuItem({
  icon,
  title,
  description,
  onClick,
  destructive = false,
  disabled = false,
  tooltip
}: PublishMenuItemProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      role="menuitem"
      className={`w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-md transition-colors group ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-muted/50'
      }`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-md mt-0.5 shrink-0 ${
          destructive
            ? 'bg-destructive/10 text-destructive'
            : 'bg-muted/40 text-muted-foreground group-hover:text-foreground'
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-[13px] font-medium ${
            destructive ? 'text-destructive' : 'text-foreground'
          }`}
        >
          {title}
        </span>
        <span className="block text-[11px] text-muted-foreground mt-0.5 leading-snug">
          {description}
        </span>
      </span>
    </button>
  );
}
