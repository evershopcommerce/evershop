import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent
} from '@components/common/ui/Card.js';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import './Statistic.scss';
import { ButtonGroup } from '@components/common/ui/ButtonGroup.js';
import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';

export default function SaleStatistic({ api }) {
  const [data, setData] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (window !== undefined) {
      fetch(`${api}?period=${period}`, {
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
  }, [period]);

  if (fetching) {
    return (
      <Card title="Sale Statistics">
        <CardHeader>
          <CardTitle>{_('Sale Statistics')}</CardTitle>
          <CardDescription>
            {_('Overview of sales data over selected periods')}
          </CardDescription>
        </CardHeader>
        <div className="skeleton-wrapper-statistic">
          <div className="skeleton" />
        </div>
      </Card>
    );
  } else {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{_('Sale Statistics')}</CardTitle>
          <CardDescription>
            {_('Overview of sales data over selected periods')}
          </CardDescription>
          <CardAction>
            <ButtonGroup>
              <Button onClick={() => setPeriod('daily')} variant={'outline'}>
                {period === 'daily' ? (
                  <span className="text-primary">{_('Daily')}</span>
                ) : (
                  _('Daily')
                )}
              </Button>
              <Button onClick={() => setPeriod('weekly')} variant={'outline'}>
                {period === 'weekly' ? (
                  <span className="text-primary">{_('Weekly')}</span>
                ) : (
                  _('Weekly')
                )}
              </Button>
              <Button onClick={() => setPeriod('monthly')} variant={'outline'}>
                {period === 'monthly' ? (
                  <span className="text-primary">{_('Monthly')}</span>
                ) : (
                  _('Monthly')
                )}
              </Button>
            </ButtonGroup>
          </CardAction>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? null : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={data}
                margin={{
                  top: 5,
                  right: 0,
                  left: -25,
                  bottom: 5
                }}
              >
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stackId="1"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    );
  }
}

SaleStatistic.propTypes = {
  api: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
};

export const query = `
  query Query {
    api: url(routeId: "salestatistic")    
  }
`;
