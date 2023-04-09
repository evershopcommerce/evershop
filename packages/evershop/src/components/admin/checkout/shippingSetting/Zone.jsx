import React from 'react';
import PropTypes from 'prop-types';
import { Card } from '@components/admin/cms/Card';
import MapIcon from '@heroicons/react/solid/esm/LocationMarkerIcon';
import RateIcon from '@heroicons/react/solid/esm/CurrencyDollarIcon';
import { useModal } from '@components/common/modal/useModal';
import ZoneForm from './ZoneForm';
import { Methods } from './Methods';

Zone.propTypes = {};

function Zone({ zone, countries, getZones }) {
  const modal = useModal();
  return (
    <Card.Session>
      <div className="flex justify-between">
        <span>{zone.name}</span>
        <a
          href="#"
          className="text-interactive"
          onClick={(e) => {
            e.preventDefault();
            modal.openModal();
          }}
        >
          Edit Zone
        </a>
      </div>
      <div className="divide-y border rounded border-divider">
        <div className="flex justify-start items-center border-divider mt-2">
          <div className="p-3">
            <MapIcon width={25} height={25} fill="#008060" />
          </div>
          <div>
            <div>
              <b>{zone.country.name}</b>
            </div>
            <div>
              {zone.provinces
                .slice(0, 3)
                .map((province) => province.name)
                .join(', ')}
              {zone.provinces.length > 3 && '...'}
            </div>
          </div>
        </div>
        <div className="flex justify-start items-center border-divider mt-2">
          <div className="p-3">
            <RateIcon width={25} height={25} fill="#008060" />
          </div>
          <div>
            <Methods
              methods={zone.methods}
              getZones={getZones}
              addMethodApi={zone.addMethodApi}
            />
          </div>
        </div>
      </div>
      {modal.state.showing && (
        <div className={modal.className} onAnimationEnd={modal.onAnimationEnd}>
          <div
            className="modal-wrapper flex self-center justify-center items-center"
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal">
              <ZoneForm
                method="PATCH"
                saveZoneApi={zone.updateApi}
                countries={countries}
                closeModal={() => modal.closeModal()}
                getZones={getZones}
                zone={zone}
              />
            </div>
          </div>
        </div>
      )}
    </Card.Session>
  );
}

export default Zone;
