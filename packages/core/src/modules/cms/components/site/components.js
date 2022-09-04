const { useComponent } = require('../../../../lib/componee/useComponent');
const { buildUrl } = require('../../../../lib/router/buildUrl');

// eslint-disable-next-line no-multi-assign
exports = module.exports = {
  '*': [
    {
      id: 'notification',
      areaId: 'body',
      source: useComponent('Notification.js'),
      props: {},
      sortOrder: 1
    },
    {
      id: 'layout',
      areaId: 'body',
      source: useComponent('Layout.js'),
      props: {},
      sortOrder: 1
    },
    {
      id: 'logo',
      areaId: 'header',
      source: useComponent('Logo.js'),
      props: {
        homeUrl: buildUrl('homepage')
      },
      sortOrder: 0
    },
    {
      id: 'menu',
      areaId: 'header',
      source: useComponent('Menu.js'),
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
      source: useComponent('MobileMenu.js'),
      props: {},
      sortOrder: 20
    },
    {
      id: 'metaTitle',
      areaId: 'head',
      source: useComponent('MetaTitle.js'),
      props: {},
      sortOrder: 1
    },
    {
      id: 'metaDescription',
      areaId: 'head',
      source: useComponent('MetaDescription.js'),
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
    }
  ],
  homepage: [
    {
      id: 'mainBanner',
      areaId: 'content',
      source: useComponent('homepage/MainBanner.js'),
      props: {},
      sortOrder: 10
    }
  ],
  cmsPageView: [
    {
      id: 'cmsPageView',
      areaId: 'content',
      source: useComponent('page/View.js'),
      props: {},
      sortOrder: 10
    }
  ],
  notFound: [
    {
      id: 'notFoundPage',
      areaId: 'content',
      source: useComponent('page/NotFound.js'),
      props: {
        continueShoppingUrl: buildUrl('homepage')
      },
      sortOrder: 10
    }
  ]
};
