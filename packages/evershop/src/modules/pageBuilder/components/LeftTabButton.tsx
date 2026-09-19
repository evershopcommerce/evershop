import React from 'react';

interface LeftTabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  collapsed?: boolean;
}

export function LeftTabButton({
  active,
  onClick,
  icon: Icon,
  label,
  collapsed = false
}: LeftTabButtonProps): React.ReactElement {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        title={label}
        aria-label={label}
        className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
        }`}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 py-2 text-[13px] font-medium transition-colors -mb-px border-b-2 ${
        active
          ? 'text-foreground border-primary'
          : 'text-muted-foreground border-transparent hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );
}
