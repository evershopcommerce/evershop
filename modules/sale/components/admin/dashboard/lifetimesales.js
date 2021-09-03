import React from "react";
import { PieChart, Pie, Cell } from "recharts";
import { useAppState } from "../../../../../lib/context/app";
import { Card } from "../../../../cms/components/admin/card";
import Dot from "../../../../../lib/components/Dot";

export default function LifetimeSale() {
    const context = useAppState();
    const currency = context.currency || "USD";
    const { orders, total, completed_percentage, cancelled_percentage } = context.lifetimeSales || {};
    const _total = new Intl.NumberFormat("en", { style: "currency", currency: currency }).format(total);
    const data = [
        { name: "Completed", value: completed_percentage },
        { name: "Cancelled", value: cancelled_percentage },
        { name: "Others", value: 100 - completed_percentage - cancelled_percentage }
    ];
    const COLORS = ["#058C8C", "#dc3545", "#E1E1E1"];

    return <Card title="Lifetime Sale">
        <Card.Session>
            <div className='grid grid-cols-1 gap-1'>
                <div className='flex space-x-1 items-center'>
                    <Dot variant="primary" />
                    <div className='self-center'>{orders} orders</div>
                </div>
                <div className='flex space-x-1 items-center'>
                    <Dot variant="primary" />
                    <div className='self-center'>{_total} lifetime sale</div>
                </div>
                <div className='flex space-x-1 items-center'>
                    <Dot variant="primary" />
                    <div className='self-center'>{completed_percentage}% of orders completed</div>
                </div>
                <div className='flex space-x-1 items-center'>
                    <Dot variant="primary" />
                    <div className='self-center'>{cancelled_percentage}% of orders cancelled</div>
                </div>
            </div>
        </Card.Session>
        <Card.Session>
            <PieChart width={200} height={200}>
                <Pie
                    data={data}
                    cx={200}
                    cy={200}
                    labelLine={false}
                    outerRadius={35}
                    fill="#8884d8"
                    dataKey="value"
                >
                    {
                        data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)
                    }
                </Pie>
            </PieChart>
        </Card.Session>
    </Card>;
}