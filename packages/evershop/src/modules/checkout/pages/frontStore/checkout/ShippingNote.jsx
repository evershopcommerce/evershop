import { useAppDispatch } from '@components/common/context/app';
import Button from '@components/common/form/Button';
import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import { _ } from '../../../../../lib/locale/translate/_.js';

export default function ShippingNote({
  setting: { showShippingNote },
  cart: { shippingNote, addNoteApi }
}) {
  const AppContextDispatch = useAppDispatch();
  const [note, setNote] = React.useState(shippingNote);
  const [submitting, setSubmitting] = React.useState(false);
  return showShippingNote ? (
    <div className="shipping-note mt-8">
      <div className="form-field-container null">
        <div className="field-wrapper flex flex-grow">
          <textarea
            type="text"
            className="form-field"
            id="note"
            name="note"
            placeholder={_('Add a note to your order')}
            onChange={(e) => setNote(e.target.value)}
            value={note || ''}
          />
          <div className="field-border" />
        </div>
      </div>
      <div className="mt-3">
        <Button
          title="Save"
          variant="primary"
          isLoading={submitting}
          onAction={() => {
            setSubmitting(true);
            // Use fetch to send the note to the server
            fetch(addNoteApi, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ note }),
              credentials: 'include'
            })
              .then(async (response) => {
                if (response.ok) {
                  const url = new URL(window.location.href);
                  url.searchParams.set('ajax', true);
                  await AppContextDispatch.fetchPageData(url);
                  toast.success(_('Note saved successfully'));
                } else {
                  toast.error(_('Failed to save note'));
                }
              })
              .catch(() => {
                toast.error(_('Failed to save note'));
              })
              .finally(() => {
                setSubmitting(false);
              });
          }}
        />
      </div>
    </div>
  ) : null;
}

ShippingNote.propTypes = {
  setting: PropTypes.shape({
    showShippingNote: PropTypes.bool
  }),
  cart: PropTypes.shape({
    shippingNote: PropTypes.string,
    addNoteApi: PropTypes.string.isRequired
  })
};

ShippingNote.defaultProps = {
  setting: {
    showShippingNote: false
  },
  cart: {
    shippingNote: ''
  }
};

export const layout = {
  areaId: 'checkoutSummary',
  sortOrder: 50
};

export const query = `
  query Query {
    cart {
      shippingNote
      addNoteApi
    }
    setting {
      showShippingNote
    }
  }
`;
