const { useSiteComponent } = require('../../../../lib/componee/useSiteComponent');
const { buildUrl } = require('../../../../lib/router/buildUrl');

// eslint-disable-next-line no-multi-assign
exports = module.exports = {
  categoryView: [
    {
      // General block
      id: 'categoryGeneral',
      areaId: 'content',
      source: useSiteComponent('catalog/views/site/category/view/General.js'),
      props: {},
      sortOrder: 10
    },
    {
      id: 'productsFilter',
      areaId: 'content',
      source: useSiteComponent('catalog/views/site/product/list/Filter.js'),
      props: {},
      sortOrder: 20
    },
    {
      id: 'products',
      areaId: 'content',
      source: useSiteComponent('catalog/views/site/category/view/Products.js'),
      props: {
        withPagination: true
      },
      sortOrder: 30
    }
  ],
  productView: [
    {
      // General block
      id: 'productLayout',
      areaId: 'content',
      source: useSiteComponent('catalog/views/site/product/view/Layout.js'),
      props: {},
      sortOrder: 10
    },
    {
      id: 'productForm',
      areaId: 'productPageMiddleRight',
      source: useSiteComponent('catalog/views/site/product/view/Form.js'),
      props: {
        action: buildUrl('addToCart')
      },
      sortOrder: 50
    },
    {
      id: 'productGeneralInfo',
      areaId: 'productPageMiddleRight',
      source: useSiteComponent('catalog/views/site/product/view/GeneralInfo.js'),
      props: {
        action: buildUrl('addToCart')
      },
      sortOrder: 10
    },
    {
      id: 'productImages',
      areaId: 'productPageMiddleLeft',
      source: useSiteComponent('catalog/views/site/product/view/Images.js'),
      props: {},
      sortOrder: 10
    },
    {
      id: 'productDescription',
      areaId: 'productPageMiddleRight',
      source: useSiteComponent('catalog/views/site/product/view/Description.js'),
      props: {},
      sortOrder: 60
    },
    {
      id: 'productVariants',
      areaId: 'productPageMiddleRight',
      source: useSiteComponent('catalog/views/site/product/view/Variants.js'),
      props: {},
      sortOrder: 20
    }
  ],
  homepage: [
    {
      id: 'featuredCat',
      areaId: 'content',
      source: useSiteComponent('catalog/views/site/homepage/FeaturedCategories.js'),
      props: {},
      sortOrder: 20
    },
    {
      id: 'featuredProducts',
      areaId: 'content',
      source: useSiteComponent('catalog/views/site/homepage/FeaturedProducts.js'),
      props: {},
      sortOrder: 30
    }
  ]
};
