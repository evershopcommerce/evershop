/* eslint-disable camelcase */
import PropTypes from 'prop-types';
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { toast } from 'react-toastify';
import Dot from '@components/common/Dot';
import { Card } from '@components/admin/cms/Card';
import './Lifetimesales.scss';

const COLORS = ['#aee9d1', '#fed3d1', '#a4e8f2'];

export default function LifetimeSale({ api }) {
  const [data, setData] = React.useState({});
  const [fetching, setFetching] = React.useState(true);
  const { orders, total, completed_percentage, cancelled_percentage } = data;

  const chartData = [
    { name: 'Completed', value: completed_percentage },
    { name: 'Cancelled', value: cancelled_percentage },
    {
      name: 'Others',
      value: 100 - completed_percentage - cancelled_percentage
    }
  ];

  React.useEffect(() => {
    if (window !== undefined) {
      fetch(api, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
        .then((response) => response.json())
        .then((json) => {
          setData(json);
          setFetching(false);
        })
        .catch((error) => {
          toast.error(error.message);
        });
    }
  }, []);

  if (fetching) {
    return (
      <Card title="Lifetime Sales">
        <Card.Session>
          <div className="skeleton-wrapper-lifetime">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        </Card.Session>
        <Card.Session>
          <div className="skeleton-wrapper-lifetime">
            <div className="skeleton-chart" />
          </div>
        </Card.Session>
      </Card>
    );
  } else {
    return (
      <Card title="Lifetime Sales">
        <Card.Session>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex space-x-4 items-center">
              <Dot variant="info" />
              <div className="self-center">{orders} orders</div>
            </div>
            <div className="flex space-x-4 items-center">
              <Dot variant="info" />
              <div className="self-center">{total} lifetime sale</div>
            </div>
            <div className="flex space-x-4 items-center">
              <Dot variant="success" />
              <div className="self-center">
                {completed_percentage}% of orders completed
              </div>
            </div>
            <div className="flex space-x-4 items-center">
              <Dot variant="critical" />
              <div className="self-center">
                {cancelled_percentage}% of orders cancelled
              </div>
            </div>
          </div>
        </Card.Session>
        <Card.Session>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  labelLine={false}
                  fill="#8884d8"
                  dataKey="value"
                  label
                >
                  {
                    // eslint-disable-next-line react/no-array-index-key
                    chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))
                  }
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card.Session>
      </Card>
    );
  }
}

LifetimeSale.propTypes = {
  api: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'rightSide',
  sortOrder: 10
};

export const query = `
  query Query {
    api: url(routeId: "lifetimesales")    
  }
`;
