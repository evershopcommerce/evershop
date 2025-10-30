import { getColumnClasses } from '@components/common/form/editor/GetColumnClasses.js';
import { getRowClasses } from '@components/common/form/editor/GetRowClasses.js';
import { Row } from '@components/common/form/Editor.js';
import { Image as ResponsiveImage } from '@components/common/Image.js';
import React from 'react';
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

const List: React.FC<{ data: { items: string[] } }> = ({ data }) => {
  return (
    <ul>
      {data.items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
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
