import { Form } from '@components/common/form/Form.js';
import { Modal } from '@components/common/modal/Modal.js';
import { useModal } from '@components/common/modal/useModal.js';
import CustomerAddressForm from '@components/frontStore/customer/address/addressForm/Index.js';
import React from 'react';
import { toast } from 'react-toastify';
import { _ } from '../../../../../lib/locale/translate/_.js';
import { Address } from '../../../components/Address.js';

interface AddressesProps {
  account: {
    addresses: {
      uuid: string;
      fullName: string;
      street: string;
      city: string;
      isDefault: boolean;
      telephone: string;
      postcode: string;
      address1: string;
      address2?: string;
      province?: {
        name: string;
        code: string;
      };
      country: {
        name: string;
        code: string;
      };
      deleteApi: string;
      updateApi: string;
    }[];
    addAddressApi: string;
  };
}

export default function Addresses({
  account: { addresses, addAddressApi }
}: AddressesProps) {
  const modal = useModal();
  const isLoading = React.useRef(false);
  const editingAddress = React.useRef(null);
  return (
    <div>
      {addresses.length === 0 && (
        <div className="order-history-empty">
          {_('You have no addresses saved')}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {addresses.map((address) => (
          <Address key={address.uuid} address={address} />
        ))}
      </div>
      <br />
      <a
        href="#"
        className="text-interactive underline"
        onClick={(e) => {
          e.preventDefault();
          if (isLoading.current) {
            return;
          }
          editingAddress.current = null;
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
        <div className="bg-white p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="mb-2">
              {editingAddress ? _('Edit address') : _('Add new address')}
            </h2>
            <a
              href="#"
              className="text-critical underline"
              onClick={(e) => {
                e.preventDefault();
                modal.close();
              }}
            >
              {_('Close')}
            </a>
          </div>
          <Form
            id="customerAddressForm"
            method={editingAddress.current ? 'PATCH' : 'POST'}
            action={addAddressApi}
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
            <CustomerAddressForm
              address={editingAddress.current || undefined}
              fieldNamePrefix=""
            />
          </Form>
        </div>
      </Modal>
    </div>
  );
}

export const layout = {
  areaId: 'accountPageAddressBook',
  sortOrder: 10
};

export const query = `
  query Query {
    account: currentCustomer {
      uuid
      fullName
      email
      addresses {
        uuid
        fullName
        address1
        city
        postcode
        country {
          name
          code
        }
        province {
          name
          code
        }
        telephone
        isDefault
        updateApi
        deleteApi
      }
      addAddressApi
    }
  }
`;
