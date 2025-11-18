import { AddressSummary } from '@components/common/customer/address/AddressSummary.jsx';
import { CheckboxField } from '@components/common/form/CheckboxField.js';
import { Form } from '@components/common/form/Form.js';
import { Modal } from '@components/common/modal/Modal.js';
import { useModal } from '@components/common/modal/useModal.js';
import CustomerAddressForm from '@components/frontStore/customer/address/addressForm/Index.js';
import {
  ExtendedCustomerAddress,
  useCustomer,
  useCustomerDispatch
} from '@components/frontStore/customer/CustomerContext.jsx';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { toast } from 'react-toastify';

const Address: React.FC<{
  address: ExtendedCustomerAddress;
}> = ({ address }) => {
  const { updateAddress, deleteAddress } = useCustomerDispatch();
  const modal = useModal();
  const classes = address.isDefault ? 'border-2 border-interactive' : '';
  return (
    <div className={`bg-white p-5 shadow rounded ${classes}`}>
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
          onClick={async (e) => {
            e.preventDefault();
            try {
              await deleteAddress(address.addressId);
              toast.success(_('Address has been deleted successfully!'));
            } catch (error) {
              toast.error(error.message);
            }
          }}
        >
          {_('Delete')}
        </a>
      </div>
      <Modal title="Edit Address" onClose={modal.close} isOpen={modal.isOpen}>
        <Form
          id="customerAddressForm"
          method="PATCH"
          onSubmit={async (data) => {
            await updateAddress(address.addressId, data);
            modal.close();
          }}
          onSuccess={(response) => {
            if (!response.error) {
              modal.close();
              toast.success(_('Address has been updated successfully!'));
            } else {
              toast.error(response.error.message);
            }
          }}
        >
          <CustomerAddressForm address={address} fieldNamePrefix="" />
          <CheckboxField
            label={_('Set as default')}
            defaultChecked={address.isDefault}
            name="is_default"
          />
        </Form>
      </Modal>
    </div>
  );
};

export function MyAddresses({ title }: { title?: string }) {
  const { customer } = useCustomer();
  const { addAddress } = useCustomerDispatch();
  const modal = useModal();
  if (!customer) {
    return null;
  }
  return (
    <div>
      {title && (
        <div className="border-b mb-5 border-gray-200">
          <h2>{_('Address Book')}</h2>
        </div>
      )}
      {customer.addresses.length === 0 && (
        <div className="order-history-empty">
          {_('You have no addresses saved')}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {customer.addresses.map((address) => (
          <Address key={address.uuid} address={address} />
        ))}
      </div>
      <br />
      <a
        href="#"
        className="text-interactive underline"
        onClick={(e) => {
          e.preventDefault();
          modal.open();
        }}
      >
        {_('Add new address')}
      </a>
      <Modal
        title={_('Add new address')}
        onClose={modal.close}
        isOpen={modal.isOpen}
      >
        <Form
          id="customerAddressForm"
          method={'POST'}
          onSubmit={async (data) => {
            try {
              await addAddress(data as ExtendedCustomerAddress);
              toast.success(_('Address has been saved successfully!'));
            } catch (error) {
              toast.error(error.message);
            }
          }}
          onSuccess={(response) => {
            if (!response.error) {
              modal.close();
              toast.success(_('Address has been saved successfully!'));
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            } else {
              toast.error(response.error.message);
            }
          }}
        >
          <CustomerAddressForm address={undefined} fieldNamePrefix="" />
          <CheckboxField
            label={_('Set as default')}
            defaultChecked={false}
            name="is_default"
          />
        </Form>
      </Modal>
    </div>
  );
}
