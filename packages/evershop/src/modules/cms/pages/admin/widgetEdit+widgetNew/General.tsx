import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { Button } from '@components/common/ui/Button.js';
import { Card, CardContent } from '@components/common/ui/Card.js';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Trash2 } from 'lucide-react';
import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

interface Placement {
  route: string;
  area: string;
  sortOrder?: number;
  entityUrn?: string | null;
}

interface GeneralProps {
  widget?: {
    name?: string;
    status?: number;
    placements?: Placement[];
  };
  routes: Array<{
    value: string;
    label: string;
    isApi: boolean;
    isAdmin: boolean;
    methods: string[];
  }>;
}

export default function General({ widget, routes }: GeneralProps) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'placements'
  });

  // Pages a widget can be placed on: storefront GET routes (single method,
  // not API / admin), plus an "All pages" pseudo-route.
  const pageOptions = [
    { value: 'all', label: _('All pages') },
    ...routes
      .filter(
        (r) =>
          r.isApi === false &&
          r.isAdmin === false &&
          r.methods.includes('GET') &&
          r.methods.length === 1
      )
      .map((r) => ({ value: r.value, label: r.label }))
  ];

  // Placements scoped to a specific page (a landing page body, a homepage
  // backup, a CMS page override) are managed in the page builder: they are
  // never shown here and never touched on save.
  const entityScopedCount = (widget?.placements ?? []).filter(
    (p) => p.entityUrn != null
  ).length;

  // Seed the rows from the widget's existing route-level placements. New
  // widgets have no placements yet — start with one blank row. A widget that
  // lives ONLY inside pages gets no blank row: the area field is required, so
  // a blank row would make the form unsaveable, and filling it in would put
  // the widget on every page by accident.
  React.useEffect(() => {
    if (fields.length > 0) return;
    const existing = (widget?.placements ?? []).filter(
      (p) => p.entityUrn == null
    );
    if (existing.length > 0) {
      existing.forEach((p) =>
        append(
          { route: p.route, area: p.area, sort_order: p.sortOrder ?? 0 },
          { shouldFocus: false }
        )
      );
    } else if (entityScopedCount === 0) {
      append({ route: 'all', area: '', sort_order: 0 }, { shouldFocus: false });
    }
  }, [widget, fields.length, append, entityScopedCount]);

  return (
    <Card>
      <CardContent>
        <InputField
          name="name"
          defaultValue={widget?.name}
          label={_('Name')}
          required
          validation={{ required: _('Name is required') }}
          placeholder={_('Name')}
        />
      </CardContent>
      <CardContent className="pt-3 border-t border-border">
        <RadioGroupField
          name="status"
          label={_('Status')}
          defaultValue={widget?.status}
          required
          validation={{ required: _('Status is required') }}
          options={[
            { value: 0, label: _('Disabled') },
            { value: 1, label: _('Enabled') }
          ]}
        />
      </CardContent>
      <CardContent className="pt-3 border-t border-border">
        <div className="text-sm font-medium">{_('Placements')}</div>
        <p className="text-sm text-muted-foreground mt-1">
          {_(
            'Each row places this widget on one page, in one area, with its own sort order. Lower numbers appear first.'
          )}
        </p>
        {entityScopedCount > 0 && (
          <p
            className="text-sm text-muted-foreground mt-2"
            data-testid="entity-scoped-placements-note"
          >
            {_(
              'This widget is also placed on ${count} specific page(s), managed in the page builder. Those placements are not listed here and are not changed when you save.',
              { count: String(entityScopedCount) }
            )}
          </p>
        )}
        <Table className="mt-3">
          <TableHeader>
            <TableRow>
              <TableHead className="border-none">{_('Page')}</TableHead>
              <TableHead className="border-none">{_('Area')}</TableHead>
              <TableHead className="border-none w-20">{_('Sort')}</TableHead>
              <TableHead className="border-none w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id} className="border-border align-top">
                <TableCell className="px-1">
                  <SelectField
                    name={`placements.${index}.route`}
                    options={pageOptions}
                    placeholder={_('Select page')}
                    required
                    validation={{ required: _('Page is required') }}
                  />
                </TableCell>
                <TableCell className="px-1">
                  <InputField
                    name={`placements.${index}.area`}
                    placeholder={_('e.g. content')}
                    required
                    validation={{ required: _('Area is required') }}
                  />
                </TableCell>
                <TableCell className="px-1">
                  <NumberField
                    name={`placements.${index}.sort_order`}
                    placeholder="0"
                  />
                </TableCell>
                <TableCell className="px-1">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-muted-foreground hover:text-destructive p-1"
                      title={_('Remove placement')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="bg-transparent">
            <TableRow className="border-none hover:bg-transparent">
              <TableCell colSpan={4} className="border-none px-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    append(
                      { route: 'all', area: '', sort_order: 0 },
                      { shouldFocus: false }
                    )
                  }
                >
                  {_('+ Add placement')}
                </Button>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 15
};

export const query = `
  query Query {
    widget(id: getContextValue("widgetId", null)) {
      name
      status
      placements {
        route
        area
        sortOrder
        entityUrn
      }
    }
    routes {
      value: id
      label: name
      isApi
      isAdmin
      methods
    }
  }
`;
