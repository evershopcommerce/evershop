import React from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { Form } from '@components/common/form/Form';
import { Field } from '@components/common/form/Field';
import { useAppDispatch } from '@components/common/context/app';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

export default function ShippingNote({
  setting: { showShippingNote },
  cart: { shippingNote, addNoteApi }
}) {
  const AppContextDispatch = useAppDispatch();
  return showShippingNote ? (
    <div className="shipping-note mt-8">
      <Form
        id="shippingNoteForm"
        action={addNoteApi}
        onSuccess={async (response) => {
          if (response.error) {
            toast.error(response.error.message);
          } else {
            const url = new URL(window.location.href);
            url.searchParams.set('ajax', true);
            await AppContextDispatch.fetchPageData(url);
          }
        }}
      >
        <Field
          name="note"
          type="textarea"
          value={shippingNote}
          placeholder={_('Add a note to your order')}
        />
      </Form>
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
