import Button from '@components/common/Button.js';
import { useAlertContext } from '@components/common/modal/Alert.js';
import React from 'react';

interface WidgetType {
  code: string;
  name: string;
  description: string;
  createWidgetUrl: string;
}
const WidgetTypes: React.FC<{
  types: Array<WidgetType>;
}> = ({ types }) => {
  return (
    <div className="grid grid-cols-3 gap-2">
      {types.map((type) => (
        <a
          key={type.code}
          href={type.createWidgetUrl}
          className="border border-gray-200 rounded p-2 text-center"
        >
          <div className="text-base font-bold">{type.name}</div>
        </a>
      ))}
    </div>
  );
};

interface NewWidgetButtonProps {
  widgetTypes: Array<WidgetType>;
}

export default function NewWidgetButton({ widgetTypes }: NewWidgetButtonProps) {
  const { openAlert, closeAlert } = useAlertContext();
  return (
    <Button
      title="New Widget"
      onAction={() => {
        openAlert({
          heading: `Select type`,
          content: <WidgetTypes types={widgetTypes} />,
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          }
        });
      }}
    />
  );
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    widgetTypes {
      code
      name
      description
      createWidgetUrl
    }
  }
`;
