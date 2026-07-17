import React from 'react';

const TILE_COLORS = ['#e8d9c5', '#c8a882', '#f0e8db'];

/**
 * Stylized palette preview for the `frequently_bought_together` widget —
 * three tiles joined by "+" glyphs, the classic FBT visual. Static mock: the
 * preview iframe has no product context (specifications/05 § 9.1).
 */
export default function FrequentlyBoughtTogetherPreview(): React.ReactElement {
  return (
    <div
      className="evershop-fbt__preview"
      style={{ padding: 16, background: '#ffffff', height: 130 }}
    >
      <div
        style={{
          width: '55%',
          height: 8,
          borderRadius: 2,
          background: '#4a3c2e',
          marginBottom: 12
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        {TILE_COLORS.map((color, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#8a7a66'
                }}
              >
                +
              </span>
            )}
            <div
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
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
