const { useSiteComponent } = require('../../../../lib/componee/useSiteComponent');
const { useComponent } = require('../../../../lib/componee/useComponent');
const { buildUrl } = require('../../../../lib/router/buildUrl');

// eslint-disable-next-line no-multi-assign
exports = module.exports = {
  '*': [
    {
      id: 'notification',
      areaId: 'body',
      source: useSiteComponent('cms/views/site/Notification.js'),
      props: {},
      sortOrder: 1
    },
    {
      id: 'layout',
      areaId: 'body',
      source: useSiteComponent('cms/views/site/Layout.js'),
      props: {},
      sortOrder: 1
    },
    {
      id: 'logo',
      areaId: 'header',
      source: useSiteComponent('cms/views/site/Logo.js'),
      props: {
        homeUrl: buildUrl('homepage')
      },
      sortOrder: 0
    },
    {
      id: 'menu',
      areaId: 'header',
      source: useSiteComponent('cms/views/site/Menu.js'),
      props: {},
      sortOrder: 10
    },
    {
      id: 'iconWrapper',
      areaId: 'header',
      source: useComponent('Area.js'),
      props: {
        id: 'iconWrapper',
        className: 'icon-wrapper flex justify-between space-x-1'
      },
      sortOrder: 20
    },
    {
      id: 'mobileMenu',
      areaId: 'iconWrapper',
      source: useSiteComponent('cms/views/site/MobileMenu.js'),
      props: {},
      sortOrder: 20
    },
    {
      id: 'metaTitle',
      areaId: 'head',
      source: useSiteComponent('cms/views/site/MetaTitle.js'),
      props: {},
      sortOrder: 1
    },
    {
      id: 'metaDescription',
      areaId: 'head',
      source: useSiteComponent('cms/views/site/MetaDescription.js'),
      props: {},
      sortOrder: 1
    },

    {
      id: 'viewport',
      areaId: 'head',
      source: useComponent('Meta.js'),
      props: {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1'
      },
      sortOrder: 2
    },
    {
      id: 'bundleCSS',
      areaId: 'head',
      source: useComponent('BundleCss.js'),
      props: {},
      sortOrder: 10
    },
    {
      id: 'bundleJS',
      areaId: 'after.body',
      source: useComponent('BundleJs.js'),
      props: {},
      sortOrder: 10
    }
  ],
  homepage: [
    {
      id: 'mainBanner',
      areaId: 'content',
      source: useSiteComponent('cms/views/site/homepage/MainBanner.js'),
      props: {},
      sortOrder: 10
    },
    {
      id: 'mainBansssner',
      areaId: 'content',
      source: useSiteComponent('cms/views/site/homepage/MainBanner.js'),
      props: {},
      sortOrder: 10
    }
  ],
  cmsPageView: [
    {
      id: 'cmsPageView',
      areaId: 'content',
      source: useSiteComponent('cms/views/site/page/View.js'),
      props: {},
      sortOrder: 10
    }
  ],
  notFound: [
    {
      id: 'notFoundPage',
      areaId: 'content',
      source: useSiteComponent('cms/views/site/page/NotFound.js'),
      props: {
        continueShoppingUrl: buildUrl('homepage')
      },
      sortOrder: 10
    }
  ]
};
