const { buildUrl } = require('../../../../lib/router/buildUrl');
const { useComponent } = require('../../../../lib/componee/useComponent');
const { useAdminComponent } = require('../../../../lib/componee/useAdminComponent');

// eslint-disable-next-line no-multi-assign
exports = module.exports = {
  '*': [
    {
      id: 'promotion.group',
      areaId: 'admin.menu',
      source: useAdminComponent('cms/views/admin/NavigationItemGroup.js'),
      props: {
        id: 'promotion.group',
        name: 'Coupons'
      },
      sortOrder: 20
    },
    {
      id: 'new.coupon',
      areaId: 'quick.links',
      source: useAdminComponent('promotion/views/admin/navigation/CouponNewMenuItem.js'),
      props: {},
      sortOrder: 10
    },
    {
      id: 'coupons',
      areaId: 'promotion.group',
      source: useAdminComponent('promotion/views/admin/navigation/CouponsMenuItem.js'),
      props: {},
      sortOrder: 5
    }
  ],
  /** COUPON */
  couponEdit: [
    {
      id: 'metaTitle',
      areaId: 'head',
      source: useComponent('Title.js'),
      props: {
        title: 'Edit coupon'
      },
      sortOrder: 10
    }
  ],
  couponNew: [
    {
      id: 'metaTitle',
      areaId: 'head',
      source: useComponent('Title.js'),
      props: {
        title: 'Create a new coupon'
      },
      sortOrder: 10
    }
  ],
  'couponNew+couponEdit': [
    {
      id: 'pageHeading',
      areaId: 'content',
      source: useAdminComponent('cms/views/admin/PageHeading.js'),
      props: {
        backUrl: buildUrl('couponGrid')
      },
      sortOrder: 10
    },
    {
      id: 'couponForm',
      areaId: 'content',
      source: useAdminComponent('promotion/views/admin/coupon/edit/CouponEditForm.js'),
      props: {
        id: 'coupon-edit-form',
        action: buildUrl('couponCreate'),
        gridUrl: buildUrl('couponGrid'),
        isJSON: true
      },
      sortOrder: 10
    }
  ],
  couponGrid: [
    {
      id: 'couponGrid',
      areaId: 'content',
      source: useAdminComponent('promotion/views/admin/coupon/grid/Grid.js'),
      props: {
        limit: 20
      },
      sortOrder: 20
    },
    {
      id: 'pageHeading',
      areaId: 'content',
      source: useAdminComponent('cms/views/admin/PageHeading.js'),
      props: {
      },
      sortOrder: 10
    },
    {
      id: 'newCouponButton',
      areaId: 'pageHeadingRight',
      source: useComponent('form/Button.js'),
      props: {
        title: 'Add coupon',
        variant: 'primary',
        url: buildUrl('couponNew')
      },
      sortOrder: 10
    },
    {
      id: 'title',
      areaId: 'head',
      source: useComponent('Title.js'),
      props: {
        title: 'Coupons'
      },
      sortOrder: 1
    },
    {
      id: 'couponColumn',
      areaId: 'couponGridHeader',
      source: useComponent('grid/headers/Basic.js'),
      props: {
        title: 'Coupon code',
        id: 'coupon'
      },
      sortOrder: 5
    },
    {
      id: 'couponRow',
      areaId: 'couponGridRow',
      source: useAdminComponent('promotion/views/admin/coupon/grid/NameRow.js'),
      props: {
        id: 'coupon',
        editUrl: 'editUrl'
      },
      sortOrder: 5
    },
    {
      id: 'startTimeColumn',
      areaId: 'couponGridHeader',
      source: useComponent('grid/headers/FromTo.js'),
      props: {
        title: 'Start date',
        id: 'start_date'
      },
      sortOrder: 10
    },
    {
      id: 'startTimeRow',
      areaId: 'couponGridRow',
      source: useComponent('grid/rows/Date.js'),
      props: {
        id: 'start_date'
      },
      sortOrder: 10
    },
    {
      id: 'endTimeColumn',
      areaId: 'couponGridHeader',
      source: useComponent('grid/headers/FromTo.js'),
      props: {
        title: 'End date',
        id: 'end_date'
      },
      sortOrder: 15
    },
    {
      id: 'endTimeRow',
      areaId: 'couponGridRow',
      source: useComponent('grid/rows/Date.js'),
      props: {
        id: 'end_date'
      },
      sortOrder: 15
    },
    {
      id: 'statusColumn',
      areaId: 'couponGridHeader',
      source: useComponent('grid/headers/Status.js'),
      props: {
        title: 'Status',
        id: 'status'
      },
      sortOrder: 20
    },
    {
      id: 'statusRow',
      areaId: 'couponGridRow',
      source: useComponent('grid/rows/Status.js'),
      props: {
        id: 'status'
      },
      sortOrder: 20
    },
    {
      id: 'usedTimesColumn',
      areaId: 'couponGridHeader',
      source: useComponent('grid/headers/FromTo.js'),
      props: {
        title: 'Used times',
        id: 'used_time'
      },
      sortOrder: 25
    },
    {
      id: 'usedTimesRow',
      areaId: 'couponGridRow',
      source: useComponent('grid/rows/Basic.js'),
      props: {
        id: 'used_time'
      },
      sortOrder: 25
    }
  ]
};
