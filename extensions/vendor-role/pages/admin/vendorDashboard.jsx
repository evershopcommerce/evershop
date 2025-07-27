import React, { useEffect, useState } from 'react';
import { useRequest } from '@evershop/evershop/lib/util';

export default function VendorDashboard() {
  const [data, setData] = useState({ productCount: 0 });
  const req = useRequest();

  useEffect(() => {
    req.get('/vendor/stats').then(setData);
  }, []);

  return (
    <div>
      <h1>Vendor Dashboard</h1>
      <p>Your total products: {data.productCount}</p>
    </div>
  );
}
