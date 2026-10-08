import { EmailField } from '@components/common/form/EmailField.js';
import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { TelField } from '@components/common/form/TelField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import { Field, FieldLabel } from '@components/common/ui/Field.js';
import type { ResolvedAddressField } from '@evershop/evershop/lib/address/types';
import React from 'react';
import { useController, useFormContext, type RegisterOptions } from 'react-hook-form';

/**
 * One renderer per field `type` (spec § 3.9). The default map reuses the
 * shared form fields; a theme or extension overrides a renderer by shadowing
 * this file through the `@components` alias chain (a dial-code telephone
 * widget replaces `tel`, for example). Validation still comes from the
 * schema's `required` and `pattern`, passed in as `rules`.
 */
export interface AddressFieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface AddressFieldProps {
  field: ResolvedAddressField;
  /** The form field name, prefix included (`shippingAddress.locality`). */
  name: string;
  /** Translated label. */
  label: string;
  required: boolean;
  placeholder?: string;
  /** react-hook-form rules derived from the schema (required, pattern). */
  rules: RegisterOptions;
  defaultValue?: string;
  /** Options for `select` fields: countries or regions. */
  options?: AddressFieldOption[];
  /** `select`: disabled while a parent level is empty or options are loading. */
  disabled?: boolean;
  /**
   * `select`: there is nothing to choose (one country offered), so show the
   * option's label as text and keep the value registered — no control.
   */
  readOnly?: boolean;
  onChange?: (value: string) => void;
}

const warned = new Set<string>();

export function TextRenderer({ name, label, required, placeholder, rules, defaultValue }: AddressFieldProps) {
  return (
    <InputField
      name={name}
      label={label}
      placeholder={placeholder}
      required={required}
      validation={rules}
      defaultValue={defaultValue ?? ''}
    />
  );
}

/** A select with a single, fixed value: the label and the option's text, value registered through react-hook-form. */
function ReadOnlySelect({ name, label, defaultValue, options = [] }: AddressFieldProps) {
  const { control } = useFormContext();
  const { field } = useController({ name, control, defaultValue: defaultValue ?? '' });
  const current = String(field.value ?? defaultValue ?? '');
  const text = options.find((o) => o.value === current)?.label ?? current;
  return (
    <Field data-slot="field">
      <FieldLabel htmlFor={`field-${name}`}>{label}</FieldLabel>
      <div
        id={`field-${name}`}
        data-readonly="true"
        className="address-field__readonly flex h-9 items-center rounded-md border border-input bg-muted/40 px-2.5 text-sm"
      >
        {text}
      </div>
    </Field>
  );
}

export function SelectRenderer(props: AddressFieldProps) {
  if (props.readOnly) {
    return <ReadOnlySelect {...props} />;
  }
  const { name, label, required, placeholder, rules, defaultValue, options = [], disabled, onChange } = props;
  return (
    <SelectField
      name={name}
      label={label}
      placeholder={placeholder ?? label}
      required={required}
      validation={rules}
      options={options}
      disabled={disabled}
      defaultValue={defaultValue ?? ''}
      onChange={(value) => onChange?.(String(value ?? ''))}
    />
  );
}

export function TelRenderer({ name, label, required, placeholder, rules, defaultValue }: AddressFieldProps) {
  return (
    <TelField
      name={name}
      label={label}
      placeholder={placeholder}
      required={required}
      validation={rules}
      defaultValue={defaultValue ?? ''}
    />
  );
}

export function TextareaRenderer({ name, label, required, placeholder, rules, defaultValue }: AddressFieldProps) {
  return (
    <TextareaField
      name={name}
      label={label}
      placeholder={placeholder}
      required={required}
      validation={rules}
      defaultValue={defaultValue ?? ''}
    />
  );
}

export function NumberRenderer({ name, label, required, placeholder, rules, defaultValue }: AddressFieldProps) {
  const numeric = defaultValue !== undefined && defaultValue !== '' ? Number(defaultValue) : undefined;
  return (
    <NumberField
      name={name}
      label={label}
      placeholder={placeholder}
      required={required}
      validation={rules}
      defaultValue={Number.isFinite(numeric) ? numeric : undefined}
    />
  );
}

export function EmailRenderer({ name, label, required, placeholder, rules, defaultValue }: AddressFieldProps) {
  return (
    <EmailField
      name={name}
      label={label}
      placeholder={placeholder}
      required={required}
      validation={rules}
      defaultValue={defaultValue ?? ''}
    />
  );
}

/** An unknown `type` renders as text and says so once in the console, so a typo in a package never hides a field. */
export function FallbackRenderer(props: AddressFieldProps) {
  if (!warned.has(props.field.type)) {
    warned.add(props.field.type);
    // eslint-disable-next-line no-console
    console.warn(
      `[address] No renderer for field type "${props.field.type}" (field "${props.field.id}"); rendering a text input.`
    );
  }
  return <TextRenderer {...props} />;
}

export const addressFieldRenderers: Record<string, React.ComponentType<AddressFieldProps>> = {
  text: TextRenderer,
  select: SelectRenderer,
  tel: TelRenderer,
  textarea: TextareaRenderer,
  number: NumberRenderer,
  email: EmailRenderer
};

export function getAddressFieldRenderer(type: string): React.ComponentType<AddressFieldProps> {
  return addressFieldRenderers[type] ?? FallbackRenderer;
}
