import { PackageForm } from '@components/admin/PackageForm.js';
import { CheckboxField } from '@components/common/form/CheckboxField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import {
  Dialog,
  DialogContent,
  DialogTrigger
} from '@components/common/ui/Dialog.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

interface PackageOption {
  packageId: number;
  name: string;
  length: number;
  width: number;
  height: number;
  isDefault: boolean;
}

interface ShippingProps {
  product:
    | {
        noShippingRequired: boolean;
        weight: {
          value: number;
          unit: string;
        };
        package: { packageId: number } | null;
      }
    | undefined;
  packages: PackageOption[];
  setting: {
    weightUnit: string;
    dimensionUnit: string;
  };
  createPackageApi: string;
}

/**
 * Inline "create package" dialog so merchants don't have to leave the product
 * form. Reuses the shared PackageForm (same validation rules + default
 * checkbox as Settings → Shipping → Packages). Safe inside the product form:
 * DialogContent renders through a portal, so the inner <form> never nests in
 * the product's <form>, and PackageForm runs its own react-hook-form
 * instance — nothing registers into the product form.
 */
function NewPackageDialog({
  createPackageApi,
  dimensionUnit,
  weightUnit,
  onCreated
}: {
  createPackageApi: string;
  dimensionUnit: string;
  weightUnit: string;
  onCreated: (pkg: PackageOption) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="link" size="sm" type="button">
          {_('+ New package')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <PackageForm
          formMethod="POST"
          saveApi={createPackageApi}
          dimensionUnit={dimensionUnit}
          weightUnit={weightUnit}
          onSuccess={(row) => {
            if (!row) return;
            const created = row as unknown as {
              package_id: number;
              name: string;
              length: string;
              width: string;
              height: string;
              is_default: boolean;
            };
            onCreated({
              packageId: created.package_id,
              name: created.name,
              length: parseFloat(created.length),
              width: parseFloat(created.width),
              height: parseFloat(created.height),
              isDefault: created.is_default
            });
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export default function Shipping({
  product,
  packages: initialPackages,
  setting,
  createPackageApi
}: ShippingProps) {
  const shipping = product || {
    noShippingRequired: undefined,
    weight: undefined,
    package: null
  };
  const { control, setValue } = useFormContext();
  const [packages, setPackages] = React.useState<PackageOption[]>(
    initialPackages ?? []
  );
  const noShippingRequired = useWatch({
    control,
    name: 'no_shipping_required',
    defaultValue:
      (shipping.noShippingRequired !== null && shipping.noShippingRequired) ||
      false
  });

  // Preselect: the product's package, or the store default for new products.
  // Legacy products (no package yet) get no preselection — the required
  // validation forces a choice before the product can be saved.
  const defaultPackageId =
    shipping.package?.packageId ??
    (product ? undefined : packages.find((p) => p.isDefault)?.packageId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('Shipping')}</CardTitle>
        <CardDescription>
          {_('Manage the shipping settings of the product.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CheckboxField
          name="no_shipping_required"
          label={_('No shipping required?')}
          defaultValue={shipping.noShippingRequired === true}
          helperText={_(
            'Select this option if the product is a digital product or service that does not require shipping.'
          )}
          wrapperClassName="mb-0"
        />
      </CardContent>
      <CardContent>
        {!noShippingRequired && (
          <NumberField
            name="weight"
            placeholder={_('Enter weight')}
            label={_('Weight')}
            defaultValue={shipping.weight?.value}
            unit={setting?.weightUnit}
            required
            validation={{
              min: {
                value: 0,
                message: _('Weight must be a positive number')
              }
            }}
            helperText={_('Weight must be a positive number')}
          />
        )}
        {noShippingRequired && (
          <NumberField
            name="weight_no_shipping"
            placeholder={_('Enter weight')}
            label={_('Weight')}
            defaultValue={shipping.weight?.value}
            unit={setting?.weightUnit}
            disabled
            helperText={_('Weight must be a positive number')}
          />
        )}
      </CardContent>
      {!noShippingRequired && (
        <CardContent>
          <SelectField
            name="package_id"
            label={_('Package')}
            required
            validation={{
              required: _('A package is required for shippable products')
            }}
            options={packages.map((p) => ({
              value: p.packageId,
              label: `${p.name} (${p.length} × ${p.width} × ${p.height} ${
                setting?.dimensionUnit ?? 'cm'
              })`
            }))}
            defaultValue={defaultPackageId}
            helperText={_(
              'The box or envelope this product ships in. Applies to all variants of this product.'
            )}
          />
          <NewPackageDialog
            createPackageApi={createPackageApi}
            dimensionUnit={setting?.dimensionUnit ?? 'cm'}
            weightUnit={setting?.weightUnit ?? 'kg'}
            onCreated={(pkg) => {
              setPackages((prev) => [...prev, pkg]);
              setValue('package_id', pkg.packageId, { shouldDirty: true });
            }}
          />
        </CardContent>
      )}
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 15
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      weight {
        value
        unit
      }
      noShippingRequired
      package {
        packageId
      }
    }
    packages {
      packageId
      name
      length
      width
      height
      isDefault
    }
    setting {
      weightUnit
      dimensionUnit
    }
    createPackageApi: url(routeId: "createPackage")
  }
`;
