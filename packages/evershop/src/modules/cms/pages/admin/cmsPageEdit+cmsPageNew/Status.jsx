import PropTypes from 'prop-types';
import React from 'react';
import { Toggle } from '@components/common/form/fields/Toggle';

export default function Status({ cmsPage }) {
  return (
    <div className="form-field-container">
      <Toggle
        id="status"
        name="status"
        label="Status"
        value={cmsPage?.status}
      />
    </div>
  );
}

Status.propTypes = {
  cmsPage: PropTypes.shape({
    status: PropTypes.number,
    includeInNave: PropTypes.number
  })
};

Status.defaultProps = {
  cmsPage: null
};

export const layout = {
  areaId: 'pageEditGeneral',
  sortOrder: 15
};

export const query = `
  query Query {
    cmsPage(id: getContextValue("cmsPageId", null)) {
      status
    }
  }
`;
