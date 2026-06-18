import Spinner from '@components/admin/Spinner.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';
import { TaxRate } from './Rate.js';

const MethodsQuery = `
  query Methods {
    shippingMethods {
      value: shippingMethodId
      label: name
    }
    createShippingMethodApi: url(routeId: "createShippingMethod")
  }
`;

interface MethodFormProps {
  saveRateApi: string;
  closeModal: () => void;
  getTaxClasses: (options?: { requestPolicy?: string }) => Promise<void> | void;
  rate?: TaxRate;
}

function RateForm({
  saveRateApi,
  closeModal,
  getTaxClasses,
  rate
}: MethodFormProps) {
  const form = useForm({
    shouldUnregister: true
  });
  const [saving, setSaving] = React.useState(false);
  const [result] = useQuery({
    query: MethodsQuery
  });

  if (result.fetching) {
    return (
      <div className="flex justify-center p-2">
        <Spinner width={25} height={25} />
      </div>
    );
  }

  return (
    <Form
      form={form}
      id="taxRateForm"
      method={rate ? 'PATCH' : 'POST'}
      action={saveRateApi}
      submitBtn={false}
      onError={(error: string) => {
        toast.error(error);
        setSaving(false);
      }}
      onSuccess={async (response) => {
        if (!response.error) {
          await getTaxClasses({ requestPolicy: 'network-only' });
          closeModal();
          toast.success(_('Tax rate has been saved successfully!'));
        } else {
        }
        setSaving(false);
      }}
    >
      <div className="py-3 border-t border-border">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <InputField
              name="name"
              placeholder={_('Name')}
              required
              validation={{ required: _('Name is required') }}
              label={_('Name')}
              defaultValue={rate?.name}
            />
          </div>
          <div>
            <NumberField
              name="rate"
              label={_('Rate')}
              placeholder={_('Rate')}
              required
              validation={{ required: _('Rate is required') }}
              defaultValue={rate?.rate}
            />
          </div>
        </div>
      </div>
      <div className="py-3 border-t border-border">
        <div className="grid grid-cols-3 gap-5">
          <div>
            <InputField
              name="country"
              label={_('Country')}
              placeholder={_('Country')}
              required
              validation={{ required: _('Country is required') }}
              defaultValue={rate?.country}
              helperText={_(
                'Country code (e.g., "US"). Use "*" for all countries.'
              )}
            />
          </div>
          <div>
            <InputField
              name="province"
              label={_('Provinces')}
              placeholder={_('Provinces')}
              required
              validation={{ required: _('Provinces is required') }}
              defaultValue={rate?.province}
              helperText={_(
                'Province code (e.g., "CA"). Use "*" for all provinces.'
              )}
            />
          </div>
          <div>
            <InputField
              name="postcode"
              label={_('Postcode')}
              placeholder={_('Postcode')}
              required
              validation={{ required: _('Postcode is required') }}
              defaultValue={rate?.postcode}
              helperText={_(
                'Postcode (e.g., "90210"). Empty for all postcodes.'
              )}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 mt-5">
          <div>
            <ToggleField
              name="is_compound"
              label={_('Is compound')}
              defaultValue={rate?.isCompound || false}
            />
          </div>
          <div />
        </div>
        <div className="grid grid-cols-2 gap-5 mt-5">
          <div>
            <NumberField
              name="priority"
              label={_('Priority')}
              placeholder={_('Priority')}
              validation={{ required: _('Priority is required') }}
              required
              defaultValue={rate?.priority}
            />
          </div>
          <div />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button title={_('Cancel')} variant="secondary" onClick={closeModal}>
          {_('Cancel')}
        </Button>
        <Button
          title={_('Save')}
          variant="default"
          onClick={async () => {
            const result = await form.trigger();
            if (!result) {
              return;
            }
            setSaving(true);
            (
              document.getElementById('taxRateForm') as HTMLFormElement
            ).dispatchEvent(
              new Event('submit', {
                cancelable: true,
                bubbles: true
              })
            );
          }}
          isLoading={saving}
        >
          {_('Save')}
        </Button>
      </div>
    </Form>
  );
}

export { RateForm };
