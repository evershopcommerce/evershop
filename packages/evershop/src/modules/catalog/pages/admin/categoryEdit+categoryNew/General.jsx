import PropTypes from 'prop-types';
import React from 'react';
import Area from '@components/common/Area';
import { get } from '@evershop/evershop/src/lib/util/get';
import { Field } from '@components/common/form/Field';
import { Card } from '@components/admin/cms/Card';
import CkeditorField from '@components/common/form/fields/Ckeditor';
import CategoryTree from '@components/admin/catalog/productEdit/category/CategoryTree';

function ParentCategory({ currentId, parent }) {
  const [selecting, setSelecting] = React.useState(false);
  const [category, setCategory] = React.useState(parent || null);

  return (
    <div className="mt-6 relative">
      <div className="mb-4">Parent category</div>
      {category && (
        <div className="border rounded border-[#c9cccf] mb-4 p-4">
          {category.path.map((item, index) => (
            <span key={item.name} className="text-gray-500">
              {item.name}
              {index < category.path.length - 1 && ' > '}
            </span>
          ))}
          <span className="text-interactive pl-8">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setSelecting(true);
              }}
            >
              Change
            </a>
          </span>
        </div>
      )}
      {!selecting && !category && (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setSelecting(!selecting);
          }}
          className="text-interactive"
        >
          Select category
        </a>
      )}
      {selecting && (
        <CategoryTree
          selectedCategory={category}
          setSelectedCategory={(c) => {
            if (c.categoryId === currentId) {
              return;
            }
            setCategory(c);
            setSelecting(false);
          }}
        />
      )}
      <input
        type="hidden"
        name="parent_id"
        value={category?.categoryId || null}
      />
    </div>
  );
}

ParentCategory.propTypes = {
  parent: PropTypes.shape({
    categoryId: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    path: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired
      })
    ).isRequired
  }),
  currentId: PropTypes.number
};

ParentCategory.defaultProps = {
  parent: null,
  currentId: null
};

export default function General({
  category,
  browserApi,
  deleteApi,
  uploadApi,
  folderCreateApi
}) {
  const fields = [
    {
      component: { default: Field },
      props: {
        id: 'name',
        name: 'name',
        label: 'Name',
        validationRules: ['notEmpty'],
        type: 'text'
      },
      sortOrder: 10,
      id: 'name'
    },
    {
      component: { default: ParentCategory },
      props: {
        parent: category?.parent,
        currentId: category?.categoryId
      },
      sortOrder: 15,
      id: 'parent'
    },
    {
      component: { default: Field },
      props: {
        id: 'categoryId',
        name: 'category_id',
        type: 'hidden'
      },
      sortOrder: 20
    },
    {
      component: { default: CkeditorField },
      props: {
        id: 'description',
        name: 'description',
        label: 'Description',
        browserApi,
        deleteApi,
        uploadApi,
        folderCreateApi
      },
      sortOrder: 30
    }
  ].map((f) => {
    if (get(category, `${f.props.id}`) !== undefined) {
      // eslint-disable-next-line no-param-reassign
      f.props.value = get(category, `${f.props.id}`);
    }
    return f;
  });

  return (
    <Card title="General">
      <Card.Session>
        <Area id="categoryEditGeneral" coreComponents={fields} />
      </Card.Session>
    </Card>
  );
}

General.propTypes = {
  browserApi: PropTypes.string.isRequired,
  deleteApi: PropTypes.string.isRequired,
  folderCreateApi: PropTypes.string.isRequired,
  uploadApi: PropTypes.string.isRequired,
  category: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.string,
    categoryId: PropTypes.number,
    parent: PropTypes.shape({
      categoryId: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      path: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string.isRequired
        })
      ).isRequired
    })
  })
};

General.defaultProps = {
  category: {}
};

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
};

export const query = `
  query Query {
    category(id: getContextValue("categoryId", null)) {
      categoryId
      name
      description
      status
      parent {
        categoryId
        name
        path {
          name
        }
      }
    }
    browserApi: url(routeId: "fileBrowser", params: [{key: "0", value: ""}])
    deleteApi: url(routeId: "fileDelete", params: [{key: "0", value: ""}])
    uploadApi: url(routeId: "imageUpload", params: [{key: "0", value: ""}])
    folderCreateApi: url(routeId: "folderCreate")
  }
`;
