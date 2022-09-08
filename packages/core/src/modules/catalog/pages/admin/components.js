const { buildUrl } = require('../../../../lib/router/buildUrl');
const { useComponent } = require('../../../../lib/componee/useComponent');

// eslint-disable-next-line no-multi-assign
exports = module.exports = {
  '*': [
    {
      id: 'catalog.group',
      areaId: 'admin.menu',
      source: useComponent('NavigationItemGroup.js', 'cms'),
      props: {
        id: 'catalog.group',
        name: 'Catalog'
      },
      sortOrder: 10
    },
    {
      id: 'new.product',
      areaId: 'quick.links',
      source: useComponent('navigation/NewProductMenuItem.js'),
      props: {
        url: buildUrl('productNew')
      },
      sortOrder: 10
    },
    {
      id: 'products',
      areaId: 'catalog.group',
      source: useComponent('navigation/ProductsMenuItem.js'),
      props: {
        url: buildUrl('productGrid')
      },
      sortOrder: 5
    },
    {
      id: 'categories',
      areaId: 'catalog.group',
      source: useComponent('navigation/CategoriesMenuItem.js'),
      props: {
        url: buildUrl('categoryGrid')
      },
      sortOrder: 10
    },
    {
      id: 'attributes',
      areaId: 'catalog.group',
      source: useComponent('navigation/AttributesMenuItem.js'),
      props: {
        url: buildUrl('attributeGrid')
      },
      sortOrder: 15
    }
  ],
  categoryGrid: [
    {
      id: 'categoryGrid',
      areaId: 'content',
      source: useComponent('category/grid/Grid.js'),
      props: {
        limit: 20
      },
      sortOrder: 20
    },
    {
      id: 'pageHeading',
      areaId: 'content',
      source: useComponent('PageHeading.js', 'cms'),
      props: {
      },
      sortOrder: 10
    },
    {
      id: 'newCategoryButton',
      areaId: 'pageHeadingRight',
      source: useComponent('form/Button.js'),
      props: {
        title: 'Add category',
        variant: 'primary',
        url: buildUrl('categoryNew')
      },
      sortOrder: 10
    },
    {
      id: 'title',
      areaId: 'head',
      source: useComponent('Title.js'),
      props: {
        title: 'Categories'
      },
      sortOrder: 1
    },
    {
      id: 'statusColumn',
      areaId: 'categoryGridHeader',
      source: useComponent('grid/headers/Status.js'),
      props: {
        title: 'Status',
        id: 'status'
      },
      sortOrder: 25
    },
    {
      id: 'statusRow',
      areaId: 'categoryGridRow',
      source: useComponent('grid/rows/Status.js'),
      props: {
        id: 'status'
      },
      sortOrder: 25
    },
    {
      id: 'nameColumn',
      areaId: 'categoryGridHeader',
      source: useComponent('grid/headers/Basic.js'),
      props: {
        title: 'Category name',
        id: 'name'
      },
      sortOrder: 5
    },
    {
      id: 'nameRow',
      areaId: 'categoryGridRow',
      source: useComponent('category/grid/NameRow.js'),
      props: {
        id: 'name',
        editUrl: 'editUrl'
      },
      sortOrder: 5
    }
  ],
  /** PRODUCT */
  productEdit: [
    {
      id: 'metaTitle',
      areaId: 'head',
      source: useComponent('Title.js'),
      props: {
        title: 'Edit product'
      },
      sortOrder: 10
    }
  ],
  productNew: [
    {
      id: 'metaTitle',
      areaId: 'head',
      source: useComponent('Title.js'),
      props: {
        title: 'Create a new product'
      },
      sortOrder: 10
    }
  ],
  'productNew+productEdit': [
    {
      id: 'pageHeading',
      areaId: 'content',
      source: useComponent('PageHeading.js', 'cms'),
      props: {
        backUrl: buildUrl('productGrid')
      },
      sortOrder: 10
    },
    {
      id: 'productForm',
      areaId: 'content',
      source: useComponent('product/edit/ProductEditForm.js'),
      props: {
        id: 'product-edit-form',
        method: 'POST',
        action: buildUrl('productSavePost'),
        gridUrl: buildUrl('productGrid'),
        uploadApi: buildUrl('imageUpload', [''])
      },
      sortOrder: 10
    },
    // {
    //   id: 'ckeditor',
    //   areaId: 'head',
    //   source: useComponent('Script.js'),
    //   props: {
    //     src: 'https://cdn.ckeditor.com/4.17.1/standard/ckeditor.js'
    //   },
    //   sortOrder: 1 
    // },
    {
      id: 'productEditGeneral',
      areaId: 'leftSide',
      source: useComponent('product/edit/General.js'),
      props: {
        browserApi: buildUrl('fileBrowser', ['']),
        deleteApi: buildUrl('fileDelete', ['']),
        uploadApi: buildUrl('imageUpload', ['']),
        folderCreateApi: buildUrl('folderCreate', [''])
      },
      sortOrder: 10
    },
    {
      id: 'productEditStatus',
      areaId: 'rightSide',
      source: useComponent('product/edit/Status.js'),
      props: {
        browserApi: buildUrl('fileBrowser', ['']),
        deleteApi: buildUrl('fileDelete', ['']),
        uploadApi: buildUrl('imageUpload', ['']),
        folderCreateApi: buildUrl('folderCreate', [''])
      },
      sortOrder: 10
    },
    {
      id: 'productEditImages',
      areaId: 'leftSide',
      source: useComponent('product/edit/Media.js'),
      props: {},
      sortOrder: 20
    },
    {
      id: 'productEditAttribute',
      areaId: 'rightSide',
      source: useComponent('product/edit/Attributes.js'),
      props: {},
      sortOrder: 30
    },
    {
      id: 'productEditInventory',
      areaId: 'rightSide',
      source: useComponent('product/edit/Inventory.js'),
      props: {},
      sortOrder: 20
    },
    {
      id: 'productEditOptions',
      areaId: 'leftSide',
      source: useComponent('product/edit/CustomOptions.js'),
      props: {},
      sortOrder: 30
    },
    {
      id: 'productEditVariants',
      areaId: 'leftSide',
      source: useComponent('product/edit/variants/Index.js'),
      props: {},
      sortOrder: 40
    },
    {
      id: 'productEditSEO',
      areaId: 'leftSide',
      source: useComponent('product/edit/Seo.js'),
      props: {},
      sortOrder: 50
    }
  ],
  productGrid: [
    {
      id: 'productGrid',
      areaId: 'content',
      source: useComponent('product/grid/Grid.js'),
      props: {
        limit: 20
      },
      sortOrder: 20
    },
    {
      id: 'pageHeading',
      areaId: 'content',
      source: useComponent('PageHeading.js', 'cms'),
      props: {
      },
      sortOrder: 10
    },
    {
      id: 'newProductButton',
      areaId: 'pageHeadingRight',
      source: useComponent('form/Button.js'),
      props: {
        title: 'Add product',
        variant: 'primary',
        url: buildUrl('productNew')
      },
      sortOrder: 10
    },
    {
      id: 'title',
      areaId: 'head',
      source: useComponent('Title.js'),
      props: {
        title: 'Products'
      },
      sortOrder: 1
    },
    {
      id: 'statusColumn',
      areaId: 'productGridHeader',
      source: useComponent('grid/headers/Status.js'),
      props: {
        title: 'Status',
        id: 'status'
      },
      sortOrder: 25
    },
    {
      id: 'statusRow',
      areaId: 'productGridRow',
      source: useComponent('grid/rows/Status.js'),
      props: {
        id: 'status'
      },
      sortOrder: 25
    },
    {
      id: 'nameColumn',
      areaId: 'productGridHeader',
      source: useComponent('grid/headers/Basic.js'),
      props: {
        title: 'Product name',
        id: 'name'
      },
      sortOrder: 5
    },
    {
      id: 'nameRow',
      areaId: 'productGridRow',
      source: useComponent('product/grid/NameRow.js'),
      props: {
        id: 'name',
        editUrl: 'editUrl'
      },
      sortOrder: 5
    },
    {
      id: 'thumbnailColumn',
      areaId: 'productGridHeader',
      source: useComponent('grid/headers/Dummy.js'),
      props: {
        title: '',
        id: 'image'
      },
      sortOrder: 1
    },
    {
      id: 'thumbnailRow',
      areaId: 'productGridRow',
      source: useComponent('grid/rows/Thumbnail.js'),
      props: {
        id: 'image'
      },
      sortOrder: 1
    },
    {
      id: 'priceColumn',
      areaId: 'productGridHeader',
      source: useComponent('grid/headers/FromTo.js'),
      props: {
        title: 'Price',
        id: 'price'
      },
      sortOrder: 10
    },
    {
      id: 'priceRow',
      areaId: 'productGridRow',
      source: useComponent('product/grid/PriceRow.js'),
      props: {
        id: 'price'
      },
      sortOrder: 10
    },
    {
      id: 'qtyColumn',
      areaId: 'productGridHeader',
      source: useComponent('grid/headers/FromTo.js'),
      props: {
        title: 'Qty',
        id: 'qty'
      },
      sortOrder: 20
    },
    {
      id: 'qtyRow',
      areaId: 'productGridRow',
      source: useComponent('grid/rows/Basic.js'),
      props: {
        id: 'qty'
      },
      sortOrder: 20
    },
    {
      id: 'skuColumn',
      areaId: 'productGridHeader',
      source: useComponent('grid/headers/Basic.js'),
      props: {
        title: 'SKU',
        id: 'sku'
      },
      sortOrder: 15
    },
    {
      id: 'skuRow',
      areaId: 'productGridRow',
      source: useComponent('grid/rows/Basic.js'),
      props: {
        id: 'sku'
      },
      sortOrder: 15
    }
  ],
  categoryEdit: [
    {
      id: 'metaTitle',
      areaId: 'head',
      source: useComponent('Title.js'),
      props: {
        title: 'Edit category'
      },
      sortOrder: 10
    }
  ],
  categoryNew: [
    {
      id: 'metaTitle',
      areaId: 'head',
      source: useComponent('Title.js'),
      props: {
        title: 'Create a new category'
      },
      sortOrder: 10
    }
  ],
  'categoryNew+categoryEdit': [
    {
      id: 'pageHeading',
      areaId: 'content',
      source: useComponent('PageHeading.js', 'cms'),
      props: {
        backUrl: buildUrl('categoryGrid')
      },
      sortOrder: 10
    },
    {
      id: 'categoryForm',
      areaId: 'content',
      source: useComponent('category/edit/CategoryEditForm.js'),
      props: {
        id: 'category-edit-form',
        method: 'POST',
        action: buildUrl('categorySavePost'),
        gridUrl: buildUrl('categoryGrid'),
        uploadApi: buildUrl('imageUpload', [''])
      },
      sortOrder: 10
    },
    {
      id: 'ckeditor',
      areaId: 'head',
      source: useComponent('Script.js'),
      props: {
        src: 'https://cdn.ckeditor.com/4.17.1/standard/ckeditor.js'
      },
      sortOrder: 1
    },
    {
      id: 'categoryEditGeneral',
      areaId: 'leftSide',
      source: useComponent('category/edit/General.js'),
      props: {
        browserApi: buildUrl('fileBrowser', ['']),
        deleteApi: buildUrl('fileDelete', ['']),
        uploadApi: buildUrl('imageUpload', ['']),
        folderCreateApi: buildUrl('folderCreate', [''])
      },
      sortOrder: 10
    },
    {
      id: 'categoryEditSEO',
      areaId: 'rightSide',
      source: useComponent('category/edit/Seo.js'),
      props: {},
      sortOrder: 20
    },
    {
      id: 'categoryEditBanner',
      areaId: 'rightSide',
      source: useComponent('category/edit/Image.js'),
      props: {},
      sortOrder: 10
    }
  ],
  /* Attributes */
  attributeGrid: [
    {
      id: 'attributeGrid',
      areaId: 'content',
      source: useComponent('attribute/grid/Grid.js'),
      props: {
        limit: 20
      },
      sortOrder: 20
    },
    {
      id: 'pageHeading',
      areaId: 'content',
      source: useComponent('PageHeading.js', 'cms'),
      props: {
      },
      sortOrder: 10
    },
    {
      id: 'newAttributeButton',
      areaId: 'pageHeadingRight',
      source: useComponent('form/Button.js'),
      props: {
        title: 'Add attribute',
        variant: 'primary',
        url: buildUrl('attributeNew')
      },
      sortOrder: 10
    },
    {
      id: 'title',
      areaId: 'head',
      source: useComponent('Title.js'),
      props: {
        title: 'Attributes'
      },
      sortOrder: 1
    },
    {
      id: 'nameColumn',
      areaId: 'attributeGridHeader',
      source: useComponent('grid/headers/Basic.js'),
      props: {
        title: 'Attribute name',
        id: 'attribute_name'
      },
      sortOrder: 5
    },
    {
      id: 'nameRow',
      areaId: 'attributeGridRow',
      source: useComponent('attribute/grid/NameRow.js'),
      props: {
        id: 'attribute_name',
        editUrl: 'editUrl'
      },
      sortOrder: 5
    },
    {
      id: 'groupColumn',
      areaId: 'attributeGridHeader',
      source: useComponent('attribute/grid/GroupHeaderColumn.js'),
      props: {
        title: 'Assigned group',
        id: 'group'
      },
      sortOrder: 8
    },
    {
      id: 'groupRow',
      areaId: 'attributeGridRow',
      source: useComponent('attribute/grid/GroupRow.js'),
      props: {
        id: 'groups'
      },
      sortOrder: 8
    },
    {
      id: 'typeColumn',
      areaId: 'attributeGridHeader',
      source: useComponent('grid/headers/Dropdown.js'),
      props: {
        title: 'Type',
        id: 'type',
        options: [
          { value: 'text', text: 'Text' },
          { value: 'select', text: 'Select' },
          { value: 'multiselect', text: 'Multi select' },
          { value: 'textarea', text: 'Textarea' }
        ]
      },
      sortOrder: 10
    },
    {
      id: 'typeRow',
      areaId: 'attributeGridRow',
      source: useComponent('attribute/grid/TypeRow.js'),
      props: {
        id: 'type'
      },
      sortOrder: 10
    },
    {
      id: 'isRequiredColumn',
      areaId: 'attributeGridHeader',
      source: useComponent('grid/headers/Dropdown.js'),
      props: {
        title: 'Is Required?',
        id: 'is_required',
        options: [
          { value: '1', text: 'Yes' },
          { value: '0', text: 'No' }
        ]
      },
      sortOrder: 15
    },
    {
      id: 'isRequiredRow',
      areaId: 'attributeGridRow',
      source: useComponent('grid/rows/YesNo.js'),
      props: {
        id: 'is_required'
      },
      sortOrder: 15
    },
    {
      id: 'isFilterableColumn',
      areaId: 'attributeGridHeader',
      source: useComponent('grid/headers/Dropdown.js'),
      props: {
        title: 'Is Filterable?',
        id: 'is_filterable',
        options: [
          { value: '1', text: 'Yes' },
          { value: '0', text: 'No' }
        ]
      },
      sortOrder: 20
    },
    {
      id: 'isFilterableRow',
      areaId: 'attributeGridRow',
      source: useComponent('grid/rows/YesNo.js'),
      props: {
        id: 'is_filterable'
      },
      sortOrder: 20
    }
  ],
  attributeEdit: [
    {
      id: 'metaTitle',
      areaId: 'head',
      source: useComponent('Title.js'),
      props: {
        title: 'Edit attribute'
      },
      sortOrder: 10
    }
  ],
  attributeNew: [
    {
      id: 'metaTitle',
      areaId: 'head',
      source: useComponent('Title.js'),
      props: {
        title: 'Create a new attribute'
      },
      sortOrder: 10
    }
  ],
  'attributeNew+attributeEdit': [
    {
      id: 'pageHeading',
      areaId: 'content',
      source: useComponent('PageHeading.js', 'cms'),
      props: {
        backUrl: buildUrl('attributeGrid')
      },
      sortOrder: 10
    },
    {
      id: 'attributeForm',
      areaId: 'content',
      source: useComponent('attribute/edit/AttributeEditForm.js'),
      props: {
        id: 'attribute-edit-form',
        method: 'POST',
        action: buildUrl('attributeSavePost'),
        gridUrl: buildUrl('attributeGrid')
      },
      sortOrder: 10
    },
    {
      id: 'attributeEditGeneral',
      areaId: 'leftSide',
      source: useComponent('attribute/edit/General.js'),
      props: {
      },
      sortOrder: 10
    },
    {
      id: 'attributeEditAvaibility',
      areaId: 'rightSide',
      source: useComponent('attribute/edit/Avaibility.js'),
      props: {
      },
      sortOrder: 10
    }
  ]
};
