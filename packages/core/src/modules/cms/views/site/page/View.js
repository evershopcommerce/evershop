import PropTypes from 'prop-types';
import React from 'react';
import Area from '../../../../../lib/components/Area';
import { useAppState } from '../../../../../lib/context/app';
import { get } from '../../../../../lib/util/get';

function Name({ name }) {
  return <h1 className="page-name text-center mt-25 mb-15">{name}</h1>;
}

Name.propTypes = {
  name: PropTypes.string.isRequired
};

function Content({ content }) {
  // eslint-disable-next-line react/no-danger
  return <div className="page-content" dangerouslySetInnerHTML={{ __html: content }} />;
}

Content.propTypes = {
  content: PropTypes.string.isRequired
};

export default function PageView() {
  const cmsPage = get(useAppState(), 'cmsPage');

  return (
    <div className="page-width">
      <Area
        id="page-view"
        className="page-view"
        coreComponents={[
          {
            component: { default: Name },
            props: { name: cmsPage.name },
            sortOrder: 10,
            id: 'cms-page-name'
          },
          {
            component: { default: Content },
            props: { content: cmsPage.content },
            sortOrder: 20,
            id: 'cms-page-content'
          }
        ]}
      />
    </div>
  );
}
