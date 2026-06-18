import { SettingMenu } from '@components/admin/SettingMenu.js';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { Packages } from './shippingSetting/Packages.js';
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
            <CardHeader>
              <CardTitle>{_('Shipping')}</CardTitle>
              <CardDescription>
                {_(
                  'Choose where you ship and how much you charge for shipping.'
                )}
              </CardDescription>
            </CardHeader>
            <Zones createShippingZoneApi={createShippingZoneApi} />
          </Card>
          <Card className="mt-5">
            <CardHeader>
              <CardTitle>{_('Packages')}</CardTitle>
              <CardDescription>
                {_(
                  'The boxes and envelopes you ship with. Every shippable product references one — its dimensions and empty weight drive shipping quotes and labels.'
                )}
              </CardDescription>
            </CardHeader>
            <Packages />
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
