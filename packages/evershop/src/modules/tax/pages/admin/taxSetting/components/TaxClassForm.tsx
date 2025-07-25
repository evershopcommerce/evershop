import { Card } from '@components/admin/Card.js';
import Button from '@components/common/form/Button.js';
import { Field } from '@components/common/form/Field.js';
import { Form } from '@components/common/form/Form.js';
import React from 'react';

interface TaxClassFormProps {
  saveTaxClassApi: string;
  closeModal: () => void;
  getTaxClasses: (options?: { requestPolicy?: string }) => Promise<void>;
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
          <Field
            name="name"
            type="text"
            placeholder="Enter tax class name"
            validationRules={['notEmpty']}
            value=""
          />
        </Card.Session>
        <Card.Session>
          <div className="flex justify-end gap-4">
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
