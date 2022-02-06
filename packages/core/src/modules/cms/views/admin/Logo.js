import React from 'react';

export default function Logo({ adminUrl, logoUrl, storeName }) {
  return (
    <div className="logo">
      {logoUrl && <A url={adminUrl}><img src={logoUrl} alt={storeName} title={storeName} /></A>}
      {!logoUrl && <A url={adminUrl}><span>{storeName}</span></A>}
    </div>
  );
}
