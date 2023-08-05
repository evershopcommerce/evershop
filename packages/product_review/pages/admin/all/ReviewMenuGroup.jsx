import PropTypes from 'prop-types';
import React from 'react';
import ChatIcon from '@heroicons/react/solid/esm/ChatIcon';
import NavigationItemGroup from '@components/admin/cms/NavigationItemGroup';

export default function ReviewMenuGroup({ reviewGrid }) {
  return (
    <NavigationItemGroup
      id="reviewMenuGroup"
      name="Product Review"
      items={[
        {
          Icon: ChatIcon,
          url: reviewGrid,
          title: 'Reviews'
        }
      ]}
    />
  );
}

ReviewMenuGroup.propTypes = {
  reviewGrid: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 40
};

export const query = `
  query Query {
    reviewGrid: url(routeId:"reviewGrid")
  }
`;
