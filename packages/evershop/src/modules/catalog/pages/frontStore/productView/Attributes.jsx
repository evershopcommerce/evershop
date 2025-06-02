import PropTypes from 'prop-types';
import React from 'react';


function Attributes({ product: { attributes } }) {
  if (!attributes.length) {
    return null;
  }
  return (
    <div className="specification">
      <ul className="list-disc list-inside">
        {attributes.map((attribute) => (
          <li key={attribute.attributeCode}>
            <strong>{attribute.attributeName}: </strong>{' '}
            <span>{attribute.optionText}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

Attributes.propTypes = {
  product: PropTypes.shape({
    attributes: PropTypes.arrayOf(
      PropTypes.shape({
        attributeName: PropTypes.string.isRequired,
        attributeCode: PropTypes.string.isRequired,
        optionText: PropTypes.string.isRequired
      })
    ).isRequired
  }).isRequired
};

export const query = `
  query Query {
    product (id: getContextValue('productId')) {
      attributes: attributeIndex {
        attributeName
        attributeCode
        optionText
      }
    }
  }
`;

export const layout = {
  areaId: 'productViewGeneralInfo',
  sortOrder: 25
};

export default Attributes;
