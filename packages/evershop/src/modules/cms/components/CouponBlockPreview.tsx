import React from 'react';

/**
 * Palette preview for the coupon block. Mock dashed-bordered offer panel.
 */
export default function CouponBlockPreview(): React.ReactElement {
  return (
    <div
      className="evershop-coupon-block__preview"
      style={{
        padding: 16,
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 130
      }}
    >
      <div
        style={{
          border: '1px dashed #9b8e78',
          borderRadius: 8,
          padding: '16px 20px',
          textAlign: 'center',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 9,
          color: '#5a5a5a',
          minWidth: 200
        }}
      >
        <div style={{ fontSize: 8, color: '#9b8e78', letterSpacing: '0.08em' }}>
          LIMITED · ENDS SUNDAY
        </div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 11,
            color: '#2d2d2d',
            margin: '6px 0'
          }}
        >
          Take 20% off
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 9,
            marginTop: 4
          }}
        >
          <span
            style={{
              padding: '4px 8px',
              border: '1px solid #2d2d2d',
              borderRadius: 4,
              fontWeight: 600
            }}
          >
            SUMMER20
          </span>
          <span
            style={{
              padding: '4px 8px',
              border: '1px solid #2d2d2d',
              borderRadius: 4
            }}
          >
            Copy
          </span>
        </div>
      </div>
    </div>
  );
}
