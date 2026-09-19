import { DateTime } from 'luxon';
import PropTypes from 'prop-types';
import React from 'react';

export default function Activities({ order: { activities = [] } }) {
  const dailyActivities = [];
  activities.forEach((element) => {
    const current = dailyActivities[dailyActivities.length - 1];
    if (!current) {
      dailyActivities.push({
        time: element.createdAt.value,
        date: element.createdAt.date,
        activities: [
          {
            comment: element.comment,
            customerNotified: element.customerNotified,
            time: element.createdAt.time
          }
        ]
      });
    } else if (
      DateTime.fromSQL(element.createdAt.value).startOf('day') ===
      DateTime.fromSQL(current.time).startOf('day')
    ) {
      current.activities.push({
        comment: element.comment,
        customerNotified: element.customerNotified,
        time: element.createdAt.time
      });
    } else {
      dailyActivities.push({
        date: element.createdAt.date,
        activities: [
          {
            comment: element.comment,
            customerNotified: element.customerNotified,
            time: element.createdAt.time
          }
        ]
      });
    }
  });

  return (
    <div className="mt-5">
      <h3 className="text-base font-semibold pb-5 border-b border-divider">
        Activities
      </h3>
      <ul className="relative py-5 mt-5 before:absolute before:content-[''] before:block before:h-full before:w-0.5 before:top-0 before:left-[0.563rem] before:bg-divider">
        {dailyActivities.map((group, i) => (
          <li key={i} className="mt-12 first:mt-0">
            <span className="uppercase pl-7 text-muted-foreground text-sm">
              {group.date}
            </span>
            <ul className="mt-5 space-y-4">
              {group.activities.map((a, k) => (
                <li key={k} className="flex items-center gap-0">
                  <span className="block w-[0.813rem] h-[0.813rem] bg-border rounded-full z-10 border-2 border-background shrink-0" />
                  <div className="flex-1 px-6">
                    <span className="block text-sm">{a.comment}</span>
                    {parseInt(a.customerNotified, 10) === 1 && (
                      <span className="block text-muted-foreground italic text-sm mt-1">
                        Customer was notified
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground text-sm shrink-0">
                    {a.time}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

Activities.propTypes = {
  order: PropTypes.shape({
    activities: PropTypes.arrayOf(
      PropTypes.shape({
        comment: PropTypes.string,
        customerNotified: PropTypes.number,
        createdAt: PropTypes.shape({
          value: PropTypes.string,
          timezone: PropTypes.string,
          date: PropTypes.string,
          time: PropTypes.string
        })
      })
    )
  }).isRequired
};

export const layout = {
  areaId: 'leftSide',
  sortOrder: 30
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      activities {
        comment
        customerNotified
        createdAt {
          value
          timezone
          date: text(format: "LLL dd")
          time: text(format: "t")
        }
      }
    }
  }
`;
