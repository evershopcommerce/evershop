import { SettingMenu } from '@components/admin/SettingMenu.js';
import Spinner from '@components/admin/Spinner.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@components/common/ui/Dialog.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useQuery } from 'urql';
import { TaxClasses } from './components/TaxClasses.js';
import { TaxClassForm } from './components/TaxClassForm.js';

const CountriesQuery = `
  query Country($countries: [String]) {
    countries (countries: $countries) {
      value: code
      label: name
      provinces {
        value: code
        label: name
      }
    }
  }
`;

const TaxClassesQuery = `
  query TaxClasses {
    taxClasses {
      items {
        taxClassId
        uuid
        name
        rates {
          taxRateId
          uuid
          name
          rate
          isCompound
          country
          province
          postcode
          priority
          updateApi
          deleteApi
        }
        addRateApi
      }
    }
  }
`;

interface TaxSettingProps {
  createTaxClassApi: string;
  saveSettingApi: string;
  setting: {
    defaultProductTaxClassId?: number;
    defaultShippingTaxClassId?: number;
    baseCalculationAddress?: string;
    pricingRounding?: string;
    pricingPrecision?: number;
    taxRounding?: string;
    taxPrecision?: number;
    taxRoundLevel?: string;
    priceIncludingTax?: boolean;
  };
}
export default function TaxSetting({
  createTaxClassApi,
  saveSettingApi,
  setting
}: TaxSettingProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [countriesQueryData] = useQuery({
    query: CountriesQuery
  });

  const [taxClassesQueryData, reexecuteQuery] = useQuery({
    query: TaxClassesQuery
  });

  const roundingOptions = [
    { value: 'round', label: _('Nearest') },
    { value: 'ceil', label: _('Round up') },
    { value: 'floor', label: _('Round down') }
  ];
  const roundLevelOptions = [
    { value: 'total', label: _('Order total') },
    { value: 'line', label: _('Line item') },
    { value: 'unit', label: _('Per unit') }
  ];

  if (countriesQueryData.fetching || taxClassesQueryData.fetching) {
    return (
      <div className="main-content-inner">
        <div className="grid grid-cols-6 gap-x-5 grid-flow-row ">
          <div className="col-span-2">
            <SettingMenu />
          </div>
          <div className="col-span-4">
            <Card>
              <CardContent>
                <Spinner width={30} height={30} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-5 grid-flow-row ">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4 grid grid-cols-1 gap-5">
          <Card>
            <CardHeader>
              <CardTitle>{_('Price rounding')}</CardTitle>
              <CardDescription>
                {_('How every monetary amount is rounded across the store.')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form
                id="pricingRoundingConfig"
                method="POST"
                action={saveSettingApi}
                successMessage={_(
                  'Pricing settings have been saved successfully!'
                )}
              >
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <SelectField
                      name="pricingRounding"
                      label={_('Rounding mode')}
                      defaultValue={setting.pricingRounding || 'round'}
                      options={roundingOptions}
                      helperText={_(
                        'The direction used when rounding prices to the decimal precision.'
                      )}
                    />
                  </div>
                  <div>
                    <InputField
                      type="number"
                      name="pricingPrecision"
                      label={_('Decimal precision')}
                      defaultValue={setting.pricingPrecision ?? 2}
                      min={0}
                      helperText={_(
                        'Number of decimal places prices are rounded to.'
                      )}
                    />
                  </div>
                </div>
              </Form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{_('Tax calculation configuration')}</CardTitle>
              <CardDescription>
                {_(
                  'Configure the tax classes that will be available to your customers at checkout.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent title={_('Basic configuration')}>
              <Form
                id="taxBasicConfig"
                method="POST"
                action={saveSettingApi}
                successMessage={_('Tax setting has been saved successfully!')}
              >
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <SelectField
                      name="defaultShippingTaxClassId"
                      label={_('Shipping tax class')}
                      defaultValue={setting.defaultShippingTaxClassId}
                      placeholder={_('None')}
                      options={[
                        {
                          value: -1,
                          label: _(
                            'Proportional allocation based on cart items'
                          )
                        },
                        {
                          value: 0,
                          label: _('Higest tax rate based on cart items')
                        }
                      ].concat(
                        taxClassesQueryData.data.taxClasses.items.map(
                          (taxClass) => ({
                            value: taxClass.taxClassId,
                            label: taxClass.name
                          })
                        ) || []
                      )}
                      helperText={_(
                        'This is the tax class applied to shipping costs.'
                      )}
                    />
                  </div>
                  <div>
                    <SelectField
                      name="baseCalculationAddress"
                      label={_('Base calculation address')}
                      defaultValue={
                        setting.baseCalculationAddress || 'shippingAddress'
                      }
                      options={[
                        {
                          value: 'shippingAddress',
                          label: _('Shipping address')
                        },
                        {
                          value: 'billingAddress',
                          label: _('Billing address')
                        },
                        {
                          value: 'storeAddress',
                          label: _('Store address')
                        }
                      ]}
                      helperText={_(
                        'This is the address used to calculate tax rates.'
                      )}
                    />
                  </div>
                  <div>
                    <SelectField
                      name="taxRounding"
                      label={_('Tax rounding mode')}
                      defaultValue={setting.taxRounding || 'round'}
                      options={roundingOptions}
                      helperText={_(
                        'The direction used when rounding the calculated tax amount.'
                      )}
                    />
                  </div>
                  <div>
                    <InputField
                      type="number"
                      name="taxPrecision"
                      label={_('Tax decimal precision')}
                      defaultValue={setting.taxPrecision ?? 2}
                      min={0}
                      helperText={_(
                        'Number of decimal places the tax amount is rounded to.'
                      )}
                    />
                  </div>
                  <div>
                    <SelectField
                      name="taxRoundLevel"
                      label={_('Tax rounding level')}
                      defaultValue={setting.taxRoundLevel || 'total'}
                      options={roundLevelOptions}
                      helperText={_(
                        'Where tax rounding is applied: per unit, per line, or on the order total.'
                      )}
                    />
                  </div>
                  <div>
                    <ToggleField
                      name="priceIncludingTax"
                      label={_('Catalog prices include tax')}
                      defaultValue={setting.priceIncludingTax ?? false}
                      helperText={_(
                        'Enable when the product prices you enter already include tax.'
                      )}
                    />
                  </div>
                </div>
              </Form>
            </CardContent>
          </Card>
          <Card title={_('Tax classes')}>
            <CardHeader>
              <CardTitle>{_('Tax classes')}</CardTitle>
              <CardDescription>
                {_('Manage tax classes and tax rates for different regions.')}
              </CardDescription>
            </CardHeader>
            <TaxClasses
              classes={taxClassesQueryData.data.taxClasses.items}
              getTaxClasses={reexecuteQuery}
            />
            <CardContent>
              <div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger>
                    <Button
                      title={_('Create new tax class')}
                      variant="outline"
                      onClick={() => setDialogOpen(true)}
                    >
                      {_('Create new tax class')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{_('Create New Tax Class')}</DialogTitle>
                    </DialogHeader>
                    <TaxClassForm
                      saveTaxClassApi={createTaxClassApi}
                      closeModal={() => setDialogOpen(false)}
                      getTaxClasses={reexecuteQuery}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
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
    createTaxClassApi: url(routeId: "createTaxClass")
    saveSettingApi: url(routeId: "saveSetting")
    setting {
      defaultProductTaxClassId
      defaultShippingTaxClassId
      baseCalculationAddress
      pricingRounding
      pricingPrecision
      taxRounding
      taxPrecision
      taxRoundLevel
      priceIncludingTax
    }
  }
`;
