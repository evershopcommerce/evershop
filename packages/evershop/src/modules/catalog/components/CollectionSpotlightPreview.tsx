import React from 'react';

/** Palette preview for the collection spotlight widget. */
export default function CollectionSpotlightPreview(): React.ReactElement {
  return (
    <div
      className="evershop-collection-spotlight__preview"
      style={{
        padding: 16,
        background: '#ffffff',
        display: 'grid',
        gridTemplateColumns: '1fr 1.4fr',
        gap: 8,
        height: 130
      }}
    >
      <div
        style={{
          background:
            'repeating-linear-gradient(135deg, #d6cebc 0 4px, #cdc5b1 4px 8px)',
          borderRadius: 4
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 9,
          color: '#5a5a5a'
        }}
      >
        <div style={{ fontSize: 8, color: '#9b8e78', letterSpacing: '0.08em' }}>
          COLLECTION
        </div>
        <div style={{ fontWeight: 700, color: '#2d2d2d', fontSize: 11 }}>
          The Summer Edit
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 4,
            flex: 1
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background:
                  'repeating-linear-gradient(135deg, #f5efe2 0 4px, #ebe5d8 4px 8px)',
                borderRadius: 3
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
