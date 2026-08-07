import Spinner from '@components/admin/Spinner.jsx';
import { Modal } from '@components/common/modal/Modal.js';
import { useModal } from '@components/common/modal/useModal.js';
import React from 'react';
import { useQuery } from 'urql';
import { Zone } from './Zone.js';
import { ZoneForm } from './ZoneForm.js';

export interface ShippingCountry {
  label: string;
  value: string;
  provinces: Array<{
    label: string;
    value: string;
  }>;
}

const ZonesQuery = `
  query Zones {
    shippingZones {
      uuid
      name
      country {
        name
        code
      }
      provinces {
        name
        code
      }
      methods {
        methodId
        uuid
        name
        cost {
          text
          value
        }
        priceBasedCost {
          minPrice {
            value
            text
          }
          cost {
            value
            text
          }
        }
        weightBasedCost {
          minWeight {
            value
            text
          }
          cost {
            value
            text
          }
        }
        isEnabled
        conditionType
        calculateApi
        max
        min
        updateApi
        deleteApi
      }
      updateApi
      deleteApi
      addMethodApi
    }
  }
`;

export function Zones({
  createShippingZoneApi
}: {
  createShippingZoneApi: string;
}) {
  const modal = useModal();
  const [{ data, fetching, error }, reexecuteQuery] = useQuery({
    query: ZonesQuery,
    requestPolicy: 'network-only'
  });

  if (fetching) return <Spinner />;
  if (error) return <div>Error loading zones</div>;

  if (!data || !data.shippingZones) return <div>No zones found</div>;
  const reload = () => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  };
  return (
    <>
      {data.shippingZones.map((zone) => (
        <Zone zone={zone} reload={reload} key={zone.uuid} />
      ))}
      <div className="flex justify-end p-5">
        <a
          href="#"
          className="text-interactive button primary"
          onClick={(e) => {
            e.preventDefault();
            modal.open();
          }}
        >
          Create New Zone
        </a>
      </div>
      <Modal
        title="Create New Shipping Zone"
        onClose={modal.close}
        isOpen={modal.isOpen}
      >
        <ZoneForm
          formMethod="POST"
          saveZoneApi={createShippingZoneApi}
          onSuccess={() => {
            modal.close();
          }}
          reload={reload}
        />
      </Modal>
    </>
  );
}
