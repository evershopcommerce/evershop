import { Card } from '@components/admin/Card';
import { CategoryTree } from '@components/admin/CategoryTree.js';
import Area from '@components/common/Area';
import { Field } from '@components/common/form/Field';
import { Editor } from '@components/common/form/fields/Editor.js';
import { useModal } from '@components/common/modal/useModal';
import PropTypes from 'prop-types';
import React from 'react';
import { get } from '../../../../../lib/util/get.js';

function ParentCategory({ currentId, parent }) {
  const [selecting, setSelecting] = React.useState(false);
  const [category, setCategory] = React.useState(parent || null);
  const modal = useModal();

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
          <span className="text-interactive pl-8 hover:underline">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                modal.open();
              }}
            >
              Change
            </a>
          </span>
          <span className="text-critical pl-8 hover:underline">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCategory(null);
              }}
            >
              Unlink
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
      <modal.Content title="Select a parent category">
        <div className="px-3">
          <CategoryTree
            selectedCategory={category}
            onSelect={(c) => {
              setCategory(c);
              modal.close();
            }}
          />
        </div>
      </modal.Content>
      <input
        type="hidden"
        name="parent_id"
        value={category?.categoryId || ''}
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

export default function General({ category }) {
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
      component: { default: Editor },
      props: {
        id: 'description',
        name: 'description',
        label: 'Description'
      },
      sortOrder: 30
    }
  ].map((f) => {
    if (get(category, `${f.props.id}`) !== undefined) {
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
  category: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        size: PropTypes.number.isRequired,
        columns: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.string.isRequired,
            size: PropTypes.number.isRequired,

            data: PropTypes.object.isRequired
          })
        )
      })
    ),
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
  }
`;
