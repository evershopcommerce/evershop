import { Card } from '@components/admin/Card.js';
import Button from '@components/common/form/Button.js';
import { Form } from '@components/common/form/Form.js';
import { useAlertContext } from '@components/common/modal/Alert.js';
import React from 'react';
import { toast } from 'react-toastify';
import { VariantGroup } from '../VariantGroup.js';
import { VariantModal } from './VariantModal.js';

export const EditVariant: React.FC<{
  variant: any;
  refresh: () => void;
  variantGroup: VariantGroup;
}> = ({ variant, refresh, variantGroup }) => {
  const { openAlert, closeAlert } = useAlertContext();
  const formId = `variantForm-${variant.id}`;

  const openModal = (e) => {
    e.persist();
    openAlert({
      heading: 'Edit variant',
      content: (
        <Form
          id={formId}
          method="PATCH"
          submitBtn={false}
          action={variant.product.updateApi}
          onSuccess={(response) => {
            if (!response.error) {
              refresh();
              closeAlert();
            } else {
              toast.error(response.error.message);
            }
          }}
        >
          <Card>
            <Card.Session>
              <VariantModal
                variantAttributes={variantGroup.attributes}
                variant={variant}
              />
            </Card.Session>
            <Card.Session>
              <div className="flex justify-end">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    title="Save"
                    variant="primary"
                    onAction={() => {
                      (
                        document.getElementById(formId) as HTMLFormElement
                      ).dispatchEvent(
                        new Event('submit', {
                          cancelable: true,
                          bubbles: true
                        })
                      );
                    }}
                  />
                  <Button
                    title="Cancel"
                    variant="secondary"
                    onAction={closeAlert}
                  />
                </div>
              </div>
            </Card.Session>
          </Card>
        </Form>
      )
    });
  };

  return (
    <div>
      <a
        className="button"
        onClick={(e) => {
          e.preventDefault();
          openModal(e);
        }}
        href="#"
      >
        Edit
      </a>
    </div>
  );
};
