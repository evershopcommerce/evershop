import React from 'react';

/**
 * Stylized preview of the `banner` widget — one filled hero block with an
 * overlaid title + CTA pill. Self-contained, no runtime dependencies.
 */
export default function BannerPreview(): React.ReactElement {
  return (
    <div
      className="evershop-banner__preview"
      style={{
        background: '#efe6d4',
        height: 130,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 8
      }}
    >
      <span
        style={{
          width: '32%',
          height: 5,
          borderRadius: 2,
          background: '#2a2520',
          opacity: 0.55
        }}
      />
      <span
        style={{
          width: '78%',
          height: 11,
          borderRadius: 2,
          background: '#2a2520'
        }}
      />
      <span
        style={{
          width: '64%',
          height: 11,
          borderRadius: 2,
          background: '#2a2520'
        }}
      />
      <span
        style={{
          marginTop: 6,
          width: 72,
          height: 18,
          borderRadius: 999,
          background: '#2a2520'
        }}
      />
    </div>
  );
}
