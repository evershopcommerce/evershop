import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export type DeviceMode = 'desktop' | 'tablet' | 'phone';

interface DeviceButtonProps {
  mode: DeviceMode;
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

export function DeviceButton({
  active,
  onClick,
  icon: Icon,
  label
}: DeviceButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={_('Show ${label} width', { label })}
      title={label}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-card shadow-sm text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
