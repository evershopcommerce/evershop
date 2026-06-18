import { PackageForm, PackageData } from '@components/admin/PackageForm.js';
import Spinner from '@components/admin/Spinner.jsx';
import { Badge } from '@components/common/ui/Badge.js';
import { Button } from '@components/common/ui/Button.js';
import { ConfirmDialog } from '@components/common/ui/ConfirmDialog.js';
import {
  Dialog,
  DialogContent,
  DialogTrigger
} from '@components/common/ui/Dialog.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import React from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';

const PackagesQuery = `
  query Packages {
    packages {
      uuid
      name
      length
      width
      height
      weight {
        value
        unit
      }
      isDefault
      updateApi
      deleteApi
    }
    setting {
      dimensionUnit
      weightUnit
    }
    createPackageApi: url(routeId: "createPackage")
  }
`;

/**
 * Package (parcel size) management. Every shippable product must reference a
 * package; its dimensions + tare drive shipping quotes and labels. Exactly
 * one package is the default (preselected for new products) — the default
 * can't be deleted, and a package still used by products can't be deleted
 * either (the API reports the count).
 */
export function Packages() {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PackageData | null>(null);
  const [{ data, fetching, error }, reexecuteQuery] = useQuery({
    query: PackagesQuery,
    requestPolicy: 'network-only'
  });

  if (fetching) return <Spinner width={'2rem'} height={'2rem'} />;
  if (error)
    return (
      <div className="text-destructive">{_('Error loading packages')}</div>
    );

  const reload = () => reexecuteQuery({ requestPolicy: 'network-only' });
  const packages: PackageData[] = data?.packages ?? [];
  const dimensionUnit = data?.setting?.dimensionUnit ?? 'cm';
  const weightUnit = data?.setting?.weightUnit ?? 'kg';

  const onDelete = async (pkg: PackageData) => {
    const response = await axios.delete(pkg.deleteApi, {
      validateStatus: () => true
    });
    if (response.data?.error) {
      toast.error(response.data.error.message);
    } else {
      toast.success(_('Package deleted'));
      reload();
    }
  };

  return (
    <div className="px-5 pb-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-border">
            <th className="py-2">{_('Name')}</th>
            <th className="py-2">{_('Size (L × W × H)')}</th>
            <th className="py-2">{_('Empty weight')}</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {packages.map((pkg) => (
            <tr key={pkg.uuid} className="border-b border-border">
              <td className="py-2">
                {pkg.name}{' '}
                {pkg.isDefault && (
                  <Badge variant="secondary">{_('Default')}</Badge>
                )}
              </td>
              <td className="py-2">
                {pkg.length} × {pkg.width} × {pkg.height} {dimensionUnit}
                {pkg.height === 0 && (
                  <span className="text-xs text-muted-foreground">
                    {' '}
                    {_('(envelope)')}
                  </span>
                )}
              </td>
              <td className="py-2">{pkg.weight?.value ?? 0} {pkg.weight?.unit ?? weightUnit}</td>
              <td className="py-2 text-right space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setEditing(pkg)}
                >
                  {_('Edit')}
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      disabled={pkg.isDefault}
                      title={
                        pkg.isDefault
                          ? _('The default package cannot be deleted')
                          : undefined
                      }
                    >
                      {_('Delete')}
                    </Button>
                  }
                  title={_('Delete package "${name}"?', { name: pkg.name })}
                  description={_(
                    "This cannot be undone. Packages still assigned to products can't be removed."
                  )}
                  confirmLabel={_('Delete')}
                  confirmVariant="destructive"
                  onConfirm={() => onDelete(pkg)}
                />
              </td>
            </tr>
          ))}
          {packages.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-muted-foreground">
                {_(
                  'No packages yet. Create one — shippable products require a package.'
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <div className="flex justify-end mt-3">
          <DialogTrigger>
            <Button>{_('Create New Package')}</Button>
          </DialogTrigger>
        </div>
        <DialogContent>
          <PackageForm
            formMethod="POST"
            saveApi={data?.createPackageApi}
            onSuccess={() => setCreateOpen(false)}
            reload={reload}
            dimensionUnit={dimensionUnit}
            weightUnit={weightUnit}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          {editing && (
            <PackageForm
              formMethod="PATCH"
              saveApi={editing.updateApi}
              pkg={editing}
              onSuccess={() => setEditing(null)}
              reload={reload}
              dimensionUnit={dimensionUnit}
              weightUnit={weightUnit}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
