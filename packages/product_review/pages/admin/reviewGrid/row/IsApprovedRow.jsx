import PropTypes from 'prop-types';
import React from 'react';
import Dot from '@components/common/Dot';

export default function IsApprovedRow({ approved = false }) {
  return (
    <td>
      <div className="flex justify-center">
        {approved === false && <Dot variant="default" size="1.2rem" />}
        {approved === true && <Dot variant="success" size="1.2rem" />}
      </div>
    </td>
  );
}

IsApprovedRow.propTypes = {
  approved: PropTypes.bool.isRequired
};
