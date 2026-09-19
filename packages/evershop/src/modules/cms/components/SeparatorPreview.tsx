import React from 'react';

/** Palette preview for the separator widget. */
export default function SeparatorPreview(): React.ReactElement {
  return (
    <div
      className="evershop-separator__preview"
      style={{
        padding: 16,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        height: 130
      }}
    >
      <div
        style={{
          height: 16,
          background:
            'repeating-linear-gradient(135deg, #f5efe2 0 4px, #ebe5d8 4px 8px)',
          borderRadius: 3
        }}
      />
      <div
        style={{
          padding: '14px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{ flex: 1, height: 1, background: '#bdb5a5' }} />
      </div>
      <div
        style={{
          height: 16,
          background:
            'repeating-linear-gradient(135deg, #f5efe2 0 4px, #ebe5d8 4px 8px)',
          borderRadius: 3
        }}
      />
    </div>
  );
}
