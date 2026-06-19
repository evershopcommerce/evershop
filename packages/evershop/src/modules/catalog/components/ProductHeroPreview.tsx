import React from 'react';

/** Palette preview for the product hero widget. */
export default function ProductHeroPreview(): React.ReactElement {
  return (
    <div
      className="evershop-product-hero__preview"
      style={{
        padding: 16,
        background: '#ffffff',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
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
          justifyContent: 'center',
          gap: 4,
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 9,
          color: '#5a5a5a'
        }}
      >
        <div style={{ fontSize: 8, color: '#9b8e78', letterSpacing: '0.08em' }}>
          FEATURED
        </div>
        <div style={{ fontWeight: 700, color: '#2d2d2d', fontSize: 11 }}>
          The Original Tote
        </div>
        <div style={{ color: '#2d2d2d', fontWeight: 600 }}>$78.00</div>
        <div style={{ height: 3, width: 90, background: '#bdb5a5' }} />
        <div
          style={{
            marginTop: 5,
            display: 'inline-block',
            padding: '4px 12px',
            background: '#2d2d2d',
            color: '#ffffff',
            borderRadius: 3,
            width: 60,
            textAlign: 'center'
          }}
        >
          View →
        </div>
      </div>
    </div>
  );
}
