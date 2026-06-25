import { getColumnClasses } from '@components/common/form/editor/GetColumnClasses.js';
import { getRowClasses } from '@components/common/form/editor/GetRowClasses.js';
import { Row } from '@components/common/form/Editor.js';
import { Image as ResponsiveImage } from '@components/common/Image.js';
import { ProductData } from '@components/frontStore/catalog/ProductContext.js';
import { ProductList } from '@components/frontStore/catalog/ProductList.js';
import React from 'react';
import { useQuery } from 'urql';
import './Editor.scss';

const Paragraph: React.FC<{ data: { text: string } }> = ({ data }) => {
  return <p dangerouslySetInnerHTML={{ __html: data.text }} />;
};

const Header: React.FC<{ data: { level: number; text: string } }> = ({
  data
}) => {
  const tagName = `h${data.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  return React.createElement(tagName, null, data.text);
};

const List: React.FC<{
  data: { items: string[]; style: 'ordered' | 'unordered' };
}> = ({ data }) => {
  const ListTag = data.style === 'ordered' ? 'ol' : 'ul';
  return (
    <ListTag>
      {data.items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ListTag>
  );
};

const Quote: React.FC<{ data: { text: string; caption?: string } }> = ({
  data
}) => {
  return (
    <blockquote>
      <p>&quot;{data.text}&quot;</p>
      {data.caption && <cite>- {data.caption}</cite>}
    </blockquote>
  );
};

const Image: React.FC<{
  data: {
    file: { url: string; width?: number; height?: number };
    caption?: string;
    withBorder?: boolean;
    withBackground?: boolean;
    stretched?: boolean;
    link?: string;
  };
  columnSize: number;
}> = ({ data, columnSize }) => {
  const { file, caption, withBorder, withBackground, stretched, link } = data;

  const imageStyles = {
    border: withBorder ? '1px solid #ccc' : 'none',
    backgroundColor: withBackground ? '#f9f9f9' : 'transparent',
    width: stretched ? '100%' : 'auto',
    display: 'block',
    maxWidth: '100%',
    margin: '0 auto'
  };

  const imageWidth = file.width || 800;
  const imageHeight =
    file.height || (file.width ? Math.round(file.width * 0.75) : 600);

  // Calculate responsive sizes based on the columnSize prop
  // columnSize represents the fraction of the row that this column occupies (e.g., 1/2, 1/3, 2/3, etc.)
  let sizesValue: string;

  sizesValue = '100vw'; // On mobile, always full viewport width

  if (columnSize <= 0.25) {
    sizesValue = '(max-width: 640px) 100vw, (max-width: 768px) 80vw, 25vw';
  } else if (columnSize <= 0.34) {
    sizesValue = '(max-width: 640px) 100vw, (max-width: 768px) 80vw, 33vw';
  } else if (columnSize <= 0.5) {
    sizesValue = '(max-width: 640px) 100vw, (max-width: 768px) 80vw, 50vw';
  } else if (columnSize <= 0.67) {
    sizesValue = '(max-width: 640px) 100vw, (max-width: 768px) 80vw, 67vw';
  } else if (columnSize <= 0.75) {
    sizesValue = '(max-width: 640px) 100vw, (max-width: 768px) 80vw, 75vw';
  } else {
    sizesValue = '(max-width: 640px) 100vw, 100vw';
  }

  const responsiveSizes = sizesValue;

  const imageElement = (
    <ResponsiveImage
      src={file.url}
      alt={caption || 'Image'}
      width={imageWidth}
      height={imageHeight}
      sizes={responsiveSizes}
      style={{ ...imageStyles }}
    />
  );

  return (
    <div className="editor-image-container">
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer">
          {imageElement}
        </a>
      ) : (
        imageElement
      )}
      {caption && (
        <p style={{ textAlign: 'center', marginTop: '10px' }}>{caption}</p>
      )}
    </div>
  );
};

const RawHtml: React.FC<{ data: { html: string } }> = ({ data }) => {
  return <div dangerouslySetInnerHTML={{ __html: data.html }} />;
};

interface SavedProduct {
  productId?: number;
  uuid?: string;
  sku: string;
  name: string;
  url?: string;
  image?: { url: string; alt?: string } | null;
  price?: {
    regular?: { value?: number; text?: string };
    special?: { value?: number; text?: string };
  };
  inStock?: boolean;
  status?: number;
}

const PRODUCT_LIST_QUERY = `
  query ProductListBlockProducts($filters: [FilterInput!]) {
    products(filters: $filters) {
      items {
        productId
        uuid
        sku
        name
        url
        price { regular { value text } special { value text } }
        image { url alt }
        inventory { isInStock }
      }
    }
  }
`;

const ProductListBlock: React.FC<{
  data: { products?: SavedProduct[]; columns?: number };
}> = ({ data }) => {
  const skus = (data.products ?? [])
    .filter((p) => p && p.sku)
    .map((p) => p.sku as string);

  // Re-fetch the selected products live by sku rather than rendering the saved
  // snapshot. The storefront `products` query returns only enabled + visible
  // items, so a product disabled or deleted after selection simply drops out —
  // no stale card, and no 404 when a shopper clicks it.
  const [result] = useQuery({
    query: PRODUCT_LIST_QUERY,
    variables: {
      filters: [
        { key: 'sku', operation: 'in', value: skus.join(',') },
        {
          key: 'limit',
          operation: 'eq',
          value: String(Math.max(skus.length, 1))
        }
      ]
    },
    pause: skus.length === 0
  });

  if (skus.length === 0) {
    return null;
  }

  const liveBySku = new Map<string, any>(
    (result.data?.products?.items ?? []).map((p: any) => [p.sku, p])
  );
  const products = skus
    .map((sku) => liveBySku.get(sku))
    .filter(Boolean)
    .map((p) => ({
      productId: p.productId,
      uuid: p.uuid ?? p.sku,
      name: p.name,
      sku: p.sku,
      description: [],
      url: p.url,
      image: p.image?.url ? { url: p.image.url, alt: p.image.alt } : undefined,
      price: {
        regular: {
          value: p.price?.regular?.value ?? 0,
          text: p.price?.regular?.text ?? ''
        },
        ...(p.price?.special?.text
          ? {
              special: {
                value: p.price.special.value ?? 0,
                text: p.price.special.text
              }
            }
          : {})
      },
      inventory: { isInStock: p.inventory?.isInStock ?? true }
    })) as ProductData[];

  if (products.length === 0) {
    return null;
  }

  return <ProductList products={products} gridColumns={data.columns ?? 4} />;
};

const RenderEditorJS: React.FC<{
  blocks: Array<{ type: string; data: any }>;
  columnSize: number; // Renamed from 'size' to 'columnSize' for clarity
}> = ({ blocks, columnSize }) => {
  return (
    <div className="prose prose-base max-w-none text-base">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'paragraph':
            return <Paragraph key={index} data={block.data} />;
          case 'header':
            return <Header key={index} data={block.data} />;
          case 'list':
            return <List key={index} data={block.data} />;
          case 'image':
            return (
              <Image key={index} data={block.data} columnSize={columnSize} />
            );
          case 'quote':
            return <Quote key={index} data={block.data} />;
          case 'raw':
            return <RawHtml key={index} data={block.data} />;
          case 'productList':
            return <ProductListBlock key={index} data={block.data} />;
          default:
            return null;
        }
      })}
    </div>
  );
};

interface EditorProps {
  rows: Row[];
}

export function Editor({ rows }: EditorProps) {
  return (
    <div className="editor__html space-y-6">
      {rows.map((row, index) => {
        const rowClasses = getRowClasses(row.size);
        return (
          <div
            className={`row__container grid ${rowClasses} grid-cols-1 gap-5`}
            key={index}
          >
            {row.columns.map((column, index) => {
              const columnClasses = getColumnClasses(column.size);
              return (
                <div
                  className={`column__container ${columnClasses} col-span-1`}
                  key={index}
                >
                  {column.data?.blocks && (
                    <RenderEditorJS
                      blocks={column.data?.blocks}
                      columnSize={column.size / row.size}
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
