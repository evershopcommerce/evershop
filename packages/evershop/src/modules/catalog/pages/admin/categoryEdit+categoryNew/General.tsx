import { Card } from '@components/admin/Card.js';
import {
  CategoryTree,
  CategoryTreeItem
} from '@components/admin/CategoryTree.js';
import Area from '@components/common/Area.js';
import { Editor } from '@components/common/form/Editor.js';
import { InputField } from '@components/common/form/InputField.js';
import { Modal } from '@components/common/modal/Modal.js';
import { useModal } from '@components/common/modal/useModal.js';
import React from 'react';
import './General.scss';

const ParentCategory: React.FC<{
  parent: CategoryTreeItem;
}> = ({ parent }) => {
  const [selecting, setSelecting] = React.useState(false);
  const [category, setCategory] = React.useState<CategoryTreeItem | null>(
    parent || null
  );
  const modal = useModal();

  return (
    <div className="mt-4 relative">
      <div className="mb-2">Parent category</div>
      {category && (
        <div className="border rounded border-[#c9cccf] mb-2 p-2">
          {category.path.map((item, index) => (
            <span key={item.name} className="text-gray-500">
              {item.name}
              {index < category.path.length - 1 && ' > '}
            </span>
          ))}
          <span className="text-interactive pl-5 hover:underline">
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
          <span className="text-critical pl-5 hover:underline">
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
      <Modal
        title="Select a parent category"
        onClose={modal.close}
        isOpen={modal.isOpen}
      >
        <div className="px-2">
          <CategoryTree
            selectedCategories={category ? [category] : []}
            onSelect={(c) => {
              setCategory(c);
              modal.close();
            }}
          />
        </div>
      </Modal>
      <InputField
        type="hidden"
        name="parent_id"
        value={category?.categoryId || ''}
      />
    </div>
  );
};

interface GeneralProps {
  category: {
    name: string;
    description: Array<{
      id: string;
      size: number;
      columns: Array<{
        id: string;
        size: number;
        data: Record<string, any>;
      }>;
    }>;
    categoryId: number;
    parent: {
      categoryId: number;
      name: string;
      path: Array<{
        name: string;
      }>;
    };
  };
}

export default function General({ category }: GeneralProps) {
  const fields = [
    {
      component: {
        default: (
          <InputField
            name="name"
            label="Category Name"
            placeholder="Enter Category Name"
            defaultValue={category?.name || ''}
            required
            validation={{
              required: 'Category name is required'
            }}
          />
        )
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
      component: {
        default: (
          <Editor
            name="description"
            label="Description"
            value={category?.description || []}
          />
        )
      },
      sortOrder: 30
    }
  ];

  return (
    <Card title="General">
      <Card.Session>
        <Area id="categoryEditGeneral" coreComponents={fields} />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
};

export const query = `
  query Query {
    category(id: getContextValue("categoryId", null)) {
      categoryId
      name
      hasChildren
      description
      status
      parent {
        categoryId
        hasChildren
        name
        path {
          name
        }
      }
    }
  }
`;
