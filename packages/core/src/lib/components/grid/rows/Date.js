import React from 'react';
import { DateTime } from 'luxon';
import { useAppState } from '../../../context/app';
import { get } from '../../../util/get';

export default function Date() {
  const context = useAppState();
  const date = DateTime.fromSQL('2021-08-18 10:00:00', { zone: 'UTC' }).setLocale(get(context, 'shop.language', 'en')).setZone(get(context, 'shop.timezone', 'UTC')).toFormat('LLL dd yyyy');
  return (
    <td>
      <div>
        <span>{date.toString()}</span>
      </div>
    </td>
  );
}
