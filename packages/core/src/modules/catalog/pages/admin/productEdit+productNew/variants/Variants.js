import uniqid from 'uniqid';
import React from 'react';
import PropTypes from 'prop-types';
import PubSub from 'pubsub-js';
import { Variant } from './Variant';
import { Search } from './Search';
import { VariantType } from './VariantType';
import { Card } from '../../../../../cms/components/admin/Card';
import { FORM_VALIDATED } from '../../../../../../lib/util/events';
import { useQuery } from 'urql';

const AttributesQuery = `
  query Query($filters: [FilterInput]) {
    attributes(filters: $filters) {
      items {
        attributeId
        attributeCode
        options {
          value: attributeOptionId
          text: optionText
        }
      }
    }
    productImageUploadUrl: url(routeId: "imageUpload", params: [{key: "0", value: ""}])
  }
`;

function variantReducer(variants, action) {
  switch (action.type) {
    case 'add':
      if (action.payload.variant) { return variants.concat(action.payload.variant); } else {
        return variants.concat({
          id: uniqid(),
          attributes: [],
          product: {}
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

  const [result, reexecuteQuery] = useQuery({
    query: AttributesQuery,
    variables: {
      filters: [
        { key: 'code', operation: 'in', value: variantAttributes.map((a) => a.attributeCode).join(',') }
      ]
    },
  });

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

  const { data, fetching, error } = result;

  if (fetching) return <p>Loading...</p>;
  if (error) return <p>Oh no... {error.message}</p>;

  return (
    <div>
      {variantAttributes.map((a) => <input key={a.attributeId} type="hidden" value={a.attributeId} name="variant_group[variant_group_attributes][]" />)}
      <Card.Session>
        <div className="variant-list">
          {variants.map((v) => (
            <Variant
              key={v.id}
              variant={v}
              attributes={data?.attributes?.items || []}
              removeVariant={removeVariant}
              updateVariant={updateVariant}
              productImageUploadUrl={data?.productImageUploadUrl}
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
    attributeName: PropTypes.string,
    attributeId: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.shape({
      optionId: PropTypes.number,
      optionText: PropTypes.string
    }))
  })).isRequired,
  variantProducts: PropTypes.arrayOf(VariantType).isRequired
};
