import uniqid from 'uniqid';
import React from 'react';
import PropTypes from 'prop-types';
import PubSub from 'pubsub-js';
import { FORM_VALIDATED } from '../../../../../../../lib/util/events';
import { Variant } from './Variant';
import { Card } from '../../../../../../cms/views/admin/Card';
import { Search } from './Search';
import { VariantType } from './VariantType';

function variantReducer(variants, action) {
  switch (action.type) {
    case 'add':
      if (action.payload.variant) { return variants.concat(action.payload.variant); } else {
        return variants.concat({
          id: uniqid(),
          attributes: [],
          image: {},
          sku: '',
          price: 0,
          qty: '',
          status: 1,
          visibility: 0,
          isNew: true
        });
      }
    case 'remove':
      return variants.filter((v) => v.id !== action.payload.id);
    case 'update':
      return variants.map((v) => {
        if (v.id === action.payload.id) {
          return action.payload.variant;
        } else {
          return v;
        }
      });
    default:
      throw new Error();
  }
}

export function Variants({ variantAttributes, variantProducts }) {
  const [variants, dispatch] = React.useReducer(variantReducer, variantProducts);

  // eslint-disable-next-line no-unused-vars
  const validate = (formId, errors) => { // TODO: Fix validation variants when editing product
    // setVariants(variants.map((v) => {
    //   v.duplicate = false;
    //   variants.forEach((variant) => {
    //     if (v.id !== variant.id && isDuplicated(v.attributes, variant.attributes)) {
    //       v.duplicate = true;
    //       errors['variants'] = "Duplicated variant";
    //     }
    //   });

    //   return v;
    // }))
  };

  React.useEffect(() => {
    const token = PubSub.subscribe(FORM_VALIDATED, (message, data) => {
      validate(data.formId, data.errors);
    });

    return function cleanup() {
      PubSub.unsubscribe(token);
    };
  }, [variants]);

  const addVariant = (e, variant = null) => {
    e.preventDefault();
    dispatch({
      type: 'add',
      payload: {
        variant
      }
    });
  };

  const removeVariant = (variant) => {
    dispatch({
      type: 'remove',
      payload: {
        id: variant.id
      }
    });
  };

  const updateVariant = (id, value) => {
    dispatch({
      type: 'update',
      payload: {
        id,
        variant: value
      }
    });
  };

  return (
    <div>
      {variantAttributes.map((a) => <input key={a.attribute_id} type="hidden" value={a.attribute_id} name="variant_group[variant_group_attributes][]" />)}
      <Card.Session>
        <div className="variant-list">
          {variants.map((v) => (
            <Variant
              key={v.id}
              variant={v}
              attributes={variantAttributes}
              removeVariant={removeVariant}
              updateVariant={updateVariant}
            />
          ))}
        </div>
      </Card.Session>
      <Card.Session>
        <Search addVariant={addVariant} variants={variants} />
      </Card.Session>
    </div>
  );
}

Variants.propTypes = {
  variantAttributes: PropTypes.arrayOf(PropTypes.shape({
    attribute_name: PropTypes.string,
    attribute_id: PropTypes.string.string,
    options: PropTypes.arrayOf(PropTypes.shape({
      attribute_option_id: PropTypes.number,
      option_text: PropTypes.string
    }))
  })).isRequired,
  variantProducts: PropTypes.arrayOf(VariantType).isRequired
};
