import { AddressSummary } from '@components/common/customer/address/AddressSummary.jsx';
import { Form } from '@components/common/form/Form.js';
import { Modal } from '@components/common/modal/Modal.js';
import { useModal } from '@components/common/modal/useModal.js';
import CustomerAddressForm from '@components/frontStore/customer/address/addressForm/Index.js';
import React from 'react';
import { toast } from 'react-toastify';
import { _ } from '../../../lib/locale/translate/_.js';

export const Address: React.FC<{
  address: {
    fullName: string;
    address1: string;
    address2?: string;
    city: string;
    postcode: string;
    country: {
      name: string;
      code: string;
    };
    province?: {
      name: string;
      code: string;
    };
    telephone: string;
    isDefault: boolean;
    updateApi: string;
    deleteApi: string;
  };
}> = ({ address }) => {
  const modal = useModal();
  return (
    <div>
      <AddressSummary address={address} />
      <div className="flex justify-between items-center mt-2">
        <a
          href="#"
          className="text-interactive hover:underline"
          onClick={(e) => {
            e.preventDefault();
            modal.open();
          }}
        >
          {_('Edit')}
        </a>
        <a
          href="#"
          className="text-critical hover:underline"
          onClick={(e) => {
            e.preventDefault();
            modal.open();
          }}
        >
          {_('Delete')}
        </a>
      </div>
      <Modal title="Edit Address" onClose={modal.close} isOpen={modal.isOpen}>
        <Form
          id="customerAddressForm"
          method="PATCH"
          action={address.updateApi}
          onSuccess={(response) => {
            if (!response.error) {
              modal.close();
              toast.success(_('Address has been updated successfully!'));
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            } else {
              toast.error(response.error.message);
            }
          }}
        >
          <CustomerAddressForm address={address} fieldNamePrefix="" />
        </Form>
      </Modal>
    </div>
  );
};
