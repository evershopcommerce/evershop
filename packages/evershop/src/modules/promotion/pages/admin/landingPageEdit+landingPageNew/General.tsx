import { InputField } from '@components/common/form/InputField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import './General.scss';

interface LandingPageGeneralProps {
  landingPage?: {
    name?: string;
    description?: string;
  };
}

export default function General({ landingPage }: LandingPageGeneralProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('General Information')}</CardTitle>
        <CardDescription>
          {_('Provide the basic information for the landing page.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <InputField
            name="name"
            label={_('Name')}
            placeholder={_('Enter landing page name')}
            defaultValue={landingPage?.name}
            required
            validation={{ required: _('Name is required') }}
            helperText={_(
              'The internal name of the landing page shown in the admin panel.'
            )}
          />
          <TextareaField
            name="description"
            label={_('Description')}
            placeholder={_('Enter description')}
            defaultValue={landingPage?.description}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
};

export const query = `
  query Query {
    landingPage(id: getContextValue("landingPageId", null)) {
      name
      description
    }
  }
`;
