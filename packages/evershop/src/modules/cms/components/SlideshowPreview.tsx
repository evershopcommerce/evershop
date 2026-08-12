import React from 'react';

/**
 * Stylized preview of the `simple_slider` widget — one main slide tile with
 * pagination dots underneath. Self-contained, no runtime dependencies.
 */
export default function SlideshowPreview(): React.ReactElement {
  return (
    <div
      className="evershop-slideshow__preview"
      style={{
        padding: 16,
        background: '#ffffff',
        height: 130,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}
    >
      <div
        style={{
          flex: 1,
          background: '#d8dfd0',
          borderRadius: 4,
          position: 'relative'
        }}
      >
        {/* Left / right arrow hints */}
        <span
          style={{
            position: 'absolute',
            left: 6,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 12,
            height: 12,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.85)'
          }}
        />
        <span
          style={{
            position: 'absolute',
            right: 6,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 12,
            height: 12,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.85)'
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: i === 0 ? '#2a2520' : '#d4cab5'
            }}
          />
        ))}
      </div>
    </div>
  );
}
