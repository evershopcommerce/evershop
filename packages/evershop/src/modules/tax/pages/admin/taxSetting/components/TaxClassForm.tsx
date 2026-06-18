import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface TaxClassFormProps {
  saveTaxClassApi: string;
  closeModal: () => void;
  getTaxClasses: (options?: { requestPolicy?: string }) => Promise<void> | void;
}

function TaxClassForm({
  saveTaxClassApi,
  closeModal,
  getTaxClasses
}: TaxClassFormProps) {
  return (
    <Form
      id="createTaxClass"
      method="POST"
      action={saveTaxClassApi}
      submitBtn={false}
      onSuccess={async () => {
        await getTaxClasses({ requestPolicy: 'network-only' });
        closeModal();
      }}
    >
      <InputField
        name="name"
        type="text"
        label={_('Tax class name')}
        defaultValue=""
        placeholder={_('Enter tax class name')}
        required
        validation={{ required: _('Tax class name is required') }}
      />
      <div className="flex justify-end gap-2 mt-3">
        <Button title={_('Cancel')} variant="secondary" onClick={closeModal}>
          {_('Cancel')}
        </Button>
        <Button
          title={_('Save')}
          variant="default"
          onClick={() => {
            (
              document.getElementById('createTaxClass') as HTMLFormElement
            ).dispatchEvent(
              new Event('submit', {
                cancelable: true,
                bubbles: true
              })
            );
          }}
        >
          {_('Save')}
        </Button>
      </div>
    </Form>
  );
}

export { TaxClassForm };
