import { Button } from '@components/common/ui/Button.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@components/common/ui/Dialog.js';
import { Input } from '@components/common/ui/Input.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Search } from 'lucide-react';
import React from 'react';

interface WidgetType {
  code: string;
  name: string;
  description: string;
  createWidgetUrl: string;
}

/**
 * Searchable, height-capped picker for the "New Widget" dialog. With ~20+
 * registered widget types a plain vertical list overflowed the viewport, so
 * this filters by name/description and lays the results out in a scrollable
 * two-column grid of clickable cards.
 */
const WidgetTypePicker: React.FC<{ types: Array<WidgetType> }> = ({ types }) => {
  const [search, setSearch] = React.useState('');
  const query = search.trim().toLowerCase();
  const filtered = query
    ? types.filter(
        (type) =>
          type.name.toLowerCase().includes(query) ||
          (type.description ?? '').toLowerCase().includes(query)
      )
    : types;

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={_('Search widgets…')}
          className="pl-8"
        />
      </div>
      <div className="grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {filtered.map((type) => (
          <button
            key={type.code}
            type="button"
            onClick={() => {
              window.location.href = type.createWidgetUrl;
            }}
            className="flex flex-col gap-1 rounded-md border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-muted/40 focus-visible:border-primary focus-visible:outline-none"
          >
            <span className="text-sm font-medium text-foreground">
              {type.name}
            </span>
            <span className="line-clamp-2 text-xs text-muted-foreground">
              {type.description}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-10 text-center text-sm text-muted-foreground">
            {_('No widgets match your search.')}
          </div>
        )}
      </div>
    </div>
  );
};

interface NewWidgetButtonProps {
  widgetTypes: Array<WidgetType>;
}

export default function NewWidgetButton({ widgetTypes }: NewWidgetButtonProps) {
  return (
    <Dialog>
      <DialogTrigger>
        <Button>{_('New Widget')}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{_('New Widget')}</DialogTitle>
        </DialogHeader>
        <WidgetTypePicker types={widgetTypes} />
      </DialogContent>
    </Dialog>
  );
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    widgetTypes {
      code
      name
      description
      createWidgetUrl
    }
  }
`;
