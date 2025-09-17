import React from 'react';

interface AttributesProps {
  product: {
    attributes: Array<{
      attributeName: string;
      attributeCode: string;
      optionText: string;
    }>;
  };
}

function Attributes({ product: { attributes } }: AttributesProps) {
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

export const query = `
  query Query {
    product: currentProduct {
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
