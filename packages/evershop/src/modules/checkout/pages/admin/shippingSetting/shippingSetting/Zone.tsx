import { Card } from '@components/admin/Card.js';
import { Modal } from '@components/common/modal/Modal.js';
import { useModal } from '@components/common/modal/useModal.js';
import { MapPinIcon } from '@heroicons/react/24/solid';
import axios from 'axios';
import React from 'react';
import { toast } from 'react-toastify';
import { ShippingMethod } from './Method.js';
import { Methods } from './Methods.js';
import { ZoneForm } from './ZoneForm.js';

export interface ShippingZone {
  name: string;
  uuid: string;
  country?: {
    name: string;
    code: string;
  };
  provinces: Array<{
    name: string;
    code: string;
  }>;
  methods: Array<ShippingMethod>;
  addMethodApi: string;
  deleteApi: string;
  updateApi: string;
}

export interface ZoneProps {
  zone: ShippingZone;
  reload: () => void;
}

function Zone({ zone, reload }: ZoneProps) {
  const modal = useModal();
  return (
    <Card.Session
      title={
        <div className="flex justify-between items-center gap-5">
          <div>{zone.name}</div>
          <div className="flex justify-between gap-5">
            <a
              href="#"
              className="text-interactive"
              onClick={(e) => {
                e.preventDefault();
                modal.open();
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
        <div className="flex justify-start items-center border-divider mt-5">
          <div className="p-5">
            <MapPinIcon width={25} height={25} fill="#008060" />
          </div>
          <div className="flex-grow px-2">
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
        <div className="flex justify-start items-center border-divider mt-5">
          <div className="flex-grow px-2">
            <Methods
              methods={zone.methods}
              reload={reload}
              addMethodApi={zone.addMethodApi}
            />
          </div>
        </div>
      </div>
      <Modal
        title={`Edit Zone: ${zone.name}`}
        onClose={modal.close}
        isOpen={modal.isOpen}
      >
        <ZoneForm
          formMethod="PATCH"
          saveZoneApi={zone.updateApi}
          onSuccess={() => modal.close()}
          reload={reload}
          zone={zone}
        />
      </Modal>
    </Card.Session>
  );
}

export { Zone };
