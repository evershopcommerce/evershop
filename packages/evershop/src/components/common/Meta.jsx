import React from 'react';

export default function Meta(props) {
  const attributes = Object.keys(props)
    .filter(
      (key) =>
        [
          'charset',
          'name',
          'content',
          'httpEquiv',
          'property',
          'itemProp',
          'itemType',
          'itemId',
          'lang',
          'scheme'
        ].includes(key) && props[key]
    )
    .reduce((obj, key) => {
      obj[key] = props[key];
      return obj;
    }, {});

  return <meta {...attributes} />;
}
