import React from 'react';

const TILES = [
  { color: '#d6d0e8', height: 52 },
  { color: '#b3a8d4', height: 62 },
  { color: '#9184c2', height: 72 }
];

/**
 * Stylized palette preview for the `upsell_products` widget — three tiles of
 * ascending height, the "step up" visual. Static mock: the preview iframe
 * has no product context (specifications/05 § 9.1).
 */
export default function UpsellProductsPreview(): React.ReactElement {
  return (
    <div
      className="evershop-upsell__preview"
      style={{ padding: 16, background: '#ffffff', height: 130 }}
    >
      <div
        style={{
          width: '55%',
          height: 8,
          borderRadius: 2,
          background: '#3d3654',
          marginBottom: 12
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          height: 72
        }}
      >
        {TILES.map((tile, i) => (
          <div
            key={i}
            style={{
              background: tile.color,
              borderRadius: 3,
              height: tile.height,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: 4,
              gap: 4
            }}
          >
            <span
              style={{
                width: '70%',
                height: 4,
                borderRadius: 1,
                background: 'rgba(0,0,0,0.35)'
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
