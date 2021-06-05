import { BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import React, { useState, useEffect } from "react";

export default function SaleStatistic({ api }) {
    const [data, setData] = useState([]);
    const [period, setPeriod] = useState('daily');

    useEffect((dd) => {
        if (window !== undefined)
            fetch(api.replace("daily", period).replace("weekly", period).replace("monthly", period), {
                method: 'POST', // or 'PUT'
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            })
                .then(response => response.json())
                .then(data => {
                    setData(data);
                })
                .catch((error) => {
                    console.error('Error:', error);
                });
    }, [period]);

    return <div className="sale-statistic sml-block">
        <div className="sale-statistic-header sml-block-title sml-flex-space-between">
            <div>Sale statistic</div>
            <ul className="list-unstyled sml-flex-space-between">
                <li className="pl-3"><a onClick={() => setPeriod('daily')} className={period === 'daily' ? "btn btn-dark" : "btn btn-primary"}> Daily</a></li>
                <li className="pl-3"><a onClick={() => setPeriod('weekly')} className={period === 'weekly' ? "btn btn-dark" : "btn btn-primary"}> Weekly</a></li>
                <li className="pl-3"><a onClick={() => setPeriod('monthly')} className={period === 'monthly' ? "btn btn-dark" : "btn btn-primary"}> Monthly</a></li>
            </ul>
        </div>
        {data.length == 0 ? (null) : <BarChart
            width={660}
            height={300}
            data={data}
            margin={{
                top: 5, right: 0, left: -25, bottom: 5,
            }}
            id="asdasd"
        >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar type="monotone" dataKey="value" fill="#8884d8" />
            <Bar type="monotone" dataKey="count" fill="#82ca9d" />
        </BarChart>}
    </div>;
}