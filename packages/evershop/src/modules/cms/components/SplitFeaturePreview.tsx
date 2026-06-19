import React from 'react';

/** Palette preview for the split feature widget. */
export default function SplitFeaturePreview(): React.ReactElement {
  return (
    <div
      className="evershop-split-feature__preview"
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
            'repeating-linear-gradient(135deg, #f5efe2 0 4px, #ebe5d8 4px 8px)',
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
        <div style={{ height: 4, width: 50, background: '#9b8e78' }} />
        <div
          style={{ fontSize: 10, fontWeight: 600, color: '#2d2d2d', marginTop: 2 }}
        >
          Headline
        </div>
        <div style={{ height: 3, width: 90, background: '#bdb5a5' }} />
        <div style={{ height: 3, width: 70, background: '#bdb5a5' }} />
        <div
          style={{
            marginTop: 4,
            height: 14,
            width: 60,
            background: '#2d2d2d',
            borderRadius: 3
          }}
        />
      </div>
    </div>
  );
}
