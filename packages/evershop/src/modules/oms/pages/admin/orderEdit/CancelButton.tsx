import { Form } from '@components/common/form/Form.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import RenderIfTrue from '@components/common/RenderIfTrue.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@components/common/ui/Dialog.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
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
  const form = useForm();
  return (
    <RenderIfTrue
      condition={
        paymentStatus.isCancelable !== false &&
        shipmentStatus.isCancelable !== false
      }
    >
      <Dialog>
        <DialogTrigger>
          <Button variant="destructive">{_('Cancel Order')}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{_('Cancel Order')}</DialogTitle>
          </DialogHeader>
          <Form
            form={form}
            id="cancelReason"
            method="POST"
            action={cancelApi}
            submitBtn={false}
            onSuccess={(response) => {
              if (response.error) {
                toast.error(response.error.message);
              } else {
                // Reload the page
                window.location.reload();
              }
            }}
          >
            <div>
              <TextareaField
                name="reason"
                label={_('Reason for cancellation')}
                placeholder={_('Reason for cancellation')}
                required
                validation={{
                  required: _('Reason is required')
                }}
              />
            </div>
          </Form>
          <DialogFooter>
            <DialogClose>
              <Button variant="outline">{_('Cancel')}</Button>
            </DialogClose>
            <Button
              variant="default"
              isLoading={form.formState.isSubmitting}
              onClick={async () => {
                (
                  document.getElementById('cancelReason') as HTMLFormElement
                ).dispatchEvent(
                  new Event('submit', { cancelable: true, bubbles: true })
                );
              }}
            >
              {_('Submit Cancellation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
