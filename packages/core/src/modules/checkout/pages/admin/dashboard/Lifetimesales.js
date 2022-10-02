/* eslint-disable camelcase */
import React from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import { useAppState } from '../../../../../lib/context/app';
import { Card } from '../../../../cms/views/admin/Card';
import Dot from '../../../../../lib/components/Dot';

export default function LifetimeSale() {
  const context = useAppState();
  const currency = context.currency || 'USD';
  const {
    orders, total, completed_percentage, cancelled_percentage
  } = context.lifetimeSales || {};
  const formatedTotal = new Intl.NumberFormat('en', { style: 'currency', currency }).format(total);
  const data = [
    { name: 'Completed', value: completed_percentage },
    { name: 'Cancelled', value: cancelled_percentage },
    { name: 'Others', value: 100 - completed_percentage - cancelled_percentage }
  ];
  const COLORS = ['#aee9d1', '#fed3d1', '#a4e8f2'];

  return (
    <Card title="Lifetime Sale">
      <Card.Session>
        <div className="grid grid-cols-1 gap-1">
          <div className="flex space-x-1 items-center">
            <Dot variant="info" />
            <div className="self-center">
              {orders}
              {' '}
              orders
            </div>
          </div>
          <div className="flex space-x-1 items-center">
            <Dot variant="info" />
            <div className="self-center">
              {formatedTotal}
              {' '}
              lifetime sale
            </div>
          </div>
          <div className="flex space-x-1 items-center">
            <Dot variant="success" />
            <div className="self-center">
              {completed_percentage}
              % of orders completed
            </div>
          </div>
          <div className="flex space-x-1 items-center">
            <Dot variant="critical" />
            <div className="self-center">
              {cancelled_percentage}
              % of orders cancelled
            </div>
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div style={{ height: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                labelLine={false}
                fill="#8884d8"
                dataKey="value"
                label
              >
                {
                  // eslint-disable-next-line react/no-array-index-key
                  data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)
                }
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card.Session>
    </Card>
  );
}
