import React from 'react';
import PropTypes from 'prop-types';
import { Card } from '@components/admin/cms/Card';
import { Field } from '@components/common/form/Field';
import { Form } from '@components/common/form/Form';
import Button from '@components/common/form/Button';

function TaxClassForm({ saveTaxClassApi, closeModal, getTaxClasses }) {
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
          <div className="flex justify-end gap-1">
            <Button title="Cancel" variant="secondary" onAction={closeModal} />
            <Button
              title="Save"
              variant="primary"
              onAction={() => {
                document.getElementById('createTaxClass').dispatchEvent(
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

TaxClassForm.propTypes = {
  saveTaxClassApi: PropTypes.string.isRequired,
  closeModal: PropTypes.func.isRequired,
  getTaxClasses: PropTypes.func.isRequired
};

export default TaxClassForm;
