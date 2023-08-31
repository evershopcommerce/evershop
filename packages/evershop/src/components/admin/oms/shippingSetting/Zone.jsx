import React from 'react';
import PropTypes from 'prop-types';
import { Card } from '@components/admin/cms/Card';
import MapIcon from '@heroicons/react/solid/esm/LocationMarkerIcon';
import { useModal } from '@components/common/modal/useModal';
import ZoneForm from './ZoneForm';
import { Methods } from './Methods';

function Zone({ zone, countries, getZones }) {
  const modal = useModal();
  return (
    <Card.Session
      title={
        <div className="flex justify-between items-center gap-2">
          <div>{zone.name}</div>
          <div>
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
        </div>
      }
    >
      <div className="divide-y border rounded border-divider">
        <div className="flex justify-start items-center border-divider mt-2">
          <div className="p-2">
            <MapIcon width={25} height={25} fill="#008060" />
          </div>
          <div className="flex-grow px-1">
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
          <div className="flex-grow px-1">
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

Zone.propTypes = {
  zone: PropTypes.shape({
    name: PropTypes.string,
    country: PropTypes.shape({
      name: PropTypes.string
    }),
    provinces: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string
      })
    ),
    methods: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string
      })
    ),
    addMethodApi: PropTypes.string,
    updateApi: PropTypes.string
  }).isRequired,
  countries: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      code: PropTypes.string,
      provinces: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string,
          code: PropTypes.string
        })
      )
    })
  ).isRequired,
  getZones: PropTypes.func.isRequired
};

export default Zone;
