const { useComponent } = require('../../../../lib/componee/useComponent');
const { buildUrl } = require('../../../../lib/router/buildUrl');

// eslint-disable-next-line no-multi-assign
exports = module.exports = {
  '*': [
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
      source: useComponent('dashboard/Logo.js'),
      props: {
        dashboardUrl: buildUrl('dashboard')
      },
      sortOrder: 10
    },
    {
      id: 'searchBox',
      areaId: 'header',
      source: useComponent('dashboard/search/SearchBox.js'),
      props: {
        searchAPI: buildUrl('search'),
        resourceLinks: [
          {
            url: buildUrl('productGrid'),
            name: 'Products'
          },
          {
            url: buildUrl('orderGrid'),
            name: 'Orders'
          }
        ]
      },
      sortOrder: 20
    },
    {
      id: 'notification',
      areaId: 'body',
      source: useComponent('Notification.js'),
      props: {},
      sortOrder: 1
    },
    {
      id: 'navigation',
      areaId: 'admin.navigation',
      source: useComponent('Navigation.js'),
      props: {},
      sortOrder: 0
    },
    {
      id: 'quick.link.group',
      areaId: 'admin.menu',
      source: useComponent('NavigationItemGroup.js'),
      props: {
        id: 'quick.links',
        name: 'Quick Links'
      },
      sortOrder: 0
    },
    {
      id: 'cms.group',
      areaId: 'admin.menu',
      source: useComponent('NavigationItemGroup.js'),
      props: {
        id: 'cms.links',
        name: 'CMS'
      },
      sortOrder: 30
    },
    {
      id: 'dashboard',
      areaId: 'quick.links',
      source: useComponent('navigation/DashboardMenuItem.js'),
      props: {
        url: buildUrl('dashboard')
      },
      sortOrder: 5
    },
    {
      id: 'pages',
      areaId: 'cms.links',
      source: useComponent('navigation/PagesMenuItem.js'),
      props: {
        url: buildUrl('cmsPageGrid')
      },
      sortOrder: 5
    }
  ],
  cmsPageEdit: [
    {
      id: 'metaTitle',
      areaId: 'content',
      source: useComponent('Title.js'),
      props: {
        title: 'Edit page'
      },
      sortOrder: 1
    }
  ],
  cmsPageNew: [
    {
      id: 'metaTitle',
      areaId: 'content',
      source: useComponent('Title.js'),
      props: {
        title: 'Create a new page'
      },
      sortOrder: 1
    }
  ],
  'cmsPageNew+cmsPageEdit': [
    {
      id: 'pageHeading',
      areaId: 'content',
      source: useComponent('PageHeading.js'),
      props: {
        backUrl: buildUrl('cmsPageGrid')
      },
      sortOrder: 10
    },
    {
      id: 'createForm',
      areaId: 'content',
      source: useComponent('page/edit/PageEditForm.js'),
      props: {
        id: 'page-edit-form',
        method: 'POST',
        action: buildUrl('cmsPageSavePost'),
        gridUrl: buildUrl('cmsPageGrid'),
        uploadApi: buildUrl('imageUpload', [''])
      },
      sortOrder: 10
    },
    {
      id: 'pageEditGeneral',
      areaId: 'leftSide',
      source: useComponent('page/edit/General.js'),
      props: {
        browserApi: buildUrl('fileBrowser', ['']),
        deleteApi: buildUrl('fileDelete', ['']),
        uploadApi: buildUrl('imageUpload', ['']),
        folderCreateApi: buildUrl('folderCreate', [''])
      },
      sortOrder: 10
    },
    {
      id: 'pageEditSEO',
      areaId: 'rightSide',
      source: useComponent('page/edit/Seo.js'),
      props: {},
      sortOrder: 20
    },
    {
      id: 'ckeditor',
      areaId: 'head',
      source: useComponent('Script.js'),
      props: {
        src: 'https://cdn.ckeditor.com/4.17.1/standard/ckeditor.js'
      },
      sortOrder: 1
    }
  ],
  cmsPageGrid: [
    {
      id: 'pageGrid',
      areaId: 'content',
      source: useComponent('page/grid/Grid.js'),
      props: {
        limit: 20
      },
      sortOrder: 20
    },
    {
      id: 'pageHeading',
      areaId: 'content',
      source: useComponent('PageHeading.js'),
      props: {
      },
      sortOrder: 10
    },
    {
      id: 'newCMSPageButton',
      areaId: 'pageHeadingRight',
      source: useComponent('form/Button.js'),
      props: {
        title: 'Add a page',
        variant: 'primary',
        url: buildUrl('cmsPageNew')
      },
      sortOrder: 10
    },
    {
      id: 'title',
      areaId: 'head',
      source: useComponent('Title.js'),
      props: {
        title: 'Pages'
      },
      sortOrder: 1
    },
    {
      id: 'statusColumn',
      areaId: 'pageGridHeader',
      source: useComponent('grid/headers/Status.js'),
      props: {
        title: 'Status',
        id: 'status'
      },
      sortOrder: 25
    },
    {
      id: 'statusRow',
      areaId: 'pageGridRow',
      source: useComponent('grid/rows/Status.js'),
      props: {
        id: 'status'
      },
      sortOrder: 25
    },
    {
      id: 'nameColumn',
      areaId: 'pageGridHeader',
      source: useComponent('grid/headers/Basic.js'),
      props: {
        title: 'Page name',
        id: 'name'
      },
      sortOrder: 5
    },
    {
      id: 'nameRow',
      areaId: 'pageGridRow',
      source: useComponent('page/grid/NameRow.js'),
      props: {
        id: 'name',
        editUrl: 'editUrl'
      },
      sortOrder: 5
    }
  ],
  dashboard: [
    {
      id: 'contentLayout',
      areaId: 'content',
      source: useComponent('dashboard/Layout.js'),
      props: {},
      sortOrder: 10
    },
    {
      id: 'pageHeading',
      areaId: 'content',
      source: useComponent('PageHeading.js'),
      props: {
      },
      sortOrder: 5
    },
    {
      id: 'title',
      areaId: 'head',
      source: useComponent('Title.js'),
      props: {
        title: 'Dashboard'
      },
      sortOrder: 1
    }
  ]
};
