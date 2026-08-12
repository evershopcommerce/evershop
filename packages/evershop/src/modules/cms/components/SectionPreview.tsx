import React from 'react';

/**
 * Palette preview for the Section widget. Renders a band with a faint
 * background and dashed interior (suggesting the droppable area).
 */
export default function SectionPreview(): React.ReactElement {
  return (
    <div
      className="evershop-section__preview"
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
          position: 'relative',
          width: '100%',
          padding: 12,
          background: '#f5efe2',
          borderRadius: 4
        }}
      >
        <div
          style={{
            height: 70,
            border: '1px dashed #9b8e78',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 9,
            color: '#9b8e78',
            letterSpacing: '0.04em'
          }}
        >
          DROP WIDGETS
        </div>
      </div>
    </div>
  );
}
