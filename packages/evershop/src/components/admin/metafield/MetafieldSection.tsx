import { getNestedError } from '@components/common/form/utils/getNestedError.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@components/common/ui/Dialog.js';
import { Skeleton } from '@components/common/ui/Skeleton.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import { Code, Cog, Pencil, Plus, Tags } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useFormContext, useFormState } from 'react-hook-form';
import { toast } from 'react-toastify';
import { DefinitionEditor } from './DefinitionEditor.js';
import {
  MetafieldValueInput,
  type FieldDescriptor
} from './MetafieldValueInput.js';

interface Definition extends FieldDescriptor {
  uuid: string;
  namespace: string;
  visibleToCustomer: boolean;
}

interface Props {
  /** The owner type these definitions belong to (e.g. "product"). */
  ownerType: string;
  /** Current values (the entity's meta_data) to prefill the form for editing. */
  values?: Record<string, unknown>;
  /** Store currency (shop.currency) used for `money` fields. */
  currency?: string;
}

/** Human-readable preview of a single scalar value, or null when not set. */
function formatScalar(type: string, value: unknown): string | null {
  if (value === '' || value === undefined || value === null) return null;
  if (type === 'boolean') return value ? _('Yes') : _('No');
  if (type === 'money') {
    const v = value as { amount?: unknown; currency?: string };
    if (
      v &&
      typeof v === 'object' &&
      v.amount !== undefined &&
      v.amount !== ''
    ) {
      return `${v.amount} ${v.currency ?? ''}`.trim();
    }
    return null;
  }
  if (type === 'reference') {
    const v = value as { referenceType?: string; id?: unknown };
    if (v && typeof v === 'object' && v.id !== undefined && v.id !== '') {
      return `${v.referenceType ?? ''} #${v.id}`.trim();
    }
    return null;
  }
  if (type === 'json') {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
  return String(value);
}

/** Preview text for a field's current value (lists joined with • ), or null. */
function formatPreview(def: Definition, value: unknown): string | null {
  if (def.type === 'group') {
    if (def.isList) {
      const n = Array.isArray(value)
        ? value.filter(
            (it) =>
              it &&
              typeof it === 'object' &&
              Object.values(it).some((x) => x !== '' && x != null)
          ).length
        : 0;
      return n ? `${n} ${n === 1 ? _('item') : _('items')}` : null;
    }
    if (value && typeof value === 'object') {
      const parts = (def.subFields || [])
        .map((sf) => (value as Record<string, unknown>)[sf.key])
        .filter((x) => x !== '' && x != null)
        .map(String);
      return parts.length ? parts.join(' · ') : null;
    }
    return null;
  }
  if (def.isList) {
    if (!Array.isArray(value)) return null;
    const items = value
      .map((v) => formatScalar(def.type, v))
      .filter((s): s is string => s !== null);
    return items.length ? items.join('  •  ') : null;
  }
  return formatScalar(def.type, value);
}

/**
 * One field: collapsed it shows the current value as text (or "Not set"); click
 * the row to expand the editor. The input stays mounted (just hidden) while
 * collapsed so its value is always part of the form submission.
 */
function MetafieldRow({
  def,
  currency,
  onEditDefinition
}: {
  def: Definition;
  currency: string;
  onEditDefinition: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { watch, trigger } = useFormContext();
  const name = `metafields.${def.namespace}.${def.key}`;
  const preview = formatPreview(def, watch(name));

  // Auto-expand when this field has a validation error (e.g. a required field
  // left empty when the parent form is submitted) so the error is never hidden
  // inside a collapsed row.
  const { errors } = useFormState({ name });
  const hasError = !!getNestedError(name, errors);
  useEffect(() => {
    if (hasError) setOpen(true);
  }, [hasError]);

  // Validate the field(s) being edited; collapse to the preview only when valid
  // so an inline error stays visible (the input is hidden once collapsed).
  const handleDone = async () => {
    const valid = await trigger(name);
    if (valid) setOpen(false);
  };

  return (
    <div
      className="grid grid-cols-3 items-start gap-4 py-2 first:pt-0 last:pb-0"
      data-testid={`mf-row-${def.key}`}
    >
      <div className="pt-1.5">
        <div className="flex items-center gap-1">
          <label className="text-sm font-medium">
            {def.name}
            {def.required ? <span className="text-destructive"> *</span> : null}
            {def.isList ? (
              <span className="ml-1 text-xs text-muted-foreground">
                {_('(list)')}
              </span>
            ) : null}
          </label>
          <button
            type="button"
            onClick={onEditDefinition}
            aria-label={_('Edit field settings')}
            title={_('Edit field settings')}
            data-testid={`mf-settings-${def.key}`}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <Cog className="h-3.5 w-3.5" />
          </button>
        </div>
        {def.description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {def.description}
          </p>
        ) : null}
        {!def.visibleToCustomer ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {_('Not visible to customers')}
          </p>
        ) : null}
      </div>
      <div className="col-span-2">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            data-testid={`mf-preview-${def.key}`}
            className="flex w-full items-start justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-left hover:border-divider hover:bg-muted/40"
          >
            <span
              className={
                preview === null
                  ? 'text-sm italic text-muted-foreground'
                  : 'line-clamp-2 break-words text-sm'
              }
            >
              {preview === null ? _('Not set') : preview}
            </span>
            <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        ) : null}
        <div className={open ? '' : 'hidden'}>
          <MetafieldValueInput field={def} name={name} currency={currency} />
          <button
            type="button"
            onClick={handleDone}
            data-testid={`mf-done-${def.key}`}
            className="mt-2 text-sm text-primary hover:underline"
          >
            {_('Done')}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The "Custom fields" section, mounted inside an entity's edit `<Form>`. It loads
 * the owner type's definitions over REST, renders a per-field row (value shown as
 * text, expand to edit) that contributes a `metafields` object to the parent form
 * payload, and offers an "Add field" popup plus a read-only "View JSON".
 */
export function MetafieldSection({
  ownerType,
  values,
  currency = 'USD'
}: Props) {
  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [editDef, setEditDef] = useState<Definition | null>(null);
  const { watch, setValue } = useFormContext();

  // Seed the parent form's `metafields` once with the entity's current values so
  // the inputs prefill when editing an existing entity.
  useEffect(() => {
    if (values && Object.keys(values).length > 0) {
      setValue('metafields', values);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `/api/metafield-definitions?ownerType=${encodeURIComponent(ownerType)}`
      );
      setDefinitions(res.data?.data ?? []);
    } catch (e) {
      toast.error(_('Failed to load custom fields'));
    } finally {
      setLoading(false);
    }
  }, [ownerType]);

  useEffect(() => {
    load();
  }, [load]);

  const metaValues = watch('metafields');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tags className="h-[18px] w-[18px]" />
            <CardTitle>{_('Custom fields')}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setJsonOpen(true)}
            >
              <Code className="mr-1 h-3.5 w-3.5" />
              {_('View JSON')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {_('Add field')}
            </Button>
          </div>
        </div>
        <CardDescription>
          {_(
            'Fields applicable to this entity type. Adding a field applies it to all entities of this type.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="divide-y divide-divider">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="grid grid-cols-3 items-start gap-4 py-2 first:pt-0 last:pb-0"
              >
                <div className="pt-1.5">
                  <Skeleton className="h-4 w-28" />
                </div>
                <div className="col-span-2">
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : definitions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {_('No custom fields yet.')}
          </p>
        ) : (
          <div className="divide-y divide-divider">
            {definitions.map((def) => (
              <MetafieldRow
                key={`${def.namespace}.${def.key}`}
                def={def}
                currency={currency}
                onEditDefinition={() => setEditDef(def)}
              />
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{_('Add custom field')}</DialogTitle>
          </DialogHeader>
          <DefinitionEditor
            ownerType={ownerType}
            onSaved={() => {
              setAddOpen(false);
              load();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editDef}
        onOpenChange={(o) => {
          if (!o) setEditDef(null);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{_('Edit custom field')}</DialogTitle>
          </DialogHeader>
          {editDef ? (
            <DefinitionEditor
              key={editDef.uuid}
              ownerType={ownerType}
              definition={editDef}
              onSaved={() => {
                setEditDef(null);
                load();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={jsonOpen} onOpenChange={setJsonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{_('Custom fields (JSON)')}</DialogTitle>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(metaValues ?? {}, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
