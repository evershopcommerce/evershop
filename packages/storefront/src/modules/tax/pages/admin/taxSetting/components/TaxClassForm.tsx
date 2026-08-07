import { Card } from '@components/admin/Card.js';
import Button from '@components/common/Button.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
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
    <Card title="Create a tax class">
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
        <Card.Session title="Tax class name">
          <InputField
            name="name"
            type="text"
            label="Tax class name"
            defaultValue=""
            placeholder="Enter tax class name"
            required
            validation={{ required: 'Tax class name is required' }}
          />
        </Card.Session>
        <Card.Session>
          <div className="flex justify-end gap-2">
            <Button title="Cancel" variant="secondary" onAction={closeModal} />
            <Button
              title="Save"
              variant="primary"
              onAction={() => {
                (
                  document.getElementById('createTaxClass') as HTMLFormElement
                ).dispatchEvent(
                  new Event('submit', {
                    cancelable: true,
                    bubbles: true
                  })
                );
              }}
            />
          </div>
        </Card.Session>
      </Form>
    </Card>
  );
}

export { TaxClassForm };
