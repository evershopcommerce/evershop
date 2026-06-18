import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { toast } from 'react-toastify';

const TYPE_OPTIONS = [
  { value: 'short_text', label: _('Short text') },
  { value: 'long_text', label: _('Long text') },
  { value: 'rich_text', label: _('Rich text') },
  { value: 'integer', label: _('Integer') },
  { value: 'number', label: _('Number') },
  { value: 'boolean', label: _('Boolean') },
  { value: 'date', label: _('Date') },
  { value: 'color', label: _('Color') },
  { value: 'url', label: 'URL' },
  { value: 'money', label: _('Money') },
  { value: 'json', label: 'JSON' },
  { value: 'reference', label: _('Reference') },
  { value: 'group', label: _('Group') }
];

// Sub-fields are one level deep in the editor (scalars only — no nested groups).
const SUB_TYPE_OPTIONS = TYPE_OPTIONS.filter((o) => o.value !== 'group');

const FORM_ID = 'metafieldDefinitionForm';

const SECTION_TITLE =
  'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

export interface EditableDefinition {
  uuid: string;
  name: string;
  description?: string;
  key: string;
  type: string;
  isList?: boolean;
  required?: boolean;
  visibleToCustomer?: boolean;
  validations?: Array<{
    type: string;
    min?: number;
    max?: number;
    pattern?: string;
    values?: Array<string | number>;
  }>;
  subFields?: Array<{ key: string; name: string; type: string }>;
}

interface Props {
  ownerType: string;
  /** When provided, the form edits this definition (PATCH) instead of creating. */
  definition?: EditableDefinition;
  onSaved: () => void;
}

function toNumber(value: unknown): number | undefined {
  if (value === '' || value === undefined || value === null) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

/** Decompose a definition into the flat form fields the editor renders. */
function toFormDefaults(def: EditableDefinition): Record<string, any> {
  const d: Record<string, any> = {
    name: def.name,
    description: def.description ?? '',
    fieldKey: def.key,
    fieldType: def.type,
    isList: !!def.isList,
    required: !!def.required,
    visibleToCustomer: def.visibleToCustomer !== false,
    subFields: def.subFields ?? []
  };
  for (const v of def.validations ?? []) {
    if (v.type === 'size') {
      if (v.min != null) d.sizeMin = v.min;
      if (v.max != null) d.sizeMax = v.max;
    } else if (v.type === 'range') {
      if (v.min != null) d.rangeMin = v.min;
      if (v.max != null) d.rangeMax = v.max;
    } else if (v.type === 'regexp') {
      d.pattern = v.pattern;
    } else if (v.type === 'choices') {
      d.acceptedValues = (v.values ?? []).join(', ');
    }
  }
  return d;
}

/** Repeating editor for a group's sub-fields (shown only when type = group). */
function SubFieldsBuilder() {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'subFields' as never
  });
  return (
    <div className="space-y-2 rounded-md border border-divider p-3">
      <div className={SECTION_TITLE}>{_('Sub-fields')}</div>
      {fields.map((item, index) => (
        <div key={item.id} className="flex items-end gap-2">
          <InputField
            name={`subFields.${index}.name`}
            label={index === 0 ? _('Name') : undefined}
            placeholder={_('e.g. Question')}
            wrapperClassName="flex-1"
          />
          <InputField
            name={`subFields.${index}.key`}
            label={index === 0 ? _('Key') : undefined}
            placeholder={_('e.g. question')}
            wrapperClassName="flex-1"
          />
          <SelectField
            name={`subFields.${index}.type`}
            label={index === 0 ? _('Type') : undefined}
            defaultValue="short_text"
            options={SUB_TYPE_OPTIONS}
            wrapperClassName="w-40"
          />
          <button
            type="button"
            aria-label={_('Remove sub-field')}
            onClick={() => remove(index)}
            className="mb-2 rounded p-1 text-muted-foreground hover:bg-muted/60 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          append({ name: '', key: '', type: 'short_text' } as never)
        }
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        {_('Add sub-field')}
      </Button>
    </div>
  );
}

/**
 * Validation rules for the field, conditioned on the selected type (§3.7).
 * Collapsible (default closed) to keep the dialog short. The fields stay mounted
 * while collapsed (`hidden`, not unmounted) so their values survive toggling
 * under the form's `shouldUnregister`.
 */
function ValidationRules({ type }: { type: string }) {
  const [open, setOpen] = useState(false);
  const isText = type === 'short_text' || type === 'long_text';
  const isNumeric = type === 'integer' || type === 'number';
  const hasPattern = type === 'short_text' || type === 'url';
  const hasChoices =
    type === 'short_text' || type === 'integer' || type === 'number';

  if (!isText && !isNumeric && !hasPattern && !hasChoices) return null;

  return (
    <div className="rounded-md border border-divider">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between p-3"
      >
        <span className={SECTION_TITLE}>{_('Validation')}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div className={open ? 'space-y-3 px-3 pb-3' : 'hidden'}>
        {isText && (
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              name="sizeMin"
              label={_('Min length')}
              placeholder={_('No minimum')}
              allowDecimals={false}
            />
            <NumberField
              name="sizeMax"
              label={_('Max length')}
              placeholder={_('No limit')}
              allowDecimals={false}
            />
          </div>
        )}
        {isNumeric && (
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              name="rangeMin"
              label={_('Min value')}
              placeholder={_('No minimum')}
              allowDecimals={type === 'number'}
            />
            <NumberField
              name="rangeMax"
              label={_('Max value')}
              placeholder={_('No maximum')}
              allowDecimals={type === 'number'}
            />
          </div>
        )}
        {hasPattern && (
          <InputField
            name="pattern"
            label={_('Pattern (regex)')}
            placeholder="^[A-Za-z0-9_]+$"
            helperText={_('A regular expression the value must match.')}
          />
        )}
        {hasChoices && (
          <InputField
            name="acceptedValues"
            label={_('Accepted values')}
            placeholder={_('e.g. New, Sale, Limited')}
            helperText={_('Comma-separated; renders the value as a dropdown.')}
          />
        )}
      </div>
    </div>
  );
}

/** Group → sub-field builder; everything else → validation rules. */
function TypeSpecificFields() {
  const { watch } = useFormContext();
  const type = watch('fieldType') || 'short_text';
  if (type === 'group') return <SubFieldsBuilder />;
  return <ValidationRules type={type} />;
}

/**
 * In-context create/edit form for a metafield definition. Without `definition`
 * it creates (`POST /api/metafield-definitions`); with one it edits
 * (`PATCH /api/metafield-definitions/:uuid`) and the immutable fields (key, type,
 * allow-multiple) are shown read-only. `namespace` is not shown — it defaults to
 * `custom`. Mount inside a Dialog (see MetafieldSection).
 */
export function DefinitionEditor({ ownerType, definition, onSaved }: Props) {
  const isEdit = !!definition;
  const [submitting, setSubmitting] = useState(false);
  const defaultValues = isEdit
    ? toFormDefaults(definition as EditableDefinition)
    : {
        fieldType: 'short_text',
        visibleToCustomer: true,
        isList: false,
        required: false
      };

  const handleSubmit = async (data: Record<string, any>) => {
    const type = data.fieldType || 'short_text';
    const body: Record<string, any> = {
      ownerType,
      fieldKey: data.fieldKey,
      name: data.name,
      fieldType: type,
      isList: !!data.isList,
      required: !!data.required,
      visibleToCustomer: data.visibleToCustomer !== false
    };
    if (data.description) body.description = data.description;

    if (type === 'group') {
      const subFields = (Array.isArray(data.subFields) ? data.subFields : [])
        .filter((s: any) => s && s.key && s.name)
        .map((s: any) => ({
          key: s.key,
          name: s.name,
          type: s.type || 'short_text'
        }));
      if (subFields.length === 0) {
        toast.error(_('A group needs at least one sub-field'));
        return;
      }
      body.subFields = subFields;
    } else {
      // Build the validations array, type-aware (stale fields from other types
      // are ignored because each rule is gated by the current type).
      const validations: Array<Record<string, unknown>> = [];

      if (type === 'short_text' || type === 'long_text') {
        const min = toNumber(data.sizeMin);
        const max = toNumber(data.sizeMax);
        if (min !== undefined || max !== undefined) {
          validations.push({
            type: 'size',
            ...(min !== undefined ? { min } : {}),
            ...(max !== undefined ? { max } : {})
          });
        }
      }
      if (type === 'integer' || type === 'number') {
        const min = toNumber(data.rangeMin);
        const max = toNumber(data.rangeMax);
        if (min !== undefined || max !== undefined) {
          validations.push({
            type: 'range',
            ...(min !== undefined ? { min } : {}),
            ...(max !== undefined ? { max } : {})
          });
        }
      }
      if ((type === 'short_text' || type === 'url') && data.pattern) {
        validations.push({ type: 'regexp', pattern: data.pattern });
      }
      if (type === 'short_text' || type === 'integer' || type === 'number') {
        const accepted = String(data.acceptedValues || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (accepted.length) {
          const values =
            type === 'short_text'
              ? accepted
              : accepted.map(Number).filter((n) => !Number.isNaN(n));
          validations.push({ type: 'choices', values });
        }
      }
      // On edit, always send `validations` (even empty) so the user can clear
      // the last rule; on create, omit when empty.
      if (validations.length || isEdit) body.validations = validations;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await axios.patch(
          `/api/metafield-definitions/${(definition as EditableDefinition).uuid}`,
          body
        );
        toast.success(_('Custom field updated'));
      } else {
        await axios.post('/api/metafield-definitions', body);
        toast.success(_('Custom field created'));
      }
      onSaved();
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: { message?: string } } };
      };
      const fallback = isEdit
        ? _('Failed to update field')
        : _('Failed to create field');
      toast.error(err.response?.data?.error?.message ?? fallback);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-h-[80vh] w-full overflow-auto px-1">
      <Form
        id={FORM_ID}
        submitBtn={false}
        onSubmit={handleSubmit}
        formOptions={{ defaultValues }}
      >
        <div className="space-y-4">
          <InputField
            name="name"
            label={_('Name')}
            required
            placeholder={_('e.g. Care instructions')}
            validation={{ required: _('Name is required') }}
          />
          <TextareaField
            name="description"
            label={_('Description')}
            rows={2}
            placeholder={_('Optional help text shown to admins.')}
          />
          <div className="grid grid-cols-2 gap-4">
            <InputField
              name="fieldKey"
              label={_('Key')}
              required
              disabled={isEdit}
              placeholder={_('e.g. care_instructions')}
              helperText={_(
                'Lowercase letters, digits, underscore. Immutable.'
              )}
              validation={{
                required: _('Key is required'),
                pattern: {
                  value: /^[a-z][a-z0-9_]*$/,
                  message: _(
                    'Must start with a letter; lowercase letters, digits, underscore only'
                  )
                }
              }}
            />
            <SelectField
              name="fieldType"
              label={_('Type')}
              defaultValue="short_text"
              disabled={isEdit}
              options={TYPE_OPTIONS}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <ToggleField
              name="isList"
              label={_('Allow multiple')}
              disabled={isEdit}
            />
            <ToggleField name="required" label={_('Required')} />
            <ToggleField
              name="visibleToCustomer"
              label={_('Visible to customer')}
              defaultValue
            />
          </div>
          <TypeSpecificFields />
        </div>
      </Form>
      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          isLoading={submitting}
          onClick={() =>
            (
              document.getElementById(FORM_ID) as HTMLFormElement
            )?.dispatchEvent(
              new Event('submit', { cancelable: true, bubbles: true })
            )
          }
        >
          {isEdit ? _('Update field') : _('Save field')}
        </Button>
      </div>
    </div>
  );
}
