import { InputField } from '@components/common/form/InputField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { toast } from '@components/common/ui/Sonner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { RelatedRulesEditor } from '../../../components/RelatedRulesEditor.js';
import type { RulesEditorConfig } from '../../../components/RelatedRulesEditor.js';

/**
 * Global recommendation configuration cards (spec § 10.1). NOT an area
 * component: rendered by CatalogSetting INSIDE its single Form (owner design
 * call 2026-07-16 — one Save button for the whole settings page), so this
 * file deliberately exports no layout/query. The rules object travels as ONE
 * typed nested value via RelatedRulesEditor; the crossSell* scalars are
 * union-tolerant on the API side, so plain number/toggle fields suffice.
 */

export interface ProductRecommendationsProps {
  recomputeApi: string;
  setting: {
    relatedProductsRules?: RulesEditorConfig;
    crossSellMinPairCount?: number;
    crossSellMinAnchorOrders?: number;
    crossSellMinLift?: number;
    crossSellFallbackEnabled?: boolean;
  };
  recommendationStatSummary: {
    computedAt?: string | null;
    totalOrderCount: number;
    pairCount: number;
  };
  attributes?: {
    items: Array<{ attributeCode: string; attributeName: string }>;
  };
}

export function ProductRecommendations({
  recomputeApi,
  setting,
  recommendationStatSummary,
  attributes
}: ProductRecommendationsProps) {
  const [stats, setStats] = React.useState(recommendationStatSummary);
  const [recomputing, setRecomputing] = React.useState(false);

  const recomputeNow = async () => {
    setRecomputing(true);
    try {
      const response = await fetch(recomputeApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const data = await response.json();
      if (!data.success) {
        toast.error(data.message || _('Recompute failed'));
      } else {
        setStats({
          computedAt: data.data.computedAt,
          totalOrderCount: data.data.totalOrderCount,
          pairCount: data.data.pairCount
        });
        toast.success(_('Co-purchase statistics recomputed'));
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{_('Related products')}</CardTitle>
          <CardDescription>
            {_(
              'Rules for the Related-products shelf on product pages. Categories and products can override them; manual picks on a product always come first.'
            )}{' '}
            {_(
              'The Upsell shelf reuses these same rules, restricted to products PRICIER than the one being viewed (with the price band percent as the upper cap when enabled) — no bestseller fill, and no upsell for products set to “Manual picks only”.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RelatedRulesEditor
            name="relatedProductsRules"
            initial={setting.relatedProductsRules}
            attributes={attributes?.items || []}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{_('Frequently bought together')}</CardTitle>
          <CardDescription>
            {_(
              'Co-purchase recommendations are trusted only above these thresholds. Defaults suit small stores — raising them means fewer, stronger suggestions.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-5">
            <InputField
              type="number"
              name="crossSellMinPairCount"
              label={_('Min times bought together')}
              defaultValue={setting.crossSellMinPairCount ?? 3}
              min={1}
              helperText={_('A pair must co-occur in at least this many orders.')}
            />
            <InputField
              type="number"
              name="crossSellMinAnchorOrders"
              label={_('Min orders of the product')}
              defaultValue={setting.crossSellMinAnchorOrders ?? 5}
              min={1}
              helperText={_('Orders of a product before its data is trusted.')}
            />
            <InputField
              type="number"
              name="crossSellMinLift"
              label={_('Min lift')}
              defaultValue={setting.crossSellMinLift ?? 1}
              min={0}
              step="0.1"
              helperText={_(
                'Above 1 = bought together more than chance. Filters ubiquitous bestsellers.'
              )}
            />
          </div>
        </CardContent>
        <CardContent className="border-t border-t-border pt-6">
          <ToggleField
            name="crossSellFallbackEnabled"
            label={_('Fill empty slots with bestsellers')}
            defaultValue={setting.crossSellFallbackEnabled ?? true}
            helperText={_(
              'Below the thresholds, the shelf shows category and store bestsellers instead of rendering nothing.'
            )}
          />
        </CardContent>
        <CardContent className="border-t border-t-border pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {stats.computedAt
                ? _(
                    'Co-purchase data last computed ${date} from ${total} orders (${pairs} product pairs).',
                    {
                      date: new Date(stats.computedAt).toLocaleString(),
                      total: String(stats.totalOrderCount),
                      pairs: String(stats.pairCount)
                    }
                  )
                : _(
                    'No co-purchase data yet — it is computed nightly, or recompute now.'
                  )}
            </div>
            <Button
              variant="outline"
              disabled={recomputing}
              onClick={(e) => {
                e.preventDefault();
                recomputeNow();
              }}
            >
              {recomputing ? _('Recomputing…') : _('Recompute now')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
