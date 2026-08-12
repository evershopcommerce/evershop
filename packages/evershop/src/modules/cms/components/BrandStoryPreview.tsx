import React from 'react';

/** Palette preview for the brand story widget. */
export default function BrandStoryPreview(): React.ReactElement {
  return (
    <div
      className="evershop-brand-story__preview"
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
        <div style={{ fontSize: 8, color: '#9b8e78', letterSpacing: '0.08em' }}>
          OUR STORY
        </div>
        <div style={{ fontWeight: 700, color: '#2d2d2d', fontSize: 11 }}>
          Made by hand
        </div>
        <div style={{ height: 3, width: 110, background: '#bdb5a5' }} />
        <div style={{ height: 3, width: 90, background: '#bdb5a5' }} />
        <div style={{ height: 3, width: 100, background: '#bdb5a5' }} />
        <div style={{ marginTop: 4, color: '#2d2d2d' }}>Read more →</div>
      </div>
    </div>
  );
}
