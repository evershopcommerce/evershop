import React from 'react';

/**
 * Palette preview for the FAQ block. Mock collapsed-question rows.
 */
export default function FaqBlockPreview(): React.ReactElement {
  return (
    <div
      className="evershop-faq-block__preview"
      style={{
        padding: 16,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        height: 130,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 10,
        color: '#2d2d2d'
      }}
    >
      <div style={{ fontWeight: 600 }}>Frequently asked</div>
      {['How long does shipping take?', "What's your return policy?", 'Do you ship internationally?'].map((q) => (
        <div
          key={q}
          className="evershop-faq-block__preview-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingBottom: 4,
            borderBottom: '1px solid #ebe5d8'
          }}
        >
          <span style={{ color: '#9b8e78' }}>▶</span>
          <span>{q}</span>
        </div>
      ))}
    </div>
  );
}
