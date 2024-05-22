import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import Area from '@components/common/Area';
import { Form } from '@components/common/form/Form';
import SettingMenu from '@components/admin/setting/SettingMenu';
import { Field } from '@components/common/form/Field';
import { Card } from '@components/admin/cms/Card';

export default function AgeSetting({ saveSettingApi, setting: { minAge } }) {
  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-2 grid-flow-row ">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4">
          <Form
            id="ageSettingForm"
            method="POST"
            action={saveSettingApi}
            onSuccess={(response) => {
              if (!response.error) {
                toast.success('Setting saved');
              } else {
                toast.error(response.error.message);
              }
            }}
          >
            <Card title="Age Setting">
              <Card.Session>
                <Area
                  id="ageSetting"
                  className="grid gap-2"
                  coreComponents={[
                    {
                      component: {
                        default: Field
                      },
                      props: {
                        name: 'minAge',
                        placeHolder: 'Minimum Age',
                        label: 'Minimum Age',
                        type: 'text',
                        value: minAge,
                        validationRules: ['notEmpty']
                      }
                    }
                  ]}
                />
              </Card.Session>
            </Card>
          </Form>
        </div>
      </div>
    </div>
  );
}

AgeSetting.propTypes = {
  saveSettingApi: PropTypes.string.isRequired,
  setting: PropTypes.shape({
    minAge: PropTypes.number.isRequired
  }).isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    saveSettingApi: url(routeId: "saveSetting"),
    setting {
      minAge
    }
  }
`;
