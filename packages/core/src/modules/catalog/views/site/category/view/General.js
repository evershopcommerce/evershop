import React from 'react';
import PropTypes from 'prop-types';
import Area from '../../../../../../lib/components/Area';
import { useAppState } from '../../../../../../lib/context/app';
import { get } from '../../../../../../lib/util/get';
import { getComponents } from '../../../../../../lib/components/getComponents';

function Name({ name }) {
  return <h1 className="category-name text-center mt-25 mb-15">{name}</h1>;
}

Name.propTypes = {
  name: PropTypes.string
};

Name.defaultProps = {
  name: ''
};

function Description({ description }) {
  // eslint-disable-next-line react/no-danger
  return <div className="category-description" dangerouslySetInnerHTML={{ __html: description }} />;
}

Description.defaultProps = {
  description: ''
};

Description.propTypes = {
  description: PropTypes.string
};

export default function CategoryInfo() {
  const category = get(useAppState(), 'category');

  return (
    <div className="page-width">
      <Area
        id="category-general-info"
        className="category-general-info"
        components={getComponents()}
        coreComponents={[
          {
            component: { default: Name },
            props: { name: category.name },
            sortOrder: 10,
            id: 'category-name'
          }
        ]}
      />
    </div>
  );
}
