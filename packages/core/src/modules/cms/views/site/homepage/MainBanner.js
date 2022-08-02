import React from 'react';
import { useSelector } from 'react-redux';
import Button from '../Button';
import './MainBanner.scss';

export default function MainBanner() {
  const title = useSelector((state) => state.pageData.metaTitle)
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
