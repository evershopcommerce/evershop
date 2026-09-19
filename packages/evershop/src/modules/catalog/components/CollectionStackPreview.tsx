import React from 'react';

/** Palette preview for the collection stack widget. */
export default function CollectionStackPreview(): React.ReactElement {
  return (
    <div
      className="evershop-collection-stack__preview"
      style={{
        padding: 16,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        height: 130,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 9,
        color: '#5a5a5a'
      }}
    >
      {[0, 1].map((row) => (
        <div key={row} className="evershop-collection-stack__preview-row">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 3
            }}
          >
            <span style={{ color: '#2d2d2d', fontWeight: 600 }}>
              {row === 0 ? 'The Linen Edit' : 'Wardrobe Basics'}
            </span>
            <span>View all →</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 4
            }}
          >
            {[0, 1, 2, 3].map((c) => (
              <div
                key={c}
                style={{
                  background:
                    'repeating-linear-gradient(135deg, #f5efe2 0 4px, #ebe5d8 4px 8px)',
                  height: 32,
                  borderRadius: 3
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
