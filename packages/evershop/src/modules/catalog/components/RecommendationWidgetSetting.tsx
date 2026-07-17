import { useScopedFormContext } from '@components/common/page-builder/WidgetSettingsScope.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Shared settingComponent for both recommendation widget types
 * (specifications/05 § 9.1). Scalars only — deliberately no list-typed
 * settings (the legacy /admin/widgets/edit surface seeds those as JSON
 * strings). `limit` registers with valueAsNumber: the widget-save AJV has no
 * coerceTypes, so a string from a number input would fail the integer schema.
 */

function Field({
  label,
  hint,
  children
}: {
  label?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="text-[11px] font-semibold tracking-wide text-foreground/80">
          {label}
        </div>
      )}
      <div>{children}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

interface RecommendationWidgetSettingProps {
  recommendationWidget?: {
    heading?: string | null;
    limit?: number | null;
  };
}

function RecommendationWidgetSetting({
  recommendationWidget
}: RecommendationWidgetSettingProps) {
  const { heading = '', limit = undefined } = recommendationWidget ?? {};
  const { register } = useScopedFormContext();

  return (
    <div className="rounded-md border border-divider bg-card">
      <div className="space-y-3 px-3 py-3">
        <Field
          label={_('Heading')}
          hint={_(
            'Shown above the products. The shelf renders nothing at all when no products qualify.'
          )}
        >
          <input
            type="text"
            {...register('settings.heading')}
            defaultValue={heading ?? ''}
            placeholder={_('e.g. You may also like')}
            className="w-full rounded-md border border-divider bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field
          label={_('Products to show')}
          hint={_('Between 1 and 12 — 3 to 5 works best.')}
        >
          <input
            type="number"
            min={1}
            max={12}
            {...register('settings.limit', {
              required: _('Product count is required'),
              min: 1,
              max: 12,
              valueAsNumber: true
            })}
            defaultValue={limit || ''}
            placeholder={_('e.g. 4')}
            className="w-full rounded-md border border-divider bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
      </div>
    </div>
  );
}

export default RecommendationWidgetSetting;

export const query = `
  query Query($heading: String, $limit: Int) {
    recommendationWidget(heading: $heading, limit: $limit) {
      heading
      limit
    }
  }
`;

export const variables = `{
  heading: getWidgetSetting("heading"),
  limit: getWidgetSetting("limit")
}`;
