import { Button } from '@components/common/ui/Button.js';
import { CardContent } from '@components/common/ui/Card.js';
import { ConfirmDialog } from '@components/common/ui/ConfirmDialog.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@components/common/ui/Dialog.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import { MapPin, Truck } from 'lucide-react';
import React from 'react';
import { toast } from 'react-toastify';
import { AttachProviderDialog } from './AttachProviderDialog.js';
import { ZoneForm } from './ZoneForm.js';
import { ZoneProviderConfigDialog } from './ZoneProviderConfigDialog.js';

export interface Country {
  name: string;
  code: string;
}

export interface Province {
  name: string;
  code: string;
  countryCode: string;
}

export interface ZoneProvider {
  shippingZoneProviderId: number;
  uuid: string;
  isEnabled: boolean;
  sortOrder: number;
  config: Record<string, unknown> | null;
  provider: {
    code: string;
    name: string;
    description?: string | null;
    zoneConfigFields?: Array<Record<string, unknown>> | null;
  };
}

export interface ShippingZone {
  name: string;
  uuid: string;
  countries: Country[];
  provinces: Province[];
  providers: ZoneProvider[];
  updateApi: string;
  deleteApi: string;
}

interface ZoneProps {
  zone: ShippingZone;
  reload: () => void;
}

export function Zone({ zone, reload }: ZoneProps) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [attachOpen, setAttachOpen] = React.useState(false);
  const [configuring, setConfiguring] = React.useState<ZoneProvider | null>(
    null
  );

  const detach = async (providerCode: string, providerName: string) => {
    try {
      await axios.delete(
        `/api/shippingZones/${zone.uuid}/providers/${providerCode}`
      );
      toast.success(_('${name} detached', { name: providerName }));
      reload();
    } catch (e) {
      toast.error(_('Failed to detach ${name}', { name: providerName }));
    }
  };

  const removeZone = async () => {
    try {
      const response = await axios.delete(zone.deleteApi);
      if (response.status === 200) {
        toast.success(_('Zone removed'));
        reload();
      } else {
        toast.error(_('Failed to remove zone'));
      }
    } catch (e) {
      toast.error(_('Failed to remove zone'));
    }
  };

  // Group provinces by country code for display.
  const provincesByCountry = new Map<string, Province[]>();
  for (const p of zone.provinces) {
    const list = provincesByCountry.get(p.countryCode) ?? [];
    list.push(p);
    provincesByCountry.set(p.countryCode, list);
  }

  return (
    <CardContent className="space-y-3 pt-3 border-t border-border">
      <div className="flex justify-between items-center gap-5">
        <div className="text-xs uppercase font-semibold">{zone.name}</div>
        <div className="flex justify-between gap-3">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger>{_('Edit Zone')}</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{_('Edit Shipping Zone')}</DialogTitle>
              </DialogHeader>
              <ZoneForm
                formMethod="PATCH"
                saveZoneApi={zone.updateApi}
                onSuccess={() => setEditOpen(false)}
                reload={reload}
                zone={zone}
              />
            </DialogContent>
          </Dialog>
          <ConfirmDialog
            trigger={
              <button
                type="button"
                className="text-destructive cursor-pointer"
              >
                {_('Remove Zone')}
              </button>
            }
            title={_('Delete zone "${name}"?', { name: zone.name })}
            description={_(
              'This removes the zone along with its provider attachments and rates. This cannot be undone.'
            )}
            confirmLabel={_('Delete zone')}
            confirmVariant="destructive"
            onConfirm={removeZone}
          />
        </div>
      </div>

      <div className="border rounded border-border divide-y divide-border">
        {/* Coverage row */}
        <div className="flex items-center px-2 py-3">
          <div className="p-3">
            <MapPin width={20} height={20} />
          </div>
          <div className="grow px-2">
            <div>
              <b>
                {zone.countries.length === 0
                  ? _('Worldwide')
                  : zone.countries.length === 1
                  ? zone.countries[0].name
                  : _('${count} countries', {
                      count: String(zone.countries.length)
                    })}
              </b>
            </div>
            <div className="text-sm text-muted-foreground">
              {zone.countries.length > 1 && (
                <span>
                  {zone.countries
                    .slice(0, 5)
                    .map((c) => c.name)
                    .join(', ')}
                  {zone.countries.length > 5 &&
                    _(', +${count} more', {
                      count: String(zone.countries.length - 5)
                    })}
                </span>
              )}
              {zone.provinces.length > 0 && (
                <span>
                  {' '}
                  · {_('Provinces:')}{' '}
                  {Array.from(provincesByCountry.entries())
                    .map(
                      ([cc, list]) =>
                        `${cc} (${list
                          .slice(0, 3)
                          .map((p) => p.name)
                          .join(', ')}${list.length > 3 ? '…' : ''})`
                    )
                    .join('; ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Providers row */}
        <div className="px-2 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Truck width={18} height={18} />
            <span className="font-medium">{_('Attached Providers')}</span>
          </div>
          {zone.providers.length === 0 ? (
            <p className="text-sm text-muted-foreground italic px-2">
              {_('No providers attached. Click "Attach Provider" to add one.')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="border-none">{_('Provider')}</TableHead>
                  <TableHead className="border-none">{_('Status')}</TableHead>
                  <TableHead className="border-none">{_('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zone.providers.map((zp) => (
                  <TableRow key={zp.uuid} className="text-xs">
                    <TableCell className="font-medium">
                      {zp.provider.name}
                    </TableCell>
                    <TableCell>
                      {zp.isEnabled ? (
                        <span className="text-green-700">● {_('Enabled')}</span>
                      ) : (
                        <span className="text-muted-foreground">
                          ○ {_('Disabled')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="space-x-2">
                      {zp.provider.code === 'core' && (
                        <a
                          href="/admin/setting/shippingProviders"
                          className="text-primary"
                        >
                          {_('Methods →')}
                        </a>
                      )}
                      {(zp.provider.zoneConfigFields?.length ?? 0) > 0 && (
                        <button
                          type="button"
                          className="text-primary"
                          onClick={() => setConfiguring(zp)}
                        >
                          {_('Configure')}
                        </button>
                      )}
                      <ConfirmDialog
                        trigger={
                          <button type="button" className="text-destructive">
                            {_('Detach')}
                          </button>
                        }
                        title={_('Detach ${name}?', {
                          name: zp.provider.name
                        })}
                        description={_(
                          "Customers in ${zone} will no longer see ${name}'s methods at checkout. You can re-attach it later.",
                          { zone: zone.name, name: zp.provider.name }
                        )}
                        confirmLabel={_('Detach')}
                        confirmVariant="destructive"
                        onConfirm={() =>
                          detach(zp.provider.code, zp.provider.name)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-2">
            <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
              <DialogTrigger>
                <Button variant="outline" size="sm" className="text-xs">
                  {_('+ Attach Provider')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {_('Attach Provider to ${zone}', { zone: zone.name })}
                  </DialogTitle>
                </DialogHeader>
                <AttachProviderDialog
                  zone={zone}
                  alreadyAttached={zone.providers.map((p) => p.provider.code)}
                  onSaved={() => {
                    setAttachOpen(false);
                    reload();
                  }}
                />
              </DialogContent>
            </Dialog>
            <Dialog
              open={configuring !== null}
              onOpenChange={(open) => {
                if (!open) setConfiguring(null);
              }}
            >
              <DialogContent>
                {configuring && (
                  <ZoneProviderConfigDialog
                    zoneUuid={zone.uuid}
                    zoneName={zone.name}
                    zoneProvider={configuring}
                    onSaved={() => {
                      setConfiguring(null);
                      reload();
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </CardContent>
  );
}
