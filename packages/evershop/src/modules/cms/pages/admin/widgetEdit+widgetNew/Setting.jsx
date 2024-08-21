/* eslint-disable no-param-reassign */
import PropTypes from 'prop-types';
import React from 'react';
import { Card } from '@components/admin/cms/Card';
import Area from '@components/common/Area';

export default function Setting({ type }) {
  const areaId = `widget_setting_form`;
  return (
    <Card title={`${type.name} widget setting`}>
      <Card.Session>
        <Area id={areaId} noOurter />
      </Card.Session>
    </Card>
  );
}

Setting.propTypes = {
  widget: PropTypes.shape({
    urlKey: PropTypes.string,
    metaTitle: PropTypes.string,
    metaKeywords: PropTypes.string,
    metaDescription: PropTypes.string
  }),
  type: PropTypes.shape({
    code: PropTypes.string,
    name: PropTypes.string
  })
};

Setting.defaultProps = {
  widget: {},
  type: {}
};

export const layout = {
  areaId: 'leftSide',
  sortOrder: 30
};

export const query = `
  query Query {
    widget: widget(id: getContextValue('widgetId', null)) {
      name
      status
      area
      route
      settings
    }
    type: widgetType(code: getContextValue('type', null)) {
      code
      name
    }
  }
`;
