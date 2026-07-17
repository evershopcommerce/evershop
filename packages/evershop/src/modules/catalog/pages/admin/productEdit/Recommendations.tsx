import { ProductSelector } from '@components/admin/ProductSelector.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@components/common/ui/Dialog.js';
import { toast } from '@components/common/ui/Sonner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useQuery } from 'urql';
import { RelatedRulesEditor } from '../../../components/RelatedRulesEditor.js';
import type { RulesEditorConfig } from '../../../components/RelatedRulesEditor.js';

/**
 * Product-level recommendation configuration + diagnostics (spec § 10.2).
 * Mode/exclude/rules ride the page's single form (real columns, § 5.3);
 * manual picks persist immediately through the § 11 link routes; everything
 * the shopper would see is previewed through the SAME gated resolvers the
 * storefront uses (D9).
 */

const DiagnosticsQuery = `
  query Query($id: ID) {
    product(id: $id) {
      recommendationStatus {
        anchorOrderCount
        computedAt
        totalOrderCount
        relatedRulesSource
        sourceCategory {
          name
          editUrl
        }
      }
      relatedLinks: productLinks(type: "related") {
        linkUuid
        sortOrder
        hiddenOnStorefront
        hiddenReason
        product {
          productId
          uuid
          sku
          name
          image {
            url
          }
        }
      }
      crossSellLinks: productLinks(type: "cross_sell") {
        linkUuid
        sortOrder
        hiddenOnStorefront
        hiddenReason
        product {
          productId
          uuid
          sku
          name
          image {
            url
          }
        }
      }
      crossSellCandidates {
        coPurchaseCount
        confidence
        lift
        passesGates
        hiddenByCatalogFilter
        product {
          productId
          uuid
          sku
          name
        }
      }
      relatedProductsResolved(limit: 8) {
        source
        salesCount
        product {
          productId
          name
          sku
          editUrl
          image {
            url
          }
        }
      }
      crossSellResolved(limit: 8) {
        source
        salesCount
        product {
          productId
          name
          sku
          editUrl
          image {
            url
          }
        }
      }
    }
  }
`;

interface LinkRow {
  linkUuid: string;
  sortOrder: number;
  hiddenOnStorefront: boolean;
  hiddenReason: string | null;
  product: {
    productId: number;
    uuid: string;
    sku: string;
    name: string;
    image?: { url?: string | null } | null;
  } | null;
}

function HiddenChip({ reason }: { reason: string | null }) {
  if (!reason) {
    return null;
  }
  return (
    <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-xs whitespace-nowrap">
      {reason === 'anchor_group'
        ? _('Hidden — same variant group')
        : _('Hidden — disabled or out of stock')}
    </span>
  );
}

interface ResolvedRow {
  source: string;
  salesCount: number;
  product: {
    productId: number;
    name: string;
    sku: string;
    editUrl?: string | null;
    image?: { url?: string | null } | null;
  };
}

function ProductThumb({ url, name }: { url?: string | null; name: string }) {
  return (
    <div className="text-border border border-divider rounded flex justify-center items-center w-10 h-10 shrink-0 overflow-hidden bg-card">
      {url ? (
        <img
          src={url}
          alt={name}
          className="max-w-full max-h-full object-contain"
        />
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1.5rem"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      )}
    </div>
  );
}

function ResolvedPreviewList({
  rows,
  emptyText,
  labelFor
}: {
  rows: ResolvedRow[];
  emptyText: string;
  labelFor: (source: string) => string;
}) {
  const isBestsellerSource = (source: string) => source.includes('bestsellers');
  const salesNote = (row: ResolvedRow) =>
    !isBestsellerSource(row.source)
      ? ''
      : row.salesCount > 0
      ? ` · ${_('${count} orders', { count: String(row.salesCount) })}`
      : ` · ${_('no orders yet — ranked newest first')}`;
  if (rows.length === 0) {
    return <div className="text-sm text-destructive">{emptyText}</div>;
  }
  return (
    <ol className="space-y-2">
      {rows.map((row, index) => (
        <li
          key={row.product.productId}
          className="flex items-center gap-3 text-sm"
        >
          <span className="text-xs text-muted-foreground w-4 text-right shrink-0">
            {index + 1}.
          </span>
          <ProductThumb url={row.product.image?.url} name={row.product.name} />
          <span className="min-w-0 flex-1">
            {row.product.editUrl ? (
              <a
                href={row.product.editUrl}
                className="block truncate hover:underline"
              >
                {row.product.name}
              </a>
            ) : (
              <span className="block truncate">{row.product.name}</span>
            )}
            <span className="block text-xs text-muted-foreground truncate">
              {row.product.sku}
            </span>
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {labelFor(row.source)}
            {salesNote(row)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function PicksList({
  title,
  hint,
  links,
  linksApi,
  onChanged,
  selectorDisabledIds,
  addPayloadType
}: {
  title: string;
  hint?: string;
  links: LinkRow[];
  linksApi: string;
  onChanged: () => void;
  selectorDisabledIds: number[];
  addPayloadType: 'related' | 'cross_sell';
}) {
  const call = async (
    url: string,
    method: string,
    body?: Record<string, unknown>
  ) => {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      toast.error(data.message || _('Operation failed'));
      return false;
    }
    return true;
  };

  const addPick = async (_sku: string, uuid: string) => {
    const maxSort = links.reduce(
      (max, link) => Math.max(max, link.sortOrder),
      0
    );
    if (
      await call(linksApi, 'POST', {
        linked_product_id: uuid,
        type: addPayloadType,
        sort_order: maxSort + 1
      })
    ) {
      onChanged();
    }
  };

  const removePick = async (link: LinkRow) => {
    if (await call(`${linksApi}/${link.linkUuid}`, 'DELETE')) {
      onChanged();
    }
  };

  // Reindex the WHOLE list to 0..n-1 instead of pairwise-swapping stored
  // values: swaps are no-ops between duplicate sort_orders (e.g. legacy or
  // double-pinned rows) and non-atomic on failure — reindexing self-heals
  // both on the first move.
  const movePick = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= links.length) {
      return;
    }
    const reordered = [...links];
    [reordered[index], reordered[target]] = [
      reordered[target],
      reordered[index]
    ];
    for (let i = 0; i < reordered.length; i += 1) {
      if (reordered[i].sortOrder !== i) {
        if (
          !(await call(`${linksApi}/${reordered[i].linkUuid}`, 'PATCH', {
            sort_order: i
          }))
        ) {
          break;
        }
      }
    }
    onChanged();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{title}</div>
        <Dialog>
          <DialogTrigger
            render={
              <Button variant="outline" size="sm">
                <Plus className="h-3.5 w-3.5 mr-1" />
                {_('Add products')}
              </Button>
            }
          />
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <ProductSelector
              onSelect={addPick}
              selectedProducts={links
                .filter((link) => link.product)
                .map((link) => ({
                  productId: String(link.product!.productId),
                  uuid: link.product!.uuid,
                  sku: link.product!.sku
                }))}
              disabledProductIds={selectorDisabledIds}
            />
          </DialogContent>
        </Dialog>
      </div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      {links.length === 0 && (
        <div className="text-sm text-muted-foreground border border-dashed border-divider rounded-md p-3">
          {_('No manual picks yet.')}
        </div>
      )}
      {links.map((link, index) => (
        <div
          key={link.linkUuid}
          className="flex items-center justify-between gap-2 rounded-md border border-divider px-3 py-2"
        >
          <div className="flex items-center gap-3 min-w-0">
            <ProductThumb
              url={link.product?.image?.url}
              name={link.product?.name || ''}
            />
            <div className="min-w-0">
              <div className="text-sm truncate">
                {link.product?.name || _('(product unavailable)')}
              </div>
              <div className="text-xs text-muted-foreground">
                {link.product?.sku}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <HiddenChip reason={link.hiddenReason} />
            <Button
              variant="ghost"
              size="sm"
              disabled={index === 0}
              onClick={(e) => {
                e.preventDefault();
                movePick(index, -1);
              }}
              aria-label={_('Move up')}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={index === links.length - 1}
              onClick={(e) => {
                e.preventDefault();
                movePick(index, 1);
              }}
              aria-label={_('Move down')}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                removePick(link);
              }}
              aria-label={_('Remove')}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

interface RecommendationsProps {
  product: {
    productId: number;
    relatedProductsMode: string;
    relatedProductsRules?: RulesEditorConfig | null;
    effectiveRelatedProductsRules: RulesEditorConfig;
    crossSellMode: string;
    excludeFromRecommendation: boolean;
    variantGroup?: {
      items?: Array<{ product?: { productId: number } | null } | null> | null;
    } | null;
  };
  linksApi: string;
  settingsUrl: string;
  attributes?: {
    items: Array<{ attributeCode: string; attributeName: string }>;
  };
}

export default function Recommendations({
  product,
  linksApi,
  settingsUrl,
  attributes
}: RecommendationsProps) {
  const { setValue, watch, formState } = useFormContext();
  const relatedMode =
    (watch('related_products_mode') as string | undefined) ??
    product.relatedProductsMode;
  const crossSellMode =
    (watch('cross_sell_mode') as string | undefined) ?? product.crossSellMode;

  // Reverting to inherit must NULL the stored rules (§ 6.4) — never leave a
  // dormant snapshot that resurrects later.
  React.useEffect(() => {
    if (relatedMode !== 'custom') {
      setValue('related_products_rules', null, { shouldDirty: true });
    }
  }, [relatedMode]);

  const [result, reexecuteQuery] = useQuery({
    query: DiagnosticsQuery,
    variables: { id: product.productId },
    pause: true
  });
  React.useEffect(() => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  }, []);
  const refresh = () => reexecuteQuery({ requestPolicy: 'network-only' });
  // The page form saves via fetch and stays on the page (no reload), so a
  // mode/rules change would otherwise leave these previews showing the
  // PRE-save resolution until a manual refresh. isSubmitSuccessful flips
  // after Form.tsx's submit handler resolves, i.e. after the PATCH landed.
  React.useEffect(() => {
    if (formState.isSubmitSuccessful) {
      refresh();
    }
  }, [formState.submitCount, formState.isSubmitSuccessful]);
  const diagnostics = result.data?.product;

  const selectorDisabledIds = [
    product.productId,
    ...(product.variantGroup?.items || [])
      .map((item) => item?.product?.productId)
      .filter((id): id is number => typeof id === 'number')
  ];

  const status = diagnostics?.recommendationStatus;
  const sourceBadge =
    relatedMode === 'custom' || status?.relatedRulesSource === 'product' ? (
      <span className="text-xs rounded-full bg-primary/10 px-2 py-0.5">
        {_('Overridden on this product')}
      </span>
    ) : status?.relatedRulesSource === 'category' ? (
      <span className="text-xs rounded-full bg-primary/10 px-2 py-0.5">
        {_('Source: category')}{' '}
        {status.sourceCategory?.editUrl ? (
          <a className="underline" href={status.sourceCategory.editUrl}>
            {status.sourceCategory?.name}
          </a>
        ) : (
          status.sourceCategory?.name
        )}
      </span>
    ) : (
      <span className="text-xs rounded-full bg-primary/10 px-2 py-0.5">
        <a className="underline" href={settingsUrl}>
          {_('Source: Global settings')}
        </a>
      </span>
    );

  const pinCandidate = async (uuid: string) => {
    const maxSort = crossSellLinks.reduce(
      (max, link) => Math.max(max, link.sortOrder),
      0
    );
    const response = await fetch(linksApi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        linked_product_id: uuid,
        type: 'cross_sell',
        sort_order: maxSort + 1
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      toast.error(data.message || _('Could not pin the product'));
    } else {
      refresh();
    }
  };

  const crossSellLinks: LinkRow[] = diagnostics?.crossSellLinks || [];
  const pinnedIds = new Set(
    crossSellLinks.map((link) => link.product?.productId)
  );

  return (
    <Card className="bg-popover">
      <CardHeader>
        <CardTitle>{_('Recommendations')}</CardTitle>
        <CardDescription>
          {_(
            'What the Related-products and Frequently-bought-together shelves show for this product. The Upsell shelf derives from the related rules (pricier matches only) — nothing to configure here.'
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">{_('Related products')}</div>
          {sourceBadge}
        </div>
        <RadioGroupField
          name="related_products_mode"
          label={_('Rules')}
          options={[
            {
              value: 'inherit',
              label: _('Inherit (category or global rules)')
            },
            { value: 'custom', label: _('Custom rules for this product') },
            { value: 'manual_only', label: _('Manual picks only') }
          ]}
          defaultValue={product.relatedProductsMode}
        />
        {relatedMode === 'custom' && (
          <div className="mt-3 rounded-md border border-divider p-3">
            <RelatedRulesEditor
              name="related_products_rules"
              initial={
                product.relatedProductsRules ||
                product.effectiveRelatedProductsRules
              }
              attributes={attributes?.items || []}
            />
          </div>
        )}
        <div className="mt-4">
          <PicksList
            title={_('Manual picks')}
            hint={_(
              'Always shown first, in this order, before any rules fill the remaining slots.'
            )}
            links={diagnostics?.relatedLinks || []}
            linksApi={linksApi}
            onChanged={refresh}
            selectorDisabledIds={selectorDisabledIds}
            addPayloadType="related"
          />
        </div>
        <div className="mt-4 rounded-md border border-divider p-3">
          <div className="text-sm font-medium">{_('Shoppers will see')}</div>
          <div className="text-xs text-muted-foreground mb-2">
            {_('Based on the last saved configuration.')}
            {relatedMode !== product.relatedProductsMode && (
              <span className="text-destructive">
                {' '}
                {_('Mode changed — save to update this preview.')}
              </span>
            )}
          </div>
          <ResolvedPreviewList
            rows={diagnostics?.relatedProductsResolved || []}
            emptyText={_(
              'Shoppers will see no related products for this product with the current configuration.'
            )}
            labelFor={(source) =>
              source === 'manual'
                ? _('manual pick')
                : source === 'bestsellers_fallback'
                ? _('bestseller fallback')
                : source.replace(/_/g, ' ')
            }
          />
        </div>
      </CardContent>

      <CardContent className="border-t border-t-border pt-6">
        <div className="text-sm font-semibold mb-3">
          {_('Frequently bought together')}
        </div>
        <RadioGroupField
          name="cross_sell_mode"
          label={_('Mode')}
          options={[
            { value: 'auto', label: _('Automatic (co-purchase data)') },
            { value: 'manual_only', label: _('Manual picks only') },
            {
              value: 'manual_first',
              label: _('Manual picks first, auto-fill the rest')
            }
          ]}
          defaultValue={product.crossSellMode}
          helperText={_(
            'Mode and manual picks apply to this variant only — configure siblings identically for group-wide behavior.'
          )}
        />
        {crossSellMode === 'auto' && crossSellLinks.length > 0 && (
          <div className="mt-2 text-xs text-destructive">
            {_(
              'Manual picks are ignored in Automatic mode — switch to “Manual first” or “Manual only” to use them.'
            )}
          </div>
        )}
        <div className="mt-4">
          <PicksList
            title={_('Manual picks')}
            links={crossSellLinks}
            linksApi={linksApi}
            onChanged={refresh}
            selectorDisabledIds={selectorDisabledIds}
            addPayloadType="cross_sell"
          />
        </div>
        <div className="mt-4">
          <div className="text-sm font-medium mb-1">
            {_('Computed from orders')}
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            {status
              ? _(
                  '${count} orders of this product · data from ${total} orders total',
                  {
                    count: String(status.anchorOrderCount),
                    total: String(status.totalOrderCount)
                  }
                )
              : ''}
          </div>
          {(diagnostics?.crossSellCandidates || []).length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed border-divider rounded-md p-3">
              {_(
                'No co-purchase data for this product yet — it accumulates as orders come in. With fallback enabled, the shelf shows bestsellers meanwhile (see below).'
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-1">{_('Product')}</th>
                  <th className="py-1 text-right">{_('Together')}</th>
                  <th className="py-1 text-right">{_('Confidence')}</th>
                  <th className="py-1 text-right">{_('Lift')}</th>
                  <th className="py-1 text-right">{_('Status')}</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {(diagnostics?.crossSellCandidates || []).map(
                  (candidate: {
                    coPurchaseCount: number;
                    confidence: number;
                    lift: number;
                    passesGates: boolean;
                    hiddenByCatalogFilter: boolean;
                    product: {
                      productId: number;
                      uuid: string;
                      name: string;
                    } | null;
                  }) => (
                    <tr
                      key={candidate.product?.productId || Math.random()}
                      className="border-t border-divider"
                    >
                      <td className="py-1.5 truncate max-w-[12rem]">
                        {candidate.product?.name || _('(unavailable)')}
                      </td>
                      <td className="py-1.5 text-right">
                        {candidate.coPurchaseCount}
                      </td>
                      <td className="py-1.5 text-right">
                        {Math.round(candidate.confidence * 100)}%
                      </td>
                      <td className="py-1.5 text-right">
                        {candidate.lift.toFixed(1)}
                      </td>
                      <td className="py-1.5 text-right text-xs">
                        {candidate.hiddenByCatalogFilter
                          ? _('hidden')
                          : candidate.passesGates
                          ? _('shown')
                          : _('below threshold')}
                      </td>
                      <td className="py-1.5 text-right">
                        {candidate.product &&
                          !pinnedIds.has(candidate.product.productId) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                pinCandidate(candidate.product!.uuid);
                              }}
                            >
                              {_('Pin')}
                            </Button>
                          )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>

      <CardContent className="border-t border-t-border pt-6">
        <div className="rounded-md border border-divider p-3">
          <div className="text-sm font-medium">
            {_('Shoppers will see (frequently bought together)')}
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            {_('Based on the last saved configuration.')}
            {crossSellMode !== product.crossSellMode && (
              <span className="text-destructive">
                {' '}
                {_('Mode changed — save to update this preview.')}
              </span>
            )}
          </div>
          <ResolvedPreviewList
            rows={diagnostics?.crossSellResolved || []}
            emptyText={_(
              'Shoppers will see no frequently-bought-together products with the current configuration.'
            )}
            labelFor={(source) =>
              source === 'manual'
                ? _('manual pick')
                : source === 'co_purchase'
                ? _('co-purchase data')
                : source === 'category_bestsellers'
                ? _('category bestsellers (fallback)')
                : _('store bestsellers (fallback)')
            }
          />
        </div>
      </CardContent>

      <CardContent className="border-t border-t-border pt-6">
        <ToggleField
          name="exclude_from_recommendation"
          label={_('Exclude this product from recommendations')}
          defaultValue={product.excludeFromRecommendation}
          helperText={_('Never suggest this product alongside others')}
        />
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 50
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      productId
      relatedProductsMode
      relatedProductsRules {
        enabled
        rules { type enabled attributeCodes scope }
        priceBand { enabled percent }
        fallbackToBestsellers
      }
      effectiveRelatedProductsRules {
        enabled
        rules { type enabled attributeCodes scope }
        priceBand { enabled percent }
        fallbackToBestsellers
      }
      crossSellMode
      excludeFromRecommendation
      variantGroup {
        items {
          product {
            productId
          }
        }
      }
    }
    linksApi: url(routeId: "addProductLink", params: [{key: "product_id", value: getContextValue("productUuid")}])
    settingsUrl: url(routeId: "catalogSetting")
    attributes(filters: [{key: "type", operation: eq, value: "select"}, {key: "limit", operation: eq, value: "100"}]) {
      items {
        attributeCode
        attributeName
      }
    }
  }
`;
