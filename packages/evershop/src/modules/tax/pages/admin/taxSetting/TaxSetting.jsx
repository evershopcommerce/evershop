import PropTypes from 'prop-types';
import React from 'react';
import { useQuery } from 'urql';
import { Card } from '@components/admin/cms/Card';
import SettingMenu from '@components/admin/setting/SettingMenu';
import Button from '@components/common/form/Button';
import { useModal } from '@components/common/modal/useModal';
import TaxClassForm from '@components/admin/tax/taxSetting/TaxClassForm';
import Spinner from '@components/common/Spinner';
import { TaxClasses } from '@components/admin/tax/taxSetting/TaxClasses';
import { Form } from '@components/common/form/Form';
import { Field } from '@components/common/form/Field';
import { toast } from 'react-toastify';

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
`;

export default function TaxSetting({
  createTaxClassApi,
  saveSettingApi,
  setting
}) {
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
        <div className="grid grid-cols-6 gap-x-2 grid-flow-row ">
          <div className="col-span-2">
            <SettingMenu />
          </div>
          <div className="col-span-4">
            <Spinner />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-2 grid-flow-row ">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4 grid grid-cols-1 gap-2">
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
                onSuccess={(response) => {
                  if (response.error) {
                    toast.error(response.error.message);
                  } else {
                    toast.success('Tax setting has been saved successfully!');
                  }
                }}
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Field
                      type="select"
                      name="defaultShippingTaxClassId"
                      label="Shipping tax class"
                      value={setting.defaultShippingTaxClassId}
                      placeholder="None"
                      disableDefaultOption={false}
                      options={[
                        {
                          value: -1,
                          text: 'Proportional allocation based on cart items'
                        },
                        {
                          value: 0,
                          text: 'Higest tax rate based on cart items'
                        }
                      ].concat(
                        taxClassesQueryData.data.taxClasses.map((taxClass) => ({
                            value: taxClass.taxClassId,
                            text: taxClass.name
                          })) || []
                      )}
                    />
                  </div>
                  <div>
                    <Field
                      type="select"
                      name="baseCalculationAddress"
                      label="Base calculation address"
                      value={setting.baseCalculationAddress}
                      options={[
                        {
                          value: 'shippingAddress',
                          text: 'Shipping address'
                        },
                        {
                          value: 'billingAddress',
                          text: 'Billing address'
                        },
                        {
                          value: 'storeAddress',
                          text: 'Store address'
                        }
                      ]}
                    />
                  </div>
                </div>
              </Form>
            </Card.Session>
          </Card>
          <Card title="Tax classes">
            <TaxClasses
              classes={taxClassesQueryData.data.taxClasses}
              countries={countriesQueryData.data.countries}
              getTaxClasses={reexecuteQuery}
            />
            <Card.Session>
              <div>
                <Button
                  title="Create new tax class"
                  variant="primary"
                  onAction={() => modal.openModal()}
                />
              </div>
            </Card.Session>
          </Card>
        </div>
      </div>
      {modal.state.showing && (
        <div className={modal.className} onAnimationEnd={modal.onAnimationEnd}>
          <div
            className="modal-wrapper flex self-center justify-center items-center"
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal">
              <TaxClassForm
                method="POST"
                saveTaxClassApi={createTaxClassApi}
                closeModal={() => modal.closeModal()}
                getTaxClasses={reexecuteQuery}
                class={{}}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

TaxSetting.propTypes = {
  createTaxClassApi: PropTypes.string.isRequired,
  saveSettingApi: PropTypes.string.isRequired,
  setting: PropTypes.shape({
    defaultProductTaxClassId: PropTypes.string,
    defaultShippingTaxClassId: PropTypes.string,
    baseCalculationAddress: PropTypes.string
  }).isRequired
};

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
