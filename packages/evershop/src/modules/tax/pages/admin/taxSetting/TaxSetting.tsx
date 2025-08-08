import { Card } from '@components/admin/Card.js';
import { SettingMenu } from '@components/admin/SettingMenu.js';
import Spinner from '@components/admin/Spinner.js';
import Button from '@components/common/Button.js';
import { Form } from '@components/common/form/Form.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { Modal } from '@components/common/modal/Modal.js';
import { useModal } from '@components/common/modal/useModal.js';
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
  };
}
export default function TaxSetting({
  createTaxClassApi,
  saveSettingApi,
  setting
}: TaxSettingProps) {
  const modal = useModal();
  const [countriesQueryData] = useQuery({
    query: CountriesQuery
  });

  const [taxClassesQueryData, reexecuteQuery] = useQuery({
    query: TaxClassesQuery
  });

  if (countriesQueryData.fetching || taxClassesQueryData.fetching) {
    return (
      <div className="main-content-inner">
        <div className="grid grid-cols-6 gap-x-5 grid-flow-row ">
          <div className="col-span-2">
            <SettingMenu />
          </div>
          <div className="col-span-4">
            <Card>
              <Card.Session>
                <Spinner width={30} height={30} />
              </Card.Session>
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
            <Card.Session title="Tax">
              <div>
                Configure the tax classes that will be available to your
                customers at checkout.
              </div>
            </Card.Session>
            <Card.Session title="Basic configuration">
              <Form
                id="taxBasicConfig"
                method="POST"
                action={saveSettingApi}
                successMessage="Tax setting has been saved successfully!"
              >
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <SelectField
                      name="defaultShippingTaxClassId"
                      label="Shipping tax class"
                      defaultValue={setting.defaultShippingTaxClassId || ''}
                      placeholder="None"
                      options={[
                        {
                          value: -1,
                          label: 'Proportional allocation based on cart items'
                        },
                        {
                          value: 0,
                          label: 'Higest tax rate based on cart items'
                        }
                      ].concat(
                        taxClassesQueryData.data.taxClasses.items.map(
                          (taxClass) => ({
                            value: taxClass.taxClassId,
                            label: taxClass.name
                          })
                        ) || []
                      )}
                      helperText="This is the tax class applied to shipping costs."
                    />
                  </div>
                  <div>
                    <SelectField
                      name="baseCalculationAddress"
                      label="Base calculation address"
                      defaultValue={setting.baseCalculationAddress || ''}
                      options={[
                        {
                          value: 'shippingAddress',
                          label: 'Shipping address'
                        },
                        {
                          value: 'billingAddress',
                          label: 'Billing address'
                        },
                        {
                          value: 'storeAddress',
                          label: 'Store address'
                        }
                      ]}
                      helperText="This is the address used to calculate tax rates."
                    />
                  </div>
                </div>
              </Form>
            </Card.Session>
          </Card>
          <Card title="Tax classes">
            <TaxClasses
              classes={taxClassesQueryData.data.taxClasses.items}
              getTaxClasses={reexecuteQuery}
            />
            <Card.Session>
              <div>
                <Button
                  title="Create new tax class"
                  variant="primary"
                  onAction={() => modal.open()}
                />
              </div>
            </Card.Session>
          </Card>
        </div>
      </div>
      <Modal
        title={'Create a tax class'}
        onClose={modal.close}
        isOpen={modal.isOpen}
      >
        <TaxClassForm
          saveTaxClassApi={createTaxClassApi}
          closeModal={() => modal.close()}
          getTaxClasses={reexecuteQuery}
        />
      </Modal>
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
    }
  }
`;
