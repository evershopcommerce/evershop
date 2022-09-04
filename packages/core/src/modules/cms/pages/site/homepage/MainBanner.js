import React from 'react';
import { useAppState } from '../../../../../lib/context/app';
import { get } from '../../../../../lib/util/get';
import Button from '../../../components/site/Button';
import './MainBanner.scss';

export default function MainBanner() {
  const context = useAppState();
  const title = get(context, 'metaTitle');
  return (
    <div className="main-banner-home flex">
      <div className="container text-center self-center">
        <h1>{title}</h1>
        <h2 className="h1 text-white">Chic handbags reimagined for modern life.</h2>
        <Button url="/products" title="SHOP NOW" variant="primary" />
      </div>
    </div>
  );
}
