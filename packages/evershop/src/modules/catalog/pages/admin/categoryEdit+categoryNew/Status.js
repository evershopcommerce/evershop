import PropTypes from 'prop-types';
import React from 'react';
import { Field } from '../../../../../lib/components/form/Field';
import { Card } from '../../../../cms/components/admin/Card';

export default function Status({
  category
}) {
  return (
    <Card
    >
      <Card.Session title={'Status'}>
        <Field
          type='radio'
          name='status'
          options={[{ value: 0, text: 'Disabled' }, { value: 1, text: 'Enabled' }]}
          value={category?.status || 1}
        />
      </Card.Session>
      <Card.Session title={'Include In Store Menu'}>
        <Field
          type='radio'
          name='include_in_nav'
          options={[{ value: 0, text: 'No' }, { value: 1, text: 'Yes' }]}
          value={category?.includeInNav || 1}
        />
      </Card.Session>
    </Card>
  );
}

Status.propTypes = {
  category: PropTypes.shape({
    status: PropTypes.number,
    includeInNave: PropTypes.number
  })
};

export const layout = {
  areaId: 'rightSide',
  sortOrder: 15
}

export const query = `
  query Query {
    category(id: getContextValue("categoryId", null)) {
      status
      includeInNav
    }
  }
`;