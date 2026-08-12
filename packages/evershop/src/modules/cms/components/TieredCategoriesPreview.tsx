import React from 'react';

/** Palette preview for the tiered categories widget. */
export default function TieredCategoriesPreview(): React.ReactElement {
  return (
    <div
      className="evershop-tiered-categories__preview"
      style={{
        padding: 16,
        background: '#ffffff',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        height: 130,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 9,
        color: '#5a5a5a'
      }}
    >
      {[0, 1].map((i) => (
        <div key={i} className="evershop-tiered-categories__preview-group" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div
            style={{
              flex: 1,
              background:
                'repeating-linear-gradient(135deg, #f5efe2 0 4px, #ebe5d8 4px 8px)',
              borderRadius: 4
            }}
          />
          <div style={{ color: '#2d2d2d', fontWeight: 600 }}>
            {i === 0 ? 'Women' : 'Men'}
          </div>
          <div>Sub · Sub · Shop all →</div>
        </div>
      ))}
    </div>
  );
}
