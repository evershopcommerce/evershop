/* eslint-disable react/no-array-index-key */
/* eslint-disable react/jsx-closing-tag-location */
import PropTypes from 'prop-types';
import React from 'react';
import Button from '@components/common/form/Button';
import { useAlertContext } from '@components/common/modal/Alert';
import { toast } from 'react-toastify';

export default function CancelButton({ order: { cancelApi } }) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  return (
    <Button
      title="Cancel Order"
      variant="danger"
      onAction={() => {
        openAlert({
          heading: 'Cancel Order',
          content: <div>Are you sure you want to cancel this order?</div>,
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: ''
          },
          secondaryAction: {
            title: 'Cancel',
            onAction: () => {
              dispatchAlert({
                type: 'update',
                payload: { secondaryAction: { isLoading: true } }
              });
              window
                .fetch(cancelApi, {
                  method: 'POST'
                })
                .then((response) => response.json())
                .then((response) => {
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
                });
            },
            variant: 'primary',
            isLoading: false
          }
        });
      }}
    />
  );
}

CancelButton.propTypes = {
  order: PropTypes.shape({
    cancelApi: PropTypes.string.isRequired
  }).isRequired
};

export const layout = {
  areaId: 'order_actions',
  sortOrder: 15
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      cancelApi
    }
  }
`;
