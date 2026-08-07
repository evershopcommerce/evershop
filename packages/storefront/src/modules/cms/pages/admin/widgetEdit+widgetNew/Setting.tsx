import { Card } from '@components/admin/Card.js';
import Area from '@components/common/Area.js';
import React from 'react';

interface SettingProps {
  type: {
    code: string;
    name: string;
  };
}

export default function Setting({ type }: SettingProps) {
  const areaId = `widget_setting_form`;
  return (
    <Card title={`${type.name} widget setting`}>
      <Card.Session>
        <Area id={areaId} noOurter />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 30
};

export const query = `
  query Query {
    type: widgetType(code: getContextValue('type', null)) {
      code
      name
    }
  }
`;
