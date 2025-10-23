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
    <div className="grid grid-cols-2 gap-4 p-2">
      {types.map((type) => (
        <a
          key={type.code}
          href={type.createWidgetUrl}
          className="group relative flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-200 ease-in-out bg-white hover:bg-gray-50"
        >
          <div className="text-base font-semibold text-gray-900 group-hover:text-primary transition-colors">
            {type.name}
          </div>
          {type.description && (
            <div className="mt-2 text-sm text-gray-500 text-center">
              {type.description}
            </div>
          )}
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
