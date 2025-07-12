import WidgetTypes from '@components/admin/cms/widget/WidgetTypes';
import Button from '@components/common/form/Button';
import { useAlertContext } from '@components/common/modal/Alert';
import PropTypes from 'prop-types';
import React from 'react';

export default function NewWidgetButton({ widgetTypes }) {
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

NewWidgetButton.propTypes = {
  widgetTypes: PropTypes.arrayOf(
    PropTypes.shape({
      code: PropTypes.string,
      name: PropTypes.string,
      description: PropTypes.string,
      createWidgetUrl: PropTypes.string
    })
  ).isRequired
};

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
