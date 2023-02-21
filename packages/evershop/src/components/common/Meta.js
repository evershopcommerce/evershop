/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/destructuring-assignment */
import React from 'react';

export default function Meta(props) {
  const attributes = Object.keys(props)
    .filter(
      (key) =>
        ['charSet', 'name', 'content', 'httpEquiv'].includes(key) && props[key]
    )
    .reduce((obj, key) => {
      // eslint-disable-next-line no-param-reassign
      obj[key] = props[key];
      return obj;
    }, {});

  return <meta {...attributes} />;
}
