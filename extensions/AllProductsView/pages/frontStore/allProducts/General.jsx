/* eslint-disable react/no-danger */
import React from 'react';
import PropTypes from 'prop-types';
import './General.scss';
import { CKEditor } from '@components/common/CKEditor';

export default function AllProductsInfo() {
  return (
    <div className="page-width">
      <div className="p-4 mb-1 md:mb-2" style={{ background: '#685f58' }}>
        <div className="text-left text-white">
          <h1 className="category-name mt-25">All Products</h1>
          <div className="category-description">
            <CKEditor content={"Everything we have available"} />
          </div>
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
};