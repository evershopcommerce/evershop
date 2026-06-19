import Spinner from '@components/admin/Spinner.jsx';
import { Button } from '@components/common/ui/Button.js';
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
import React from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';
import { MethodForm } from './MethodForm.js';

const MethodsQuery = `
  query CoreMethods {
    coreShippingMethods {
      coreShippingMethodId
      uuid
      name
      isEnabled
      sortOrder
      defaultCarrierCode
      defaultServiceCode
      rates {
        coreShippingMethodRateId
        uuid
        zoneId
        zone {
          shippingZoneId
          uuid
          name
        }
        isEnabled
        cost {
          value
          text
        }
        conditionType
        min
        max
        updateApi
        deleteApi
      }
      addRateApi
    }
    shippingZones {
      shippingZoneId
      uuid
      name
      providers {
        provider {
          code
        }
      }
    }
    carriers {
      code
      name
    }
  }
`;

interface CoreMethod {
  coreShippingMethodId: number;
  uuid: string;
  name: string;
  isEnabled: boolean;
  sortOrder: number;
  defaultCarrierCode: string | null;
  defaultServiceCode: string | null;
  rates: Array<{
    coreShippingMethodRateId: number;
    uuid: string;
    zoneId: number;
    zone: { shippingZoneId: number; uuid: string; name: string } | null;
    isEnabled: boolean;
    cost: { value: number; text: string } | null;
    conditionType: string | null;
    min: number | null;
    max: number | null;
    updateApi: string;
    deleteApi: string;
  }>;
  addRateApi: string;
}

interface Zone {
  shippingZoneId: number;
  uuid: string;
  name: string;
  providers: Array<{ provider: { code: string } | null }>;
}

export function MethodsList() {
  const [{ data, fetching, error }, reexecuteQuery] = useQuery({
    query: MethodsQuery,
    requestPolicy: 'network-only'
  });
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CoreMethod | null>(null);

  if (fetching) return <Spinner width={'2rem'} height={'2rem'} />;
  if (error)
    return <div className="text-destructive">{_('Error loading methods')}</div>;
  if (!data) return null;

  const reload = () => reexecuteQuery({ requestPolicy: 'network-only' });

  // Zones where Core is currently attached — the only zones the admin can
  // configure rates for.
  const coreZones = (data.shippingZones ?? []).filter((z: Zone) =>
    (z.providers ?? []).some((p) => p?.provider?.code === 'core')
  );
  // Registered carriers available as default-carrier choices for new/edited
  // methods. Empty list is fine — the form falls back to "No default".
  const carriers = (data.carriers ?? []) as Array<{
    code: string;
    name: string;
  }>;

  const deleteMethod = async (uuid: string, name: string) => {
    try {
      await axios.delete(`/api/shippingProviders/core/methods/${uuid}`);
      toast.success(_('Deleted ${name}', { name }));
      reload();
    } catch (e) {
      toast.error(_('Failed to delete ${name}', { name }));
    }
  };

  return (
    <div className="px-5 space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{_('Method')}</TableHead>
            <TableHead>{_('Status')}</TableHead>
            <TableHead>{_('Zones served')}</TableHead>
            <TableHead className="text-right">{_('Actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.coreShippingMethods?.length ? (
            data.coreShippingMethods.map((m: CoreMethod) => (
              <TableRow key={m.uuid}>
                <TableCell className="font-semibold">{m.name}</TableCell>
                <TableCell>
                  {m.isEnabled ? (
                    <span className="text-green-700">● {_('Enabled')}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      ○ {_('Disabled')}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {m.rates.length > 0
                    ? m.rates.map((r) => r.zone?.name ?? '—').join(', ')
                    : _('No zones')}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(m)}
                  >
                    {_('Edit')}
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button variant="destructive" size="sm">
                        {_('Delete')}
                      </Button>
                    }
                    title={_('Delete "${name}"?', { name: m.name })}
                    description={_(
                      'Its rates will be removed too. This cannot be undone.'
                    )}
                    confirmLabel={_('Delete')}
                    confirmVariant="destructive"
                    onConfirm={() => deleteMethod(m.uuid, m.name)}
                  />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center text-muted-foreground"
              >
                {_('No methods yet — add one to start offering Core shipping.')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger>
            <Button>{_('+ Add Method')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{_('Add Shipping Method')}</DialogTitle>
            </DialogHeader>
            <MethodForm
              coreZones={coreZones}
              carriers={carriers}
              onSaved={() => {
                setAddOpen(false);
                reload();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {_('Edit ${name}', { name: editing?.name ?? '' })}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <MethodForm
              method={editing}
              coreZones={coreZones}
              carriers={carriers}
              onSaved={() => {
                setEditing(null);
                reload();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
