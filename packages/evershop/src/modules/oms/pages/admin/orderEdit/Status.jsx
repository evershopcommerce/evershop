import { Badge } from '@components/common/ui/Badge.js';
import PropTypes from 'prop-types';
import React from 'react';

export default function Status({ order: { status } }) {
  if (status) {
    return <Badge variant={status.badge}>{status.name}</Badge>;
  } else {
    return null;
  }
}

Status.propTypes = {
  order: PropTypes.shape({
    status: PropTypes.shape({
      badge: PropTypes.string,
      name: PropTypes.string
    })
  }).isRequired
};

export const layout = {
  areaId: 'pageHeadingLeft',
  sortOrder: 200
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      status {
        code
        badge
        name
      }
    }
  }
`;
