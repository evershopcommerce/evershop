import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { ReactSelectField } from '@components/common/form/ReactSelectField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import { LinkPicker } from '@components/common/page-builder/pickers/LinkPicker.js';
import { Button } from '@components/common/ui/Button.js';
import { Input } from '@components/common/ui/Input.js';
import { Textarea } from '@components/common/ui/Textarea.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react';
import React from 'react';
import {
  Controller,
  type RegisterOptions,
  useFieldArray,
  useFormContext
} from 'react-hook-form';

export interface Validation {
  type: string;
  values?: Array<string | number>;
  min?: number;
  max?: number;
  pattern?: string;
}

export interface FieldDescriptor {
  key: string;
  name: string;
  description?: string;
  type: string;
  isList?: boolean;
  required?: boolean;
  referenceType?: string;
  validations?: Validation[];
  subFields?: FieldDescriptor[];
}

function choicesOf(field: FieldDescriptor): Array<string | number> | undefined {
  return (field.validations || []).find((v) => v.type === 'choices')?.values;
}

const isEmptyInput = (v: unknown): boolean =>
  v === undefined || v === null || v === '';

/**
 * Map a definition's `required` flag + `validations` to react-hook-form
 * RegisterOptions so the value inputs enforce the same rules client-side (inline)
 * that the server enforces via AJV. Mirrors lib/metafield/compileField.ts:
 * size → min/maxLength, range → min/max, regexp → pattern.
 *
 * `size` and `regexp` are expressed as `validate` callbacks that pass on empty
 * input, because RHF's native `minLength`/`pattern` rules fire on `''` and would
 * wrongly block an untouched optional field (the server normalizes empties away,
 * so the client must too). `range`'s native min/max are safe — they ignore empty.
 *
 * `required` is mapped only when `includeRequired` is true (top-level fields).
 * It is skipped for GROUP sub-fields: the server normalizes an all-empty group to
 * "unset" before checking its sub-fields, so a required sub-field of an untouched
 * group must not block the save — the client mirrors that by not enforcing it.
 */
function toValidationRules(
  field: FieldDescriptor,
  includeRequired = true
): RegisterOptions | undefined {
  const rules: RegisterOptions = {};
  const validate: Record<string, (v: unknown) => boolean | string> = {};

  if (includeRequired && field.required) {
    rules.required = _('${field} is required', { field: field.name });
  }

  for (const v of field.validations || []) {
    if (v.type === 'size') {
      if (typeof v.min === 'number') {
        const min = v.min;
        validate.minLength = (val) =>
          isEmptyInput(val) ||
          String(val).length >= min ||
          _('Must be at least ${n} characters', { n: String(min) });
      }
      if (typeof v.max === 'number') {
        const max = v.max;
        validate.maxLength = (val) =>
          isEmptyInput(val) ||
          String(val).length <= max ||
          _('Must be at most ${n} characters', { n: String(max) });
      }
    } else if (v.type === 'range') {
      if (typeof v.min === 'number')
        rules.min = {
          value: v.min,
          message: _('Must be at least ${n}', { n: String(v.min) })
        };
      if (typeof v.max === 'number')
        rules.max = {
          value: v.max,
          message: _('Must be at most ${n}', { n: String(v.max) })
        };
    } else if (v.type === 'regexp' && v.pattern) {
      let re: RegExp | null = null;
      try {
        re = new RegExp(v.pattern);
      } catch {
        re = null; // ignore an invalid stored pattern; the server still enforces it
      }
      if (re) {
        const rx = re;
        validate.pattern = (val) =>
          isEmptyInput(val) || rx.test(String(val)) || _('Invalid format');
      }
    }
  }

  if (Object.keys(validate).length) rules.validate = validate;
  return Object.keys(rules).length ? rules : undefined;
}

/** Money: amount only — currency is fixed to the store currency (shop.currency). */
function MoneyInput({ name, currency }: { name: string; currency: string }) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name as never}
      render={({ field }) => {
        const v =
          field.value && typeof field.value === 'object'
            ? (field.value as { amount?: number })
            : {};
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="any"
              placeholder="0.00"
              value={v.amount ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                field.onChange(
                  raw === '' ? undefined : { amount: Number(raw), currency }
                );
              }}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground">{currency}</span>
          </div>
        );
      }}
    />
  );
}

/** URL: uses the LinkPicker (page / category / product / custom URL). */
function UrlInput({ name }: { name: string }) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name as never}
      render={({ field }) => (
        <LinkPicker
          value={(field.value as string) || ''}
          onChange={({ url }) => field.onChange(url)}
        />
      )}
    />
  );
}

/** A single non-list, non-group input (bound to the form by `name`). */
function ScalarInput({
  field,
  name,
  currency,
  isSubField
}: {
  field: FieldDescriptor;
  name: string;
  currency: string;
  isSubField?: boolean;
}) {
  const validation = toValidationRules(field, !isSubField);
  switch (field.type) {
    case 'long_text':
      return (
        <TextareaField
          name={name}
          rows={3}
          placeholder={_('Enter text')}
          validation={validation}
        />
      );
    case 'rich_text':
      // A full WYSIWYG can be swapped in later; a textarea is a safe default.
      return (
        <TextareaField
          name={name}
          rows={6}
          placeholder={_('Enter text')}
          validation={validation}
        />
      );
    case 'integer':
      return (
        <NumberField
          name={name}
          allowDecimals={false}
          placeholder="0"
          validation={validation}
        />
      );
    case 'number':
      return (
        <NumberField
          name={name}
          allowDecimals
          placeholder="0"
          validation={validation}
        />
      );
    case 'boolean':
      return <ToggleField name={name} />;
    case 'date':
      return <InputField name={name} type="date" validation={validation} />;
    case 'color':
      return <InputField name={name} type="color" validation={validation} />;
    case 'url':
      return <UrlInput name={name} />;
    case 'money':
      return <MoneyInput name={name} currency={currency} />;
    case 'reference':
      return (
        <div className="flex gap-2">
          <InputField
            name={`${name}.referenceType`}
            defaultValue={field.referenceType}
            placeholder={_('Reference type')}
            wrapperClassName="w-44"
          />
          <InputField
            name={`${name}.id`}
            type="number"
            placeholder={_('ID')}
            wrapperClassName="flex-1"
          />
        </div>
      );
    case 'json':
      return <TextareaField name={name} rows={4} placeholder="{ }" />;
    case 'short_text':
    default:
      return (
        <InputField
          name={name}
          type="text"
          placeholder={_('Enter text')}
          validation={validation}
        />
      );
  }
}

/** A single controlled input for one item of a scalar list. */
function ListItemInput({
  type,
  value,
  onChange
}: {
  type: string;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const str = value === undefined || value === null ? '' : String(value);
  if (type === 'long_text' || type === 'rich_text') {
    return (
      <Textarea
        rows={2}
        value={str}
        placeholder={_('Enter text')}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1"
      />
    );
  }
  if (type === 'integer' || type === 'number') {
    return (
      <Input
        type="number"
        step={type === 'integer' ? '1' : 'any'}
        placeholder="0"
        value={str}
        onChange={(e) =>
          onChange(e.target.value === '' ? '' : Number(e.target.value))
        }
        className="flex-1"
      />
    );
  }
  const inputType =
    type === 'date'
      ? 'date'
      : type === 'color'
      ? 'color'
      : type === 'url'
      ? 'url'
      : 'text';
  return (
    <Input
      type={inputType}
      placeholder={inputType === 'text' ? _('Enter text') : undefined}
      value={str}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1"
    />
  );
}

/**
 * Shopify-style editor for a list of scalar values: one input row per item with
 * reorder + remove, plus "Add item" and "Clear all". Fully controlled — it owns
 * the whole array through a single `Controller`, so adding/removing/reordering
 * are pure array operations that can never reset the other items.
 */
function ListValueEditor({
  field,
  name
}: {
  field: FieldDescriptor;
  name: string;
}) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name as never}
      render={({ field: ctrl }) => {
        const items: unknown[] = Array.isArray(ctrl.value) ? ctrl.value : [];
        const commit = (next: unknown[]) => ctrl.onChange(next);
        const move = (from: number, to: number) => {
          if (to < 0 || to >= items.length) return;
          const next = items.slice();
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          commit(next);
        };
        return (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label={_('Move up')}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={_('Move down')}
                    disabled={index === items.length - 1}
                    onClick={() => move(index, index + 1)}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ListItemInput
                  type={field.type}
                  value={item}
                  onChange={(v) =>
                    commit(items.map((it, j) => (j === index ? v : it)))
                  }
                />
                <button
                  type="button"
                  aria-label={_('Remove item')}
                  onClick={() => commit(items.filter((_, j) => j !== index))}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => commit([...items, ''])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {_('Add item')}
              </Button>
              {items.length > 0 ? (
                <button
                  type="button"
                  onClick={() => commit([])}
                  className="text-sm text-muted-foreground hover:text-destructive"
                >
                  {_('Clear all')}
                </button>
              ) : null}
            </div>
          </div>
        );
      }}
    />
  );
}

/** Labelled sub-field inputs for a group (one object's worth). */
function GroupFields({
  subFields,
  name,
  currency
}: {
  subFields: FieldDescriptor[];
  name: string;
  currency: string;
}) {
  return (
    <div className="space-y-3">
      {subFields.map((sub) => (
        <div key={sub.key}>
          <label className="mb-1 block text-sm font-medium">
            {sub.name}
            {sub.required ? <span className="text-destructive"> *</span> : null}
          </label>
          <MetafieldValueInput
            field={sub}
            name={`${name}.${sub.key}`}
            currency={currency}
            isSubField
          />
        </div>
      ))}
    </div>
  );
}

/** Repeater of group cards (the `group` + isList case), one card per object. */
function GroupListRepeater({
  field,
  name,
  currency
}: {
  field: FieldDescriptor;
  name: string;
  currency: string;
}) {
  const { control } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: name as never
  });
  return (
    <div className="space-y-2">
      {fields.map((item, index) => (
        <div
          key={item.id}
          className="flex items-start gap-2 rounded-md border border-divider bg-card p-2"
        >
          <div className="flex-1">
            <GroupFields
              subFields={field.subFields || []}
              name={`${name}.${index}`}
              currency={currency}
            />
          </div>
          <div className="flex flex-col gap-1 pt-1">
            <button
              type="button"
              aria-label={_('Move up')}
              onClick={() => move(index, index - 1)}
              disabled={index === 0}
              className="rounded p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={_('Move down')}
              onClick={() => move(index, index + 1)}
              disabled={index === fields.length - 1}
              className="rounded p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={_('Remove item')}
              onClick={() => remove(index)}
              className="rounded p-1 text-muted-foreground hover:bg-muted/60 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({} as never)}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        {_('Add item')}
      </Button>
    </div>
  );
}

/**
 * Renders the value input for one field descriptor, bound to `name` in the
 * surrounding form. `choices` → React-Select; `group` → sub-fields (or a card
 * repeater when a list); other lists → the controlled list editor; otherwise a
 * single typed input.
 */
export function MetafieldValueInput({
  field,
  name,
  currency = 'USD',
  isSubField = false
}: {
  field: FieldDescriptor;
  name: string;
  currency?: string;
  /** True when rendered as a group sub-field — suppresses client `required`. */
  isSubField?: boolean;
}) {
  const choices = choicesOf(field);

  if (
    choices &&
    (field.type === 'short_text' ||
      field.type === 'integer' ||
      field.type === 'number')
  ) {
    const options = choices.map((v) => ({ value: v, label: String(v) }));
    return (
      <ReactSelectField
        name={name}
        options={options}
        isMulti={!!field.isList}
        required={!isSubField && !!field.required}
      />
    );
  }

  if (field.type === 'group') {
    if (field.isList)
      return (
        <GroupListRepeater field={field} name={name} currency={currency} />
      );
    return (
      <GroupFields
        subFields={field.subFields || []}
        name={name}
        currency={currency}
      />
    );
  }

  if (field.isList) {
    return <ListValueEditor field={field} name={name} />;
  }

  return (
    <ScalarInput
      field={field}
      name={name}
      currency={currency}
      isSubField={isSubField}
    />
  );
}
