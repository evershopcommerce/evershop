import { Image } from '@components/admin/ImageUploader.js';
import { Button } from '@components/common/ui/Button.js';
import { CardContent } from '@components/common/ui/Card.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@components/common/ui/Select.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useQuery } from 'urql';
import { VariantGroup } from '../VariantGroup.js';
import { CreateVariant } from './CreateVariant.js';
import { Skeleton } from './Skeleton.js';
import { Variant } from './Variant.js';

export const VariantQuery = `
query Query($productId: ID!) {
  product(id: $productId) {
    variantGroup {
      items {
        id
        attributes {
          attributeId
          attributeCode
          optionId
          optionText
        }
        product {
          productId
          uuid
          name
          sku
          qty
          status
          urlKey
          visibility
          price {
            regular {
              value
              currency
              text
            }
          }
          inventory {
            qty
            isInStock
            stockAvailability
            manageStock
          }
          editUrl
          updateApi
          image {
            uuid
            url
          }
          gallery {
            uuid
            url
          }
        }
      }
    }
  }
}
`;

export interface VariantsProps {
  productId: number;
  productUuid: string;
  variantGroup: VariantGroup;
  createProductApi: string;
}

export interface VariantItem {
  id: number;
  attributes: Array<{
    attributeId: number;
    attributeCode: string;
    optionId: number;
    optionText: string;
  }>;
  product: {
    productId: number;
    uuid: string;
    name: string;
    sku: string;
    qty: number;
    status: number;
    visibility: number;
    price: {
      regular: {
        value: number;
        currency: string;
        text: string;
      };
    };
    inventory: {
      qty: number;
      isInStock: boolean;
      stockAvailability: string;
      manageStock: boolean;
    };
    urlKey: string;
    editUrl: string;
    updateApi: string;
    image: Image;
    gallery: Array<Image>;
  };
}

export const Variants: React.FC<VariantsProps> = ({
  productId,
  variantGroup,
  createProductApi
}) => {
  const [result, reexecuteQuery] = useQuery({
    query: VariantQuery,
    variables: {
      productId
    }
  });

  const refresh = () => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const { data, fetching, error } = result as {
    data: {
      product: {
        variantGroup: {
          items: Array<VariantItem>;
        };
      };
    };
    fetching: boolean;
    error: Error | null;
  };

  // One entry per variant axis: '' / absent means "all".
  const [optionFilters, setOptionFilters] = React.useState<
    Record<string, string>
  >({});

  const variants = React.useMemo(
    () =>
      (data?.product?.variantGroup?.items || []).filter(
        (v) => v.product.productId !== productId
      ),
    [data, productId]
  );

  // Filter choices come from the variants actually present, so every entry
  // matches at least one row.
  const filterOptions = React.useMemo(() => {
    const byCode: Record<string, Map<string, string>> = {};
    variants.forEach((v) => {
      v.attributes.forEach((a) => {
        if (a.optionId === null || a.optionId === undefined) return;
        byCode[a.attributeCode] = byCode[a.attributeCode] || new Map();
        byCode[a.attributeCode].set(a.optionId.toString(), a.optionText);
      });
    });
    return byCode;
  }, [variants]);

  const activeFilters = Object.entries(optionFilters).filter(([, v]) => v);
  const filteredVariants = variants.filter((v) =>
    activeFilters.every(
      ([code, optionId]) =>
        v.attributes
          .find((a) => a.attributeCode === code)
          ?.optionId?.toString() === optionId
    )
  );

  if (fetching) {
    return (
      <div className="p-2 flex justify-center items-center">
        <Skeleton />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">{error.message}</p>;
  }

  const columnCount = variantGroup.attributes.length + 6;

  return (
    <CardContent>
      {variants.length > 5 && (
        <div className="variant-filters flex flex-wrap items-center gap-2 mb-3">
          {variantGroup.attributes.map((attribute) => {
            const options = filterOptions[attribute.attributeCode];
            if (!options || options.size < 2) return null;
            const selected = optionFilters[attribute.attributeCode] || '';
            return (
              <Select
                key={attribute.attributeId}
                value={selected || undefined}
                onValueChange={(value) =>
                  setOptionFilters((prev) => ({
                    ...prev,
                    [attribute.attributeCode]:
                      !value || value === 'all' ? '' : value
                  }))
                }
              >
                <SelectTrigger size="sm" className="w-40">
                  {/* The attribute name doubles as the placeholder; once an
                      option is picked the trigger shows the option text. */}
                  <SelectValue
                    className={selected ? '' : 'text-muted-foreground'}
                  >
                    {selected
                      ? options.get(selected)
                      : attribute.attributeName}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {_('All ${attribute}', {
                      attribute: attribute.attributeName
                    })}
                  </SelectItem>
                  {[...options.entries()].map(([optionId, optionText]) => (
                    <SelectItem key={optionId} value={optionId}>
                      {optionText}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })}
          {activeFilters.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {_('${count} of ${total}', {
                  count: filteredVariants.length.toString(),
                  total: variants.length.toString()
                })}
              </span>
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2 text-sm"
                onClick={() => setOptionFilters({})}
              >
                {_('Clear')}
              </Button>
            </>
          )}
        </div>
      )}
      <div className="variant-list max-h-96 overflow-auto rounded-md border border-border">
        <Table className="[&_td]:py-1.5">
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead>{_('Image')}</TableHead>
              {variantGroup.attributes.map((attribute) => (
                <TableHead key={attribute.attributeId}>
                  {attribute.attributeName}
                </TableHead>
              ))}
              <TableHead>{_('Sku')}</TableHead>
              <TableHead>{_('Price')}</TableHead>
              <TableHead>{_('Stock')}</TableHead>
              <TableHead>{_('Status')}</TableHead>
              <TableHead>{_('Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVariants.map((v) => (
              <Variant
                key={v.id}
                variant={v}
                refresh={refresh}
                variantGroup={variantGroup}
              />
            ))}
            {filteredVariants.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="text-center text-muted-foreground py-6"
                >
                  {activeFilters.length > 0 ? (
                    <>
                      {_('No variants match the selected options.')}{' '}
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-sm"
                        onClick={() => setOptionFilters({})}
                      >
                        {_('Clear filters')}
                      </Button>
                    </>
                  ) : (
                    _('This product has no other variants yet.')
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="self-center">
        <CreateVariant
          variantGroup={variantGroup}
          createProductApi={createProductApi}
          refresh={refresh}
        />
      </div>
    </CardContent>
  );
};
