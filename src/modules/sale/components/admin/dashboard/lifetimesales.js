import React from "react";
import { PieChart, Pie, Cell } from "recharts";
import { appContext } from "../../../../../lib/context/app";

export default function LifetimeSale() {
    const context = React.useContext(appContext);
    const currency = context.currency || "USD";
    const { orders, total, completed_percentage, cancelled_percentage } = context.lifetimeSales || {};
    const _total = new Intl.NumberFormat("en", { style: "currency", currency: currency }).format(total);
    const data = [
        { name: "Completed", value: completed_percentage },
        { name: "Cancelled", value: cancelled_percentage },
        { name: "Others", value: 100 - completed_percentage - cancelled_percentage }
    ];
    const COLORS = ["#058C8C", "#dc3545", "#E1E1E1"];

    return <div className="sml-block lifetime-sale">
        <table className="table">
            <tbody>
                <tr>
                    <td>
                        <div className="title"><span className="text-primary">Number of orders</span></div>
                    </td>
                    <td>
                        <div className="value text-primary"><span>{orders} orders</span></div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div className="title"><span className="text-primary">Lifetime sales</span></div>
                    </td>
                    <td>
                        <div className="value text-primary"><span>{_total}</span></div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <span className="title text-primary">{completed_percentage}% completed</span>
                        <span className="title text-danger">{cancelled_percentage}% cancelled</span>
                    </td>
                    <td>
                        <div className="value">
                            <PieChart width={80} height={80}>
                                <Pie
                                    data={data}
                                    cx={30}
                                    cy={30}
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
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>;
}