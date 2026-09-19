import React from 'react';

/**
 * Palette preview for the trust-strip widget. Self-contained — renders a
 * static row of generic USP cells.
 */
export default function TrustStripPreview(): React.ReactElement {
  return (
    <div
      className="evershop-trust-strip__preview"
      style={{
        padding: 16,
        background: '#ffffff',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
        height: 130
      }}
    >
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="evershop-trust-strip__preview-item"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 9,
            color: '#5a5a5a'
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              border: '1px dashed #c9bca7',
              background: '#faf6ee'
            }}
          />
          <div style={{ height: 6, width: 38, background: '#2d2d2d' }} />
          <div style={{ height: 4, width: 28, background: '#bdb5a5' }} />
        </div>
      ))}
    </div>
  );
}
