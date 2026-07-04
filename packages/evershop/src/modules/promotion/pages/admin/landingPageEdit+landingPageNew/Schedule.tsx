import { DateTimeLocalField } from '@components/common/form/DateTimeLocalField.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useFormContext } from 'react-hook-form';

interface LandingPageScheduleProps {
  landingPage?: {
    publishStart?: { text?: string } | null;
    publishEnd?: { text?: string } | null;
  };
}

export default function Schedule({ landingPage }: LandingPageScheduleProps) {
  const { setValue } = useFormContext();

  // DateTimeLocalField renders a controlled Controller field without any
  // `defaultValue` wiring, so seed the initial values from the loaded landing
  // page once on mount. The GraphQL `text` is already in the datetime-local
  // format (`yyyy-MM-dd'T'HH:mm`).
  React.useEffect(() => {
    if (landingPage?.publishStart?.text) {
      setValue('publish_start', landingPage.publishStart.text);
    }
    if (landingPage?.publishEnd?.text) {
      setValue('publish_end', landingPage.publishEnd.text);
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('Schedule')}</CardTitle>
        <CardDescription>
          {_(
            'Control when this landing page is published. Leave empty for no limit.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <DateTimeLocalField name="publish_start" label={_('Publish start')} />
          <DateTimeLocalField name="publish_end" label={_('Publish end')} />
        </div>
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 20
};

export const query = `
  query Query {
    landingPage(id: getContextValue("landingPageId", null)) {
      publishStart {
        text(format: "yyyy-MM-dd'T'HH:mm")
      }
      publishEnd {
        text(format: "yyyy-MM-dd'T'HH:mm")
      }
    }
  }
`;
