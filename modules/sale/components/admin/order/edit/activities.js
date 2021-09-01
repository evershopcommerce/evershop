import React from "react";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";
import { DateTime } from "luxon";

export default function Activities() {
    const context = useAppState();
    let activities = get(context, "order.activities", []);
    let dailyActivities = [];
    activities.forEach(element => {
        let current = dailyActivities[dailyActivities.length - 1];
        let date = DateTime.fromSQL(element.created_at, { zone: "UTC" }).setLocale(get(context, "shop.language", 'en')).setZone(get(context, "shop.timezone", 'UTC')).toFormat("LLL dd yyyy");
        if (!current) {
            dailyActivities.push({
                date: DateTime.fromSQL(element.created_at, { zone: "UTC" }).setLocale(get(context, "shop.language", 'en')).setZone(get(context, "shop.timezone", 'UTC')).toFormat("LLL dd"),
                activities: [
                    {
                        comment: element.comment,
                        customer_notified: element.customer_notified,
                        time: DateTime.fromSQL(element.created_at, { zone: "UTC" }).setLocale(get(context, "shop.language", 'en')).setZone(get(context, "shop.timezone", 'UTC')).toFormat("t")
                    }
                ]
            })
        } else {
            if (date === current.date) {
                current.activities.push(
                    {
                        comment: element.comment,
                        customer_notified: element.customer_notified,
                        time: DateTime.fromSQL(element.created_at, { zone: "UTC" }).setLocale(get(context, "shop.language", 'en')).setZone(get(context, "shop.timezone", 'UTC')).toFormat("t")
                    }
                )
            } else {
                dailyActivities.push({
                    date: DateTime.fromSQL(element.created_at, { zone: "UTC" }).setLocale(get(context, "shop.language", 'en')).setZone(get(context, "shop.timezone", 'UTC')).toFormat("LLL dd"),
                    activities: [
                        {
                            comment: element.comment,
                            customer_notified: element.customer_notified,
                            time: DateTime.fromSQL(element.created_at, { zone: "UTC" }).setLocale(get(context, "shop.language", 'en')).setZone(get(context, "shop.timezone", 'UTC')).toFormat("t")
                        }
                    ]
                })
            }
        }
    });

    return <div className='order-activities'>
        <h3 className="title">Activities</h3>
        <ul>
            {dailyActivities.map((group, i) => {
                return <li key={i} className='group'>
                    <span>{group.date}</span>
                    <ul>
                        {group.activities.map((a, k) => {
                            return <li key={k} className="flex items-center">
                                <span className='dot'></span>
                                <div className='comment'>
                                    <span>{a.comment}</span>
                                    {parseInt(a.customer_notified) === 1 && <span className='customer-notified'>Customer was notified</span>}
                                </div>
                                <span className='time'>{a.time}</span>
                            </li>
                        })}
                    </ul>
                </li>
            })}
        </ul>
    </div>
}