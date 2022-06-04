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
      source: useAdminComponent('cms/views/admin/NavigationItem.js'),
      props: {
        icon: 'GiftIcon',
        url: buildUrl('couponNew'),
        title: 'New Coupon'
      },
      sortOrder: 10
    },
    {
      id: 'coupons',
      areaId: 'promotion.group',
      source: useAdminComponent('cms/views/admin/NavigationItem.js'),
      props: {
        icon: 'GiftIcon',
        url: buildUrl('couponGrid'),
        title: 'Coupons'
      },
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
      id: 'discountAmountColumn',
      areaId: 'couponGridHeader',
      source: useComponent('grid/headers/FromTo.js'),
      props: {
        title: 'Discount amount',
        id: 'discount_amount'
      },
      sortOrder: 10
    },
    {
      id: 'discountAmountRow',
      areaId: 'couponGridRow',
      source: useAdminComponent('promotion/views/admin/coupon/grid/PriceRow.js'),
      props: {
        id: 'discount_amount'
      },
      sortOrder: 10
    },
    {
      id: 'statusColumn',
      areaId: 'couponGridHeader',
      source: useComponent('grid/headers/Status.js'),
      props: {
        title: 'Status',
        id: 'status'
      },
      sortOrder: 15
    },
    {
      id: 'statusRow',
      areaId: 'couponGridRow',
      source: useComponent('grid/rows/Status.js'),
      props: {
        id: 'status'
      },
      sortOrder: 15
    },
    {
      id: 'usedTimesColumn',
      areaId: 'couponGridHeader',
      source: useComponent('grid/headers/FromTo.js'),
      props: {
        title: 'Used times',
        id: 'used_time'
      },
      sortOrder: 20
    },
    {
      id: 'usedTimesRow',
      areaId: 'couponGridRow',
      source: useComponent('grid/rows/Basic.js'),
      props: {
        id: 'used_time'
      },
      sortOrder: 20
    }
  ]
};
