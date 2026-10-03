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
import { SellToCountriesCard } from './SellToCountries.js';
import { Zone, ShippingZone, ZoneWarning } from './Zone.js';
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
      regions {
        country
        level
        key
        name
        retired
        mergedInto {
          key
          name
        }
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
    saveSettingApi: url(routeId: "saveSetting")
    setting {
      addressSellToCountries
    }
    allCountries: countries(scope: ALL) {
      code
      name
    }
    addressConfigWarnings {
      kind
      source
      sourceId
      country
      key
      keyName
    }
    shippingCountries: countries(scope: SHIPPING) {
      code
    }
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

  const warnings: ZoneWarning[] = data.addressConfigWarnings ?? [];
  // Spec § 3.13: when no zone country is in the sell-to list, checkout cannot
  // complete for anyone — say so store-wide, name both sides.
  const strandedStore =
    data.shippingZones.length > 0 &&
    (data.shippingCountries ?? []).length === 0;

  const sellTo = data.setting?.addressSellToCountries;

  return (
    <>
      {/* Spec § 3.13: the sell-to list sits above the zones it interacts with. */}
      <SellToCountriesCard
        zones={data.shippingZones}
        countries={data.allCountries ?? []}
        sellTo={Array.isArray(sellTo) ? sellTo : 'all'}
        saveSettingApi={data.saveSettingApi}
        onSaved={reload}
      />
      {strandedStore && (
        <div className="mx-5 mb-3 rounded border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {_(
            'Checkout cannot complete: none of your shipping zones covers a country you sell to.'
          )}
        </div>
      )}
      {data.shippingZones.map((zone: ShippingZone) => (
        <Zone
          zone={zone}
          reload={reload}
          key={zone.uuid}
          warnings={warnings.filter((w) => w.sourceId === zone.uuid)}
        />
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
