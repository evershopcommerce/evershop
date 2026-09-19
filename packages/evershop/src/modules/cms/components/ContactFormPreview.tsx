import React from 'react';

/**
 * Palette preview for the contact form. Mock heading, two half-width fields,
 * a message box and a button — no props, no context, no Tailwind (this renders
 * on the palette card, outside the storefront CSS scope).
 */
export default function ContactFormPreview(): React.ReactElement {
  return (
    <div
      className="evershop-contact-form__preview"
      style={{
        padding: 16,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        height: 130,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 10,
        color: '#2d2d2d'
      }}
    >
      <div style={{ fontWeight: 600 }}>Get in touch</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <span
          style={{
            flex: 1,
            height: 14,
            border: '1px solid #ebe5d8',
            borderRadius: 3
          }}
        />
        <span
          style={{
            flex: 1,
            height: 14,
            border: '1px solid #ebe5d8',
            borderRadius: 3
          }}
        />
      </div>
      <span
        style={{
          height: 34,
          border: '1px solid #ebe5d8',
          borderRadius: 3
        }}
      />
      <span
        style={{
          width: 70,
          height: 16,
          background: '#2a2520',
          borderRadius: 3
        }}
      />
    </div>
  );
}
