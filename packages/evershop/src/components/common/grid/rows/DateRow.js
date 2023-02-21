import React from 'react';
import PropTypes from 'prop-types';
import { DateTime } from 'luxon';
import { useAppState } from '@components/common/context/app';
import { get } from '@evershop/evershop/src/lib/util/get';

export default function DateRow({ id, areaProps }) {
  const context = useAppState();
  const date = DateTime.fromSQL(areaProps.row[id], { zone: 'UTC' });

  return (
    <td>
      <div>
        <span>
          {date.isValid
            ? date
                .setLocale(get(context, 'shop.language', 'en'))
                .setZone(get(context, 'shop.timezone', 'UTC'))
                .toFormat('LLL dd yyyy')
            : '--'}
        </span>
      </div>
    </td>
  );
}

DateRow.propTypes = {
  areaProps: PropTypes.shape({
    row: PropTypes.shape({
      id: PropTypes.string
    })
  }).isRequired,
  id: PropTypes.string.isRequired
};
