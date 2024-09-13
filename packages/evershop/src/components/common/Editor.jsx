import React from 'react';
import PropTypes from 'prop-types';
import getRowClasses from './form/fields/editor/GetRowClasses';
import getColumnClasses from './form/fields/editor/GetColumnClasses';

function Paragraph({ data }) {
  return <p dangerouslySetInnerHTML={{ __html: data.text }} />;
}

Paragraph.propTypes = {
  data: PropTypes.shape({
    text: PropTypes.string.isRequired
  }).isRequired
};

function Header({ data }) {
  const Tag = `h${data.level}`;
  return <Tag>{data.text}</Tag>;
}

Header.propTypes = {
  data: PropTypes.shape({
    level: PropTypes.number.isRequired,
    text: PropTypes.string.isRequired
  }).isRequired
};

function List({ data }) {
  return (
    <ul>
      {data.items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

List.propTypes = {
  data: PropTypes.shape({
    items: PropTypes.arrayOf(PropTypes.string).isRequired
  }).isRequired
};

function Quote({ data }) {
  return (
    <blockquote>
      <p>&quot;{data.text}&quot;</p>
      {data.caption && <cite>- {data.caption}</cite>}
    </blockquote>
  );
}

Quote.propTypes = {
  data: PropTypes.shape({
    text: PropTypes.string.isRequired,
    caption: PropTypes.string
  }).isRequired
};

function Image({ data }) {
  const { file, caption, withBorder, withBackground, stretched, url } = data;

  const imageStyles = {
    border: withBorder ? '1px solid #ccc' : 'none',
    backgroundColor: withBackground ? '#f9f9f9' : 'transparent',
    width: stretched ? '100%' : 'auto',
    display: 'block',
    maxWidth: '100%',
    margin: '0 auto' // Center the image if not stretched
  };

  const imageElement = (
    <img src={file.url} alt={caption || 'Image'} style={imageStyles} />
  );

  return (
    <div>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
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
}

Image.propTypes = {
  data: PropTypes.shape({
    file: PropTypes.shape({
      url: PropTypes.string.isRequired
    }).isRequired,
    caption: PropTypes.string,
    withBorder: PropTypes.bool,
    withBackground: PropTypes.bool,
    stretched: PropTypes.bool,
    url: PropTypes.string
  }).isRequired
};

function RawHtml({ data }) {
  return <div dangerouslySetInnerHTML={{ __html: data.html }} />;
}

RawHtml.propTypes = {
  data: PropTypes.shape({
    html: PropTypes.string.isRequired
  }).isRequired
};

function RenderEditorJS({ blocks }) {
  return (
    <div className="prose prose-base max-w-none">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'paragraph':
            return <Paragraph key={index} data={block.data} />;
          case 'header':
            return <Header key={index} data={block.data} />;
          case 'list':
            return <List key={index} data={block.data} />;
          case 'image':
            return <Image key={index} data={block.data} />;
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
}

RenderEditorJS.propTypes = {
  blocks: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string.isRequired,
      // eslint-disable-next-line react/forbid-prop-types
      data: PropTypes.object.isRequired
    })
  ).isRequired
};

export default function Editor({ rows }) {
  return (
    <div className="editor__html">
      {rows.map((row, index) => {
        const rowClasses = getRowClasses(row.size);
        return (
          <div
            className={`row__container mt-12 grid md:${rowClasses} grid-cols-1 gap-8`}
            key={index}
          >
            {row.columns.map((column, index) => {
              const columnClasses = getColumnClasses(column.size);
              return (
                <div
                  className={`column__container md:${columnClasses} col-span-1`}
                  key={index}
                >
                  {column.data?.blocks && (
                    <RenderEditorJS blocks={column.data?.blocks} />
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

Editor.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      size: PropTypes.number.isRequired,
      columns: PropTypes.arrayOf(
        PropTypes.shape({
          size: PropTypes.number.isRequired,
          // eslint-disable-next-line react/forbid-prop-types
          data: PropTypes.object
        })
      ).isRequired
    })
  ).isRequired
};
