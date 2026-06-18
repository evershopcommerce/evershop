import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  ZoneConfigFieldDef,
  ZoneConfigFields
} from './AttachProviderDialog.js';
import type { ZoneProvider } from './Zone.js';

/**
 * Edit an EXISTING attachment's per-zone provider config (the same schema
 * form the Attach Provider dialog renders, prefilled with the saved values).
 * PATCHes `/api/shippingZones/:zoneUuid/providers/:providerCode` — the
 * update API merges `{ config }` onto the attachment row.
 */
export function ZoneProviderConfigDialog({
  zoneUuid,
  zoneName,
  zoneProvider,
  onSaved
}: {
  zoneUuid: string;
  zoneName: string;
  zoneProvider: ZoneProvider;
  onSaved: () => void;
}) {
  const form = useForm({
    defaultValues: { config: zoneProvider.config ?? {} }
  });
  const [saving, setSaving] = React.useState(false);

  const save = form.handleSubmit(async (values) => {
    setSaving(true);
    try {
      const response = await axios.patch(
        `/api/shippingZones/${zoneUuid}/providers/${zoneProvider.provider.code}`,
        { config: values.config ?? {} },
        { validateStatus: () => true }
      );
      if (response.data?.error) {
        toast.error(response.data.error.message);
      } else {
        toast.success(
          _('${name} configuration saved for ${zone}', {
            name: zoneProvider.provider.name,
            zone: zoneName
          })
        );
        onSaved();
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  });

  return (
    <FormProvider {...form}>
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold">
            {_('${name} configuration for ${zone}', {
              name: zoneProvider.provider.name,
              zone: zoneName
            })}
          </h3>
          {zoneProvider.provider.description && (
            <p className="text-xs text-muted-foreground">
              {zoneProvider.provider.description}
            </p>
          )}
        </div>
        <ZoneConfigFields
          fields={
            (zoneProvider.provider.zoneConfigFields as
              | ZoneConfigFieldDef[]
              | null
              | undefined) ?? null
          }
          values={zoneProvider.config ?? undefined}
        />
        <div className="flex justify-end pt-2">
          <Button type="button" disabled={saving} onClick={save}>
            {saving ? _('Saving…') : _('Save')}
          </Button>
        </div>
      </div>
    </FormProvider>
  );
}
