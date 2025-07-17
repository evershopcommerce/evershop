import React from 'react';
import PropTypes from 'prop-types';
import { default as StoreForm } from '@components/frontStore/customer/store/Index';
import { _ } from '@evershop/evershop/src/lib/locale/translate';
import { useModal } from '@components/common/modal/useModal';
import { Form } from '@components/common/form/Form';
import { toast } from 'react-toastify';
import { Field } from '@components/common/form/Field';

export default function Store({
  account: { store, addStoreApi }
}) {
  const modal = useModal();
  const isLoading = React.useRef(false);
  const editingStore = React.useRef(null);
  console.log(`store: ${  store}`);
  return (
    <div>
      {store.shopName === null && (
        <div className="order-history-empty">
          {_('You have no store saved')}
        </div>
      )}
      {store.shopName !== null && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            className='border rounded border-green-700 p-5'
          >
            <div className="store-name text-lg font-semibold text-gray-800">
  <span className="text-gray-600">Store Name:</span> {store.shopName}
</div>
            <div className="flex justify-end gap-5">
              <a
                href="#"
                className="text-interactive underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (isLoading.current) {
                    return;
                  }
                  editingStore.current = store;
                  modal.openModal();
                }}
              >
                {_('Edit')}
              </a>
            </div>
          </div>
      
      </div>
      )}
      <br />
      {store.shopName === null && (
          <a
            href="#"
            className="text-interactive underline"
            onClick={(e) => {
              e.preventDefault();
              if (isLoading.current) {
                return;
              }
              editingStore.current = null;
              modal.openModal();
            }}
          >
            {_('Add new store')}
          </a>
      )}
      {modal.state.showing && (
        <div className={modal.className} onAnimationEnd={modal.onAnimationEnd}>
          <div
            className="modal-wrapper flex self-center justify-center items-center"
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal">
              <div className="bg-white p-8">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="mb-3">
                    {editingStore.current ? _('Edit store') : _('Add new store')}
                  </h2>
                  <a
                    href="#"
                    className="text-critical underline"
                    onClick={(e) => {
                      e.preventDefault();
                      modal.closeModal();
                    }}
                  >
                    {_('Close')}
                  </a>
                </div>
                <Form
                  id="storeForm"
                  method={editingStore.current ? 'PATCH' : 'POST'}
                  action={
                    editingStore.current
                      ? editingStore.current.updateApi
                      : addStoreApi
                  }
                  onSuccess={(response) => {
                    if (!response.error) {
                      modal.closeModal();
                      toast.success(_('Store has been saved successfully!'));
                      setTimeout(() => {
                        window.location.reload();
                      }, 1500);
                    } else {
                      toast.error(response.error.message);
                    }
                  }}
                >
                  <Field
                      name='shopName'
                      value={editingStore.current?.shopName}
                      placeholder={_('Store Name')}
                      label={_('Store Name')}
                      type="text"
                      validationRules={['notEmpty']}
                  />
                </Form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Store.propTypes = {
  account: PropTypes.shape({
    store: PropTypes.shape({
      shopName: PropTypes.string,
      rating: PropTypes.string,
      totalSales: PropTypes.number,
      productCount: PropTypes.number,
      updateApi: PropTypes.string,
      accessApi: PropTypes.string
  }),
    addStoreApi: PropTypes.string
  })
};

export const layout = {
  areaId: 'accountPageStore',
  sortOrder: 20
};

export const query = `
  query Query {
    account: currentCustomer {
      uuid
      fullName
      email
      store {
        shopName
        rating
        totalSales
        productCount
        updateApi
        accessApi
      }
      addStoreApi
    }
  }
`;
