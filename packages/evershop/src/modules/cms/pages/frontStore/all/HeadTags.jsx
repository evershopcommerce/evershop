import PropTypes from 'prop-types';
import React from 'react';


export default function HeadTags({
  pageInfo: { title, description },
  themeConfig: {
    headTags: { metas, links, scripts, base }
  }
}) {
  React.useEffect(() => {
    const head = document.querySelector('head');
    scripts.forEach((script) => {
      const scriptElement = document.createElement('script');
      Object.keys(script).forEach((key) => {
        if (script[key]) {
          scriptElement[key] = script[key];
        }
      });
      head.appendChild(scriptElement);
    });
  }, []);

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      {metas.map((meta, index) => (
        <meta key={index} {...meta} />
      ))}
      {links.map((link, index) => (
        <link key={index} {...link} />
      ))}
      {scripts.map((script, index) => (
        <script key={index} {...script} />
      ))}
      {base && <base {...base} />}
    </>
  );
}

HeadTags.propTypes = {
  pageInfo: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired
  }).isRequired,
  themeConfig: PropTypes.shape({
    headTags: PropTypes.shape({
      metas: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string,
          content: PropTypes.string,
          charSet: PropTypes.string,
          httpEquiv: PropTypes.string,
          property: PropTypes.string,
          itemProp: PropTypes.string,
          itemType: PropTypes.string,
          itemID: PropTypes.string,
          lang: PropTypes.string
        })
      ),
      links: PropTypes.arrayOf(
        PropTypes.shape({
          rel: PropTypes.string,
          href: PropTypes.string,
          sizes: PropTypes.string,
          type: PropTypes.string,
          hrefLang: PropTypes.string,
          media: PropTypes.string,
          title: PropTypes.string,
          as: PropTypes.string,
          crossOrigin: PropTypes.string,
          integrity: PropTypes.string,
          referrerPolicy: PropTypes.string
        })
      ),
      scripts: PropTypes.arrayOf(
        PropTypes.shape({
          src: PropTypes.string,
          type: PropTypes.string,
          async: PropTypes.bool,
          defer: PropTypes.bool,
          crossOrigin: PropTypes.string,
          integrity: PropTypes.string,
          noModule: PropTypes.bool,
          nonce: PropTypes.string
        })
      ),
      base: PropTypes.shape({
        href: PropTypes.string,
        target: PropTypes.string
      })
    })
  })
};

HeadTags.defaultProps = {
  themeConfig: {
    headTags: {
      metas: [],
      links: [],
      scripts: [],
      base: undefined
    }
  }
};

export const layout = {
  areaId: 'head',
  sortOrder: 5
};

export const query = `
  query query {
    pageInfo {
      title
      description
    }
    themeConfig {
      headTags {
        metas {
          name
          content
          charSet
          httpEquiv
          property
          itemProp
          itemType
          itemID
          lang
        }
        links {
          rel
          href
          sizes
          type
          hrefLang
          media
          title
          as
          crossOrigin
          integrity
          referrerPolicy
        }
        scripts {
          src
          type
          async
          defer
          crossOrigin
          integrity
          noModule
          nonce
        }
        base {
          href
          target
        }
      }
    }
  }
`;
