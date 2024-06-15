import PropTypes from 'prop-types';
import React from 'react';
import { Field } from '@components/common/form/Field';
import { Toggle } from '@components/common/form/fields/Toggle';
import { Card } from '@components/admin/cms/Card';

export default function CODPayment({
  setting: { codPaymentStatus, codDislayName }
}) {
  return (
    <Card title="Cash On Delivery Payment">
      <Card.Session>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 items-center flex">
            <h4>Enable?</h4>
          </div>
          <div className="col-span-2">
            <Toggle name="codPaymentStatus" value={codPaymentStatus} />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 items-center flex">
            <h4>Dislay Name</h4>
          </div>
          <div className="col-span-2">
            <Field
              type="text"
              name="codDislayName"
              placeholder="Dislay Name"
              value={codDislayName}
            />
          </div>
        </div>
      </Card.Session>
    </Card>
  );
}

CODPayment.propTypes = {
  setting: PropTypes.shape({
    codPaymentStatus: PropTypes.number,
    codDislayName: PropTypes.string
  }).isRequired
};

export const layout = {
  areaId: 'paymentSetting',
  sortOrder: 20
};

export const query = `
  query Query {
    setting {
      codPaymentStatus
      codDislayName
    }
  }
`;
