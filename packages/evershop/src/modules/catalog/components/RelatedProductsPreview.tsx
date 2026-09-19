import React from 'react';

const TILE_COLORS = ['#d8e3f0', '#a9c1d9', '#e8eef5', '#8fa8c0'];

/**
 * Stylized palette preview for the `related_products` widget. Static mock by
 * necessity, not just convention: the preview iframe has no product context
 * (specifications/05 § 9.1), so it must render without data or queries.
 */
export default function RelatedProductsPreview(): React.ReactElement {
  return (
    <div
      className="evershop-related-products__preview"
      style={{ padding: 16, background: '#ffffff', height: 130 }}
    >
      <div
        style={{
          width: '40%',
          height: 8,
          borderRadius: 2,
          background: '#3a4a5c',
          marginBottom: 12
        }}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8
        }}
      >
        {TILE_COLORS.map((color, i) => (
          <div
            key={i}
            style={{
              background: color,
              borderRadius: 3,
              height: 70,
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
            <span
              style={{
                width: '40%',
                height: 4,
                borderRadius: 1,
                background: 'rgba(0,0,0,0.2)'
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
