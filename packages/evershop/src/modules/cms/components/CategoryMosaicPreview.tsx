import React from 'react';

/** Palette preview for the category mosaic widget. */
export default function CategoryMosaicPreview(): React.ReactElement {
  return (
    <div
      className="evershop-category-mosaic__preview"
      style={{
        padding: 16,
        background: '#ffffff',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        height: 130
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="evershop-category-mosaic__preview-tile"
          style={{
            background:
              'repeating-linear-gradient(135deg, #f5efe2 0 4px, #ebe5d8 4px 8px)',
            borderRadius: 4,
            position: 'relative',
            color: '#ffffff',
            fontSize: 9,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(to top, rgba(0,0,0,0.5), transparent 60%)',
              borderRadius: 4
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 6,
              left: 6,
              right: 6,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>Category</span>
            <span>→</span>
          </div>
        </div>
      ))}
    </div>
  );
}
