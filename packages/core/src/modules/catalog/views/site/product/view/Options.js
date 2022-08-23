/* eslint-disable react/no-array-index-key */
import PropTypes from 'prop-types';
import React from 'react';
import { useSelector } from 'react-redux';
import { MultiSelect } from '../../../../../../lib/components/form/fields/MultiSelect';
import { Select } from '../../../../../../lib/components/form/fields/Select';
import { get } from '../../../../../../lib/util/get';

export default function Options({ options = [] }) {
  if (options.length === 0) { return null; }

  const currency = useSelector((state) => get(state, 'pageData.currency', 'USD'));
  const language = useSelector((state) => get(state, 'pageData.language', 'en'));

  return (
    <div className="product-single-options mt-4 mb-4">
      <div className="product-single-options-title mb-2"><strong>Options</strong></div>
      {options.map((o, i) => {
        const values = o.values.map((v) => {
          const formatedPrice = new Intl.NumberFormat(language, { style: 'currency', currency }).format(v.extra_price);
          return {
            value: v.value_id,
            text: `${v.value} (+ ${formatedPrice})`
          };
        });
        let FieldComponent = '';
        switch (o.option_type) {
          case 'select':
            FieldComponent = (
              <Select
                key={i}
                name={`product_custom_options[${o.option_id}][]`}
                options={values}
                validation_rules={parseInt(o.is_required, 10) === 1 ? ['notEmpty'] : []}
                formId="product-form"
                label={o.option_name}
              />
            );
            break;
          case 'multiselect':
            FieldComponent = (
              <MultiSelect
                key={i}
                name={`product_custom_options[${o.option_id}][]`}
                options={values}
                validation_rules={parseInt(o.is_required, 10) === 1 ? ['notEmpty'] : []}
                formId="product-form"
                label={o.option_name}
              />
            );
            break;
          default:
            FieldComponent = (
              <Select
                key={i}
                name={`product_custom_options[${o.option_id}][]`}
                options={values}
                validation_rules={parseInt(o.is_required, 10) === 1 ? ['notEmpty'] : []}
                formId="product-form"
                label={o.option_name}
              />
            );
        }
        return FieldComponent;
      })}
    </div>
  );
}

Options.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({
    option_id: PropTypes.number,
    is_required: PropTypes.number,
    option_name: PropTypes.string,
    option_type: PropTypes.string
  })).isRequired
};
