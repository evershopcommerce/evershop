import { SettingMenu } from '@components/admin/SettingMenu.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import {
  AddressSection,
  type CountryOption,
  type CustomerAddressSettingValues
} from './components/AddressSection.js';

/**
 * Settings → Customer: what your customers are asked for. One form, one card,
 * sections registered into Area `customerSettingSections` — Addresses is the
 * first; a module adds another section with `layout = { areaId:
 * 'customerSettingSections', sortOrder }` on the `customerSetting` route and
 * its fields post with the same Save button (the generic `saveSetting` upsert
 * takes any setting rows).
 */
interface CustomerSettingProps {
  saveSettingApi: string;
  countries: CountryOption[];
  setting: CustomerAddressSettingValues;
}

export default function CustomerSetting({
  saveSettingApi,
  countries,
  setting
}: CustomerSettingProps) {
  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-5 grid-flow-row ">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4">
          <Form
            method="POST"
            id="customerSetting"
            action={saveSettingApi}
            submitBtn={false}
          >
            <Card>
              <CardHeader>
                <CardTitle>{_('Customer Settings')}</CardTitle>
                <CardDescription>
                  {_('Rules for customer accounts, checkout and addresses')}
                </CardDescription>
              </CardHeader>
              <Area
                id="customerSettingSections"
                noOuter
                coreComponents={[
                  {
                    id: 'addresses',
                    component: { default: AddressSection },
                    props: { setting, countries },
                    sortOrder: 10
                  }
                ]}
              />
              <CardFooter>
                <div className="flex justify-end w-full">
                  <Button type="submit" form="customerSetting">
                    {_('Save Settings')}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </Form>
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
    saveSettingApi: url(routeId: "saveSetting")
    countries(scope: ALL) {
      code
      name
    }
    setting {
      addressNameFormat
      addressTelephone
      addressOrganization
      addressLine2
      addressLine3
      addressRequired
      addressDefaultCountry
    }
  }
`;
