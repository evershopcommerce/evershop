import React from 'react';

const TILE_COLORS = ['#c5d8e8', '#82a8c8', '#dbe8f0'];

/**
 * Stylized palette preview for the `cart_frequently_bought_together` widget
 * — a cart glyph joined to three tiles, the "goes with your cart" visual.
 * Static mock: the preview iframe has no cart context.
 */
export default function CartFrequentlyBoughtTogetherPreview(): React.ReactElement {
  return (
    <div
      className="evershop-cart-fbt__preview"
      style={{ padding: 16, background: '#ffffff', height: 130 }}
    >
      <div
        style={{
          width: '55%',
          height: 8,
          borderRadius: 2,
          background: '#2e3c4a',
          marginBottom: 12
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 34,
            height: 70,
            borderRadius: 3,
            background: '#2e3c4a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: 18
          }}
        >
          🛒
        </div>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#66788a' }}>
          +
        </span>
        {TILE_COLORS.map((color, i) => (
          <div
            key={i}
            style={{
              background: color,
              borderRadius: 3,
              height: 70,
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
