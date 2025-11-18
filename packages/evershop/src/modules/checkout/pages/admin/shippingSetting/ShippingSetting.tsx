import { Card } from '@components/admin/Card.js';
import { SettingMenu } from '@components/admin/SettingMenu.js';
import Button from '@components/common/Button.js';
import React from 'react';
import { Zones } from './shippingSetting/Zones.js';

export default function ShippingSetting({
  createShippingZoneApi
}: {
  createShippingZoneApi: string;
}) {
  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-5 grid-flow-row ">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4">
          <Card>
            <Card.Session title="Shipping">
              <div>
                Choose where you ship and how much you charge for shipping.
              </div>
            </Card.Session>
            <Zones createShippingZoneApi={createShippingZoneApi} />
          </Card>
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    createShippingZoneApi: url(routeId: "createShippingZone")
  }
`;
