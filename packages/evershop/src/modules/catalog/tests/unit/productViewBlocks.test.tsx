import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppProvider } from '../../../../components/common/context/app.js';
import {
  ProductData,
  ProductProvider
} from '../../../../components/frontStore/catalog/ProductContext.js';
import ProductAttributes, { layout as attributesLayout } from '../../pages/frontStore/productView/ProductAttributes.js';
import ProductDescription, { layout as descriptionLayout } from '../../pages/frontStore/productView/ProductDescription.js';
import ProductForm, { layout as formLayout } from '../../pages/frontStore/productView/ProductForm.js';
import ProductMedia, { layout as mediaLayout } from '../../pages/frontStore/productView/ProductMedia.js';
import ProductName, { layout as nameLayout } from '../../pages/frontStore/productView/ProductName.js';
import ProductPrice, { layout as priceLayout } from '../../pages/frontStore/productView/ProductPrice.js';

// The product page shell (ProductView.tsx) owns the query, the provider and the
// Areas; these blocks register into the Areas so `themes/<id>/layouts.json` can
// move them without a fork of the shell.
const product = {
  name: 'Court sneaker',
  sku: 'SNK-1',
  attributes: [],
  price: { regular: { value: 110, text: '$110.00' }, special: { value: 90, text: '$90.00' } },
  description: [
    {
      id: 'r1',
      size: 1,
      columns: [{ id: 'c1', size: 1, data: { blocks: [{ type: 'paragraph', data: { text: 'Cut in our atelier.' } }] } }]
    }
  ]
} as unknown as ProductData;

const appState = {
  config: { pageMeta: { route: { id: 'productView' } } },
  widgets: []
} as unknown as React.ComponentProps<typeof AppProvider>['value'];

const inShell = (el: React.ReactElement) =>
  renderToStaticMarkup(
    <AppProvider value={appState}>
      <ProductProvider product={product}>{el}</ProductProvider>
    </AppProvider>
  );
const outsideShell = (el: React.ReactElement) =>
  renderToStaticMarkup(<AppProvider value={appState}>{el}</AppProvider>);

describe('product page blocks', () => {
  it('keep the default slots the shell had when the pieces were inline', () => {
    expect(mediaLayout).toEqual({ areaId: 'productPageMiddleLeft', sortOrder: 0 });
    expect(nameLayout).toEqual({ areaId: 'productPageMiddleRight', sortOrder: 10 });
    expect(formLayout).toEqual({ areaId: 'productPageMiddleRight', sortOrder: 30 });
    expect(priceLayout).toEqual({ areaId: 'productSinglePageForm', sortOrder: 5 });
    expect(attributesLayout).toEqual({ areaId: 'productSinglePageForm', sortOrder: 7 });
    expect(descriptionLayout).toEqual({ areaId: 'productSingleDescription', sortOrder: 10 });
  });

  it('render the shared components from the product context, without props', () => {
    expect(inShell(<ProductName />)).toContain('product__single__name');
    expect(inShell(<ProductName />)).toContain('Court sneaker');
    const price = inShell(<ProductPrice />);
    expect(price).toContain('product__single__price');
    expect(price).toContain('$90.00');
    expect(price).toContain('line-through');
    expect(() => inShell(<ProductAttributes />)).not.toThrow();
    const description = inShell(<ProductDescription />);
    expect(description).toContain('product__single__description');
    expect(description).toContain('Cut in our atelier.');
  });

  it('throw outside the shell, so a wrong layouts.json placement fails loudly for the developer', () => {
    for (const el of [<ProductMedia />, <ProductName />, <ProductForm />, <ProductPrice />, <ProductAttributes />, <ProductDescription />]) {
      expect(() => outsideShell(el)).toThrow('within a ProductProvider');
    }
  });
});
