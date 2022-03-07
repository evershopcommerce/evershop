import PropTypes from 'prop-types';
import React from 'react';
import { getPageData } from './getPageData';
import Link from './Link';

export default function BundleCSS({ src }) {
  return <Link rel="stylesheet" href={src} />;
}

BundleCSS.propTypes = {
  src: PropTypes.string
};

BundleCSS.defaultProps = {
  src: getPageData('bundleCss')
};
