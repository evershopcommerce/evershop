import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { Switch } from '@components/common/ui/Switch.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { RelatedRulesEditor } from '../../../components/RelatedRulesEditor.js';
import type { RulesEditorConfig } from '../../../components/RelatedRulesEditor.js';

/**
 * Category-tier related-products override (spec § 10.3). One nullable JSONB
 * column rides the category PATCH: override ON writes the § 6.2 object,
 * override OFF writes null — reverting must DELETE the stored state, never
 * leave a dormant snapshot (§ 6.4). Editing starts from a COPY of the global
 * config; nothing is stored until save.
 */

interface RelatedProductsRulesProps {
  category: {
    relatedProductsRules?: RulesEditorConfig | null;
  };
  setting: {
    relatedProductsRules?: RulesEditorConfig;
  };
  settingsUrl: string;
  attributes?: {
    items: Array<{ attributeCode: string; attributeName: string }>;
  };
}

export default function RelatedProductsRules({
  category,
  setting,
  settingsUrl,
  attributes
}: RelatedProductsRulesProps) {
  const { setValue } = useFormContext();
  const [overridden, setOverridden] = React.useState(
    Boolean(category.relatedProductsRules)
  );

  React.useEffect(() => {
    if (!overridden) {
      setValue('related_products_rules', null, { shouldDirty: true });
    }
  }, [overridden]);

  return (
    <Card className="bg-popover">
      <CardHeader>
        <CardTitle>{_('Related products rules')}</CardTitle>
        <CardDescription>
          {_(
            'Applies to all products in this category that inherit their rules. Products with their own override are unaffected.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-2 text-sm select-none">
            <Switch
              checked={overridden}
              onCheckedChange={(next) => setOverridden(Boolean(next))}
              size="sm"
              aria-label={_('Override the global rules for this category')}
            />
            <span
              className="cursor-pointer"
              onClick={() => setOverridden(!overridden)}
              role="presentation"
            >
              {_('Override the global rules for this category')}
            </span>
          </span>
          <span className="text-xs rounded-full bg-primary/10 px-2 py-0.5">
            {overridden ? (
              _('Overridden on this category')
            ) : (
              <a className="underline" href={settingsUrl}>
                {_('Source: Global settings')}
              </a>
            )}
          </span>
        </div>
        {overridden ? (
          <RelatedRulesEditor
            key="category-override"
            name="related_products_rules"
            initial={category.relatedProductsRules || setting.relatedProductsRules}
            attributes={attributes?.items || []}
          />
        ) : (
          <div className="text-sm text-muted-foreground">
            {_(
              'Products in this category follow the global related-products rules. Preview what shoppers see from any product’s edit screen.'
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 55
};

export const query = `
  query Query {
    category(id: getContextValue("categoryId", null)) {
      relatedProductsRules {
        enabled
        rules { type enabled attributeCodes scope }
        priceBand { enabled percent }
        fallbackToBestsellers
      }
    }
    setting {
      relatedProductsRules {
        enabled
        rules { type enabled attributeCodes scope }
        priceBand { enabled percent }
        fallbackToBestsellers
      }
    }
    settingsUrl: url(routeId: "catalogSetting")
    attributes(filters: [{key: "type", operation: eq, value: "select"}, {key: "limit", operation: eq, value: "100"}]) {
      items {
        attributeCode
        attributeName
      }
    }
  }
`;
