import Area from '@components/common/Area.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
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
    <Card>
      <CardHeader>
        <CardTitle>{_('Widget Settings')}</CardTitle>
        <CardDescription>
          {_('Configure the settings for the ${name} widget.', {
            name: type.name
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Area id={areaId} noOurter />
      </CardContent>
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
