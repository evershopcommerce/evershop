import React from 'react';

/** Prop-less stylized mock shown on the page-builder palette hover card. */
export default function FeaturedBlogsPreview(): React.ReactElement {
  return (
    <div style={{ padding: 12, background: '#fff' }}>
      <div
        style={{
          height: 8,
          width: '45%',
          background: '#e5e7eb',
          borderRadius: 4,
          marginBottom: 10
        }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ flex: 1 }}>
            <div
              style={{
                height: 40,
                background: '#f3f4f6',
                borderRadius: 4,
                marginBottom: 6
              }}
            />
            <div
              style={{
                height: 6,
                width: '85%',
                background: '#e5e7eb',
                borderRadius: 4,
                marginBottom: 4
              }}
            />
            <div
              style={{
                height: 6,
                width: '60%',
                background: '#eceef1',
                borderRadius: 4
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
