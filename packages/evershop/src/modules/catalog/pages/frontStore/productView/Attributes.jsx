import PropTypes from 'prop-types';
import React from 'react';

function Attributes({ attributes, areaProps }) {
  React.useEffect(() => {
    areaProps.registerTab({ name: 'Specification', id: 'specification' });
  }, []);

  return areaProps.currentTab === 'specification' ? (
    <div className="specification">
      <ul className="list-basic">
        {attributes.map((attribute) => (
          <li key={attribute.attribute_code}>
            <strong>{attribute.attribute_name} : </strong>{' '}
            <span>{attribute.option_text}</span>
          </li>
        ))}
      </ul>
    </div>
  ) : null;
}

Attributes.propTypes = {
  areaProps: PropTypes.shape({
    currentTab: PropTypes.string,
    registerTab: PropTypes.func
  }).isRequired,
  attributes: PropTypes.arrayOf(
    PropTypes.shape({
      attribute_name: PropTypes.string,
      attribute_code: PropTypes.string,
      option_text: PropTypes.string
    })
  ).isRequired
};

export default Attributes;
