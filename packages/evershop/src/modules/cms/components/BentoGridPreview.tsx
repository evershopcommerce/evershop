import React from 'react';

/** Palette preview for the bento grid widget. */
export default function BentoGridPreview(): React.ReactElement {
  return (
    <div
      className="evershop-bento-grid__preview"
      style={{
        padding: 16,
        background: '#ffffff',
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 8,
        height: 130
      }}
    >
      <div
        className="evershop-bento-grid__preview-tile evershop-bento-grid__preview-tile--hero"
        style={{
          gridColumn: '1 / 2',
          gridRow: '1 / 3',
          background:
            'repeating-linear-gradient(135deg, #d6cebc 0 4px, #cdc5b1 4px 8px)',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'flex-end',
          padding: 8,
          color: '#ffffff',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 9
        }}
      >
        The Summer Edit
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="evershop-bento-grid__preview-tile"
          style={{
            background: '#faf6ee',
            border: '1px solid #ebe5d8',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 9,
            color: '#5a5a5a'
          }}
        >
          Tile
        </div>
      ))}
    </div>
  );
}
