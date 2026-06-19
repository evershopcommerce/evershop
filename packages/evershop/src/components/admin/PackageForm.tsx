import { CheckboxField } from '@components/common/form/CheckboxField.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

export interface PackageData {
  uuid: string;
  name: string;
  length: number;
  width: number;
  height: number;
  weight: { value: number; unit: string };
  isDefault: boolean;
  updateApi: string;
  deleteApi: string;
}

export interface PackageFormProps {
  /** POST to create, PATCH to update. */
  formMethod: 'POST' | 'PATCH';
  saveApi: string;
  /** Receives the raw created/updated `package` row from the API response. */
  onSuccess: (row?: Record<string, unknown>) => void;
  reload?: () => void;
  pkg?: PackageData;
  dimensionUnit?: string;
  weightUnit?: string;
}

/**
 * Create/edit form for a package (parcel size). Height may be 0 — a flat
 * envelope. `weight` is the TARE (the empty package's own weight) and is
 * optional; it is added to the shipping weight for quotes and labels.
 * Submits via axios so business errors from the API (duplicate name,
 * default-swap rules) surface as toasts.
 */
export function PackageForm({
  formMethod,
  saveApi,
  onSuccess,
  reload,
  pkg,
  dimensionUnit,
  weightUnit
}: PackageFormProps) {
  const form = useForm();
  const [saving, setSaving] = React.useState(false);

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    try {
      const response = await axios({
        method: formMethod,
        url: saveApi,
        data: values,
        validateStatus: () => true
      });
      if (response.data?.error) {
        toast.error(response.data.error.message);
      } else {
        toast.success(
          formMethod === 'POST'
            ? _('Package created')
            : _('Package saved')
        );
        onSuccess(response.data?.data);
        if (reload) reload();
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  });

  return (
    <Form
      id="packageForm"
      method={formMethod}
      action={saveApi}
      submitBtn={false}
      onSuccess={() => {
        /* we submit via axios — Form's submit path isn't used */
      }}
      form={form}
    >
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">
          {formMethod === 'POST'
            ? _('Create a new package')
            : _('Edit package')}
        </h3>
        <InputField
          name="name"
          label={_('Name')}
          placeholder={_('e.g. Small Box')}
          required
          validation={{ required: _('Name is required') }}
          defaultValue={pkg?.name}
        />
        <div className="grid grid-cols-3 gap-x-3">
          <NumberField
            name="length"
            label={_('Length')}
            unit={dimensionUnit}
            required
            validation={{
              required: _('Length is required'),
              min: { value: 0.01, message: _('Length must be greater than 0') }
            }}
            defaultValue={pkg?.length}
          />
          <NumberField
            name="width"
            label={_('Width')}
            unit={dimensionUnit}
            required
            validation={{
              required: _('Width is required'),
              min: { value: 0.01, message: _('Width must be greater than 0') }
            }}
            defaultValue={pkg?.width}
          />
          <NumberField
            name="height"
            label={_('Height')}
            unit={dimensionUnit}
            required
            validation={{
              required: _('Height is required (0 for envelopes)'),
              min: { value: 0, message: _('Height must be 0 or greater') }
            }}
            helperText={_('0 for flat envelopes')}
            defaultValue={pkg?.height}
          />
        </div>
        <NumberField
          name="weight"
          label={_('Empty package weight')}
          unit={weightUnit}
          validation={{
            min: { value: 0, message: _('Weight must be 0 or greater') }
          }}
          helperText={_(
            'Optional. Added to the shipping weight for quotes and labels.'
          )}
          defaultValue={pkg?.weight?.value ?? 0}
        />
        <CheckboxField
          name="is_default"
          label={_('Default package')}
          defaultValue={pkg?.isDefault === true}
          helperText={_(
            'Preselected for new products. Exactly one package is the default.'
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button
            title={_('Save')}
            variant="default"
            type="button"
            disabled={saving}
            onClick={onSubmit}
          >
            {saving ? _('Saving…') : _('Save')}
          </Button>
        </div>
      </div>
    </Form>
  );
}
