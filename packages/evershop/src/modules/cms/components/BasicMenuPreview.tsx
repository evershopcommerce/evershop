import React from 'react';

const ITEM_WIDTHS = [48, 64, 56, 72, 52];

/**
 * Stylized preview of the `basic_menu` widget — a row of navigation pills.
 * Self-contained, no runtime dependencies.
 */
export default function BasicMenuPreview(): React.ReactElement {
  return (
    <div
      className="evershop-basic-menu__preview"
      style={{
        padding: '24px 20px',
        background: '#ffffff',
        height: 130,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}
    >
      {ITEM_WIDTHS.map((w, i) => (
        <span
          key={i}
          className="evershop-basic-menu__preview-item"
          style={{
            width: w,
            height: 10,
            borderRadius: 3,
            background: '#2a2520',
            opacity: i === 0 ? 0.9 : 0.55
          }}
        />
      ))}
    </div>
  );
}
