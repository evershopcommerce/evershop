import React from 'react';
import PropTypes from 'prop-types';
import Zone from './Zone';

export function Zones({ countries, getZones, zones }) {
  return (
    <>
      {zones.map((zone) => <Zone zone={zone} getZones={getZones} countries={countries} />)}
    </>
  );
}

Zones.propTypes = {
  countries: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      provinces: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.string.isRequired,
          label: PropTypes.string.isRequired
        })
      )
    })
  ).isRequired,
  zones: PropTypes.arrayOf(
    PropTypes.shape({
      uuid: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      country: PropTypes.string.isRequired,
      provinces: PropTypes.arrayOf(PropTypes.string).isRequired,
      methods: PropTypes.arrayOf(
        PropTypes.shape({
          uuid: PropTypes.string.isRequired,
          name: PropTypes.string.isRequired
        })
      ).isRequired
    })
  ).isRequired,
  getZones: PropTypes.func.isRequired
};
