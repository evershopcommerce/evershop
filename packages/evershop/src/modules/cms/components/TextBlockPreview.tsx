import React from 'react';

const line = (width: string, top: number): React.CSSProperties => ({
  position: 'absolute',
  left: 20,
  top,
  width,
  height: 5,
  borderRadius: 2,
  background: '#2a2520',
  opacity: 0.85
});

/**
 * Stylized preview of the `text_block` widget — paragraph-like horizontal
 * lines of varying widths. Self-contained, no runtime dependencies.
 */
export default function TextBlockPreview(): React.ReactElement {
  return (
    <div
      className="evershop-text-block__preview"
      style={{
        position: 'relative',
        background: '#ffffff',
        height: 130
      }}
    >
      <span style={line('80%', 18)} />
      <span style={line('92%', 36)} />
      <span style={line('88%', 54)} />
      <span style={line('74%', 72)} />
      <span style={line('40%', 90)} />
    </div>
  );
}
