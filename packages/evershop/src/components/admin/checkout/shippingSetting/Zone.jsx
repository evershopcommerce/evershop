import React from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Card } from '@components/admin/cms/Card';
import MapIcon from '@heroicons/react/solid/esm/LocationMarkerIcon';
import { useModal } from '@components/common/modal/useModal';
import ZoneForm from '@components/admin/checkout/shippingSetting/ZoneForm';
import { Methods } from '@components/admin/checkout/shippingSetting/Methods';

function Zone({ zone, countries, getZones }) {
  const modal = useModal();
  return (
    <Card.Session
      title={
        <div className="flex justify-between items-center gap-8">
          <div>{zone.name}</div>
          <div className="flex justify-between gap-8">
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
            <a
              className="text-critical"
              href="#"
              onClick={async (e) => {
                e.preventDefault();
                try {
                  const response = await axios.delete(zone.deleteApi);
                  if (response.status === 200) {
                    // Toast success
                    toast.success('Zone removed successfully');
                    // Delay for 2 seconds
                    setTimeout(() => {
                      // Reload page
                      window.location.reload();
                    }, 1500);
                  } else {
                    // Toast error
                    toast.error('Failed to remove zone');
                  }
                } catch (error) {
                  // Toast error
                  toast.error('Failed to remove zone');
                }
              }}
            >
              Remove Zone
            </a>
          </div>
        </div>
      }
    >
      <div className="divide-y border rounded border-divider">
        <div className="flex justify-start items-center border-divider mt-8">
          <div className="p-8">
            <MapIcon width={25} height={25} fill="#008060" />
          </div>
          <div className="flex-grow px-4">
            <div>
              <b>{zone.country?.name || 'Worldwide'}</b>
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
        <div className="flex justify-start items-center border-divider mt-8">
          <div className="flex-grow px-4">
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
    deleteApi: PropTypes.string,
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
