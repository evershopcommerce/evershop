import { Card } from '@components/admin/cms/Card';
import PropTypes from 'prop-types';
import React from 'react';

export default function AgeSettingMenu({ ageSettingUrl }) {
  return (
    <Card.Session title={<a href={ageSettingUrl}>Age Setting</a>}>
      <div>Configure the minimum age to access the site</div>
    </Card.Session>
  );
}

AgeSettingMenu.propTypes = {
  ageSettingUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 50
};

export const query = `
  query Query {
    ageSettingUrl: url(routeId: "ageSetting")
  }
`;
