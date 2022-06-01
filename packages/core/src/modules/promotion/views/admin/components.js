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
      sortOrder: 30
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
        method: 'POST',
        action: buildUrl('couponSavePost'),
        gridUrl: buildUrl('couponGrid')
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
      id: 'statusColumn',
      areaId: 'couponGridHeader',
      source: useComponent('grid/headers/Status.js'),
      props: {
        title: 'Status',
        id: 'status'
      },
      sortOrder: 25
    },
    {
      id: 'statusRow',
      areaId: 'couponGridRow',
      source: useComponent('grid/rows/Status.js'),
      props: {
        id: 'status'
      },
      sortOrder: 25
    },
    {
      id: 'nameColumn',
      areaId: 'couponGridHeader',
      source: useComponent('grid/headers/Basic.js'),
      props: {
        title: 'Coupon code',
        id: 'name'
      },
      sortOrder: 5
    },
    {
      id: 'nameRow',
      areaId: 'couponGridRow',
      source: useAdminComponent('promotion/views/admin/coupon/grid/NameRow.js'),
      props: {
        id: 'name',
        editUrl: 'editUrl'
      },
      sortOrder: 5
    },
    {
      id: 'priceColumn',
      areaId: 'couponGridHeader',
      source: useComponent('grid/headers/FromTo.js'),
      props: {
        title: 'Price',
        id: 'price'
      },
      sortOrder: 10
    },
    {
      id: 'priceRow',
      areaId: 'couponGridRow',
      source: useAdminComponent('promotion/views/admin/coupon/grid/PriceRow.js'),
      props: {
        id: 'price'
      },
      sortOrder: 10
    }
  ]
};
