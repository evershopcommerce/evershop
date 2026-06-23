import Spinner from '@components/admin/Spinner.jsx';
import { Button } from '@components/common/ui/Button.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@components/common/ui/Dialog.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useQuery } from 'urql';
import { Zone, ShippingZone } from './Zone.js';
import { ZoneForm } from './ZoneForm.js';

const ZonesQuery = `
  query Zones {
    shippingZones {
      uuid
      name
      countries {
        name
        code
      }
      provinces {
        name
        code
        countryCode
      }
      providers {
        shippingZoneProviderId
        uuid
        isEnabled
        sortOrder
        config
        provider {
          code
          name
          description
          zoneConfigFields
        }
      }
      updateApi
      deleteApi
    }
    createShippingZoneApi: url(routeId: "createShippingZone")
  }
`;

export function Zones({
  createShippingZoneApi: createShippingZoneApiProp
}: {
  createShippingZoneApi?: string;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [{ data, fetching, error }, reexecuteQuery] = useQuery({
    query: ZonesQuery,
    requestPolicy: 'network-only'
  });

  if (fetching) return <Spinner width={'2rem'} height={'2rem'} />;
  if (error)
    return <div className="text-destructive">{_('Error loading zones')}</div>;
  if (!data || !data.shippingZones)
    return <div>{_('No zones found')}</div>;

  const reload = () => reexecuteQuery({ requestPolicy: 'network-only' });
  const createShippingZoneApi =
    createShippingZoneApiProp ?? data.createShippingZoneApi;

  return (
    <>
      {data.shippingZones.map((zone: ShippingZone) => (
        <Zone zone={zone} reload={reload} key={zone.uuid} />
      ))}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <div className="flex justify-end pr-5">
          <DialogTrigger>
            <Button>{_('Create New Zone')}</Button>
          </DialogTrigger>
        </div>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{_('Create New Zone')}</DialogTitle>
          </DialogHeader>
          <ZoneForm
            formMethod="POST"
            saveZoneApi={createShippingZoneApi}
            onSuccess={() => {
              setDialogOpen(false);
            }}
            reload={reload}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
