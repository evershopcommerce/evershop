import Area from '@components/common/Area';
import Button from '@components/common/form/Button';
import PropTypes from 'prop-types';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

function Name() {
  return (
    <h1 className="page-name text-center mt-10 mb-6">
      {_('404 Page Not Found')}
    </h1>
  );
}

function Content({ continueShoppingUrl }) {
  return (
    <div className="page-content">
      <div className="text-center">
        {_('The page you requested does not exist.')}
      </div>
      <div className="mt-8 text-center">
        <Button
          title={_('Continue shopping')}
          url={continueShoppingUrl}
          outline
        />
      </div>
    </div>
  );
}

Content.propTypes = {
  continueShoppingUrl: PropTypes.string.isRequired
};

export default function NotFound({ continueShoppingUrl }) {
  return (
    <div className="page-width mt-10">
      <div className="pt-6">
        <Area
          id="notfound-page"
          coreComponents={[
            {
              component: { default: Name },
              props: {},
              sortOrder: 10,
              id: 'notfound-page-title'
            },
            {
              component: { default: Content },
              props: { continueShoppingUrl },
              sortOrder: 20,
              id: 'notfound-page-content'
            }
          ]}
        />
      </div>
    </div>
  );
}

NotFound.propTypes = {
  continueShoppingUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    continueShoppingUrl: url(routeId: "homepage")
  }
`;
