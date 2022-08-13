/* eslint-disable react/no-array-index-key */
import React from 'react';
import { DateTime } from 'luxon';
import { useAppState } from '../../../../../../lib/context/app';
import { get } from '../../../../../../lib/util/get';
import './Activities.scss';

export default function Activities() {
  const context = useAppState();
  const activities = get(context, 'order.activities', []);
  const dailyActivities = [];
  activities.forEach((element) => {
    const current = dailyActivities[dailyActivities.length - 1];
    const date = DateTime.fromSQL(element.created_at, { zone: 'UTC' }).setLocale(get(context, 'shop.language', 'en')).setZone(get(context, 'shop.timezone', 'UTC')).toFormat('LLL dd yyyy');
    if (!current) {
      dailyActivities.push({
        date: DateTime.fromSQL(element.created_at, { zone: 'UTC' }).setLocale(get(context, 'shop.language', 'en')).setZone(get(context, 'shop.timezone', 'UTC')).toFormat('LLL dd'),
        activities: [
          {
            comment: element.comment,
            customer_notified: element.customer_notified,
            time: DateTime.fromSQL(element.created_at, { zone: 'UTC' }).setLocale(get(context, 'shop.language', 'en')).setZone(get(context, 'shop.timezone', 'UTC')).toFormat('t')
          }
        ]
      });
    } else if (date === current.date) {
      current.activities.push(
        {
          comment: element.comment,
          customer_notified: element.customer_notified,
          time: DateTime.fromSQL(element.created_at, { zone: 'UTC' }).setLocale(get(context, 'shop.language', 'en')).setZone(get(context, 'shop.timezone', 'UTC')).toFormat('t')
        }
      );
    } else {
      dailyActivities.push({
        date: DateTime.fromSQL(element.created_at, { zone: 'UTC' }).setLocale(get(context, 'shop.language', 'en')).setZone(get(context, 'shop.timezone', 'UTC')).toFormat('LLL dd'),
        activities: [
          {
            comment: element.comment,
            customer_notified: element.customer_notified,
            time: DateTime.fromSQL(element.created_at, { zone: 'UTC' }).setLocale(get(context, 'shop.language', 'en')).setZone(get(context, 'shop.timezone', 'UTC')).toFormat('t')
          }
        ]
      });
    }
  });

  return (
    <div className="order-activities">
      <h3 className="title">Activities</h3>
      <ul>
        {dailyActivities.map((group, i) => (
          <li key={i} className="group">
            <span>{group.date}</span>
            <ul>
              {group.activities.map((a, k) => (
                <li key={k} className="flex items-center">
                  <span className="dot" />
                  <div className="comment">
                    <span>{a.comment}</span>
                    {parseInt(a.customer_notified, 10) === 1 && <span className="customer-notified">Customer was notified</span>}
                  </div>
                  <span className="time">{a.time}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
