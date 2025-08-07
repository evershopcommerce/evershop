import Button from '@components/common/Button.js';
import { Form } from '@components/common/form/Form.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import { useAlertContext } from '@components/common/modal/Alert.js';
import RenderIfTrue from '@components/common/RenderIfTrue.js';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

interface CancelButtonProps {
  order: {
    cancelApi: string;
    paymentStatus: {
      code: string;
      isCancelable: boolean;
    };
    shipmentStatus: {
      code: string;
      isCancelable: boolean;
    };
  };
}
export default function CancelButton({
  order: { cancelApi, paymentStatus, shipmentStatus }
}: CancelButtonProps) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  const form = useForm();
  return (
    <RenderIfTrue
      condition={
        paymentStatus.isCancelable !== false &&
        shipmentStatus.isCancelable !== false
      }
    >
      <Button
        title="Cancel Order"
        variant="danger"
        onAction={() => {
          openAlert({
            heading: 'Cancel Order',
            content: (
              <div>
                <Form
                  form={form}
                  id="cancelReason"
                  method="POST"
                  action={cancelApi}
                  submitBtn={false}
                  onSuccess={(response) => {
                    if (response.error) {
                      toast.error(response.error.message);
                      dispatchAlert({
                        type: 'update',
                        payload: { secondaryAction: { isLoading: false } }
                      });
                    } else {
                      // Reload the page
                      window.location.reload();
                    }
                  }}
                  onInvalid={() => {
                    dispatchAlert({
                      type: 'update',
                      payload: { secondaryAction: { isLoading: false } }
                    });
                  }}
                >
                  <div>
                    <TextareaField
                      name="reason"
                      label="Reason for cancellation"
                      placeholder="Reason for cancellation"
                      required
                      validation={{
                        required: 'Reason is required'
                      }}
                    />
                  </div>
                </Form>
              </div>
            ),
            primaryAction: {
              title: 'Cancel',
              onAction: closeAlert,
              variant: ''
            },
            secondaryAction: {
              title: 'Cancel Order',
              onAction: () => {
                dispatchAlert({
                  type: 'update',
                  payload: { secondaryAction: { isLoading: true } }
                });
                (
                  document.getElementById('cancelReason') as HTMLFormElement
                ).dispatchEvent(
                  new Event('submit', { cancelable: true, bubbles: true })
                );
              },
              variant: 'primary',
              isLoading: form.formState.isSubmitting
            }
          });
        }}
      />
    </RenderIfTrue>
  );
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 35
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      paymentStatus {
        code
        isCancelable
      }
      shipmentStatus {
        code
        isCancelable
      }
      cancelApi
    }
  }
`;
