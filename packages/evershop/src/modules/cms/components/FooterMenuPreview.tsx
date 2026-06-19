import React from 'react';

/**
 * Stylized preview of the `footer_menu` widget — three columns, each a short
 * title bar over a few link lines. Self-contained, no runtime dependencies.
 */

const COLUMNS: number[] = [4, 3, 3];

function Bar({
  width,
  strong = false
}: {
  width: string;
  strong?: boolean;
}): React.ReactElement {
  return (
    <span
      style={{
        display: 'block',
        width,
        height: strong ? 6 : 5,
        borderRadius: 2,
        background: '#2a2520',
        opacity: strong ? 0.85 : 0.5
      }}
    />
  );
}

export default function FooterMenuPreview(): React.ReactElement {
  return (
    <div
      className="evershop-footer-menu__preview"
      style={{
        display: 'flex',
        gap: 20,
        background: '#ffffff',
        padding: 20,
        height: 130
      }}
    >
      {COLUMNS.map((rows, col) => (
        <div
          key={col}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 9
          }}
        >
          <Bar width="55%" strong />
          <div style={{ height: 2 }} />
          {Array.from({ length: rows }).map((_, i) => (
            <Bar key={i} width={`${85 - i * 8}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}
