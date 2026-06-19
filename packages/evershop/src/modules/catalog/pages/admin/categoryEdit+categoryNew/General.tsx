import {
  CategoryTree,
  CategoryTreeItem
} from '@components/admin/CategoryTree.js';
import Area from '@components/common/Area.js';
import { Editor } from '@components/common/form/Editor.js';
import { InputField } from '@components/common/form/InputField.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import './General.scss';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@components/common/ui/Dialog.js';
import { Button } from '@components/common/ui/Button.js';
import { Label } from '@components/common/ui/Label.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useFormContext } from 'react-hook-form';

const ParentCategory: React.FC<{
  parent: CategoryTreeItem;
}> = ({ parent }) => {
  const { setValue } = useFormContext();
  const [category, setCategory] = React.useState<CategoryTreeItem | null>(
    parent || null
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const handleCategoryChange = (newCategory: CategoryTreeItem | null) => {
    setCategory(newCategory);
    setValue('parent_id', newCategory?.categoryId || '');
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <div className="my-3 space-y-3">
        <Label>{_('Parent category')}</Label>
        {category && (
          <div className="border rounded border-border mb-2 p-2">
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
                  setDialogOpen(true);
                }}
              >
                {_('Change')}
              </a>
            </span>
            <span className="text-destructive pl-5 hover:underline">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleCategoryChange(null);
                }}
              >
                {_('Unlink')}
              </a>
            </span>
          </div>
        )}
        {!category && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              setDialogOpen(true);
            }}
          >
            {_('Select category')}
          </Button>
        )}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{_('Select Parent Category')}</DialogTitle>
          </DialogHeader>
          <CategoryTree
            selectedCategories={category ? [category] : []}
            onSelect={(c) => {
              handleCategoryChange(c);
              setDialogOpen(false);
            }}
          />
        </DialogContent>
        <InputField
          type="hidden"
          name="parent_id"
          defaultValue={category?.categoryId || ''}
        />
      </div>
    </Dialog>
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
            label={_('Category Name')}
            placeholder={_('Enter Category Name')}
            defaultValue={category?.name || ''}
            required
            validation={{
              required: _('Category name is required')
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
            label={_('Description')}
            value={category?.description || []}
          />
        )
      },
      sortOrder: 30
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('General')}</CardTitle>
        <CardDescription>
          {_('Manage the general information of the category.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Area id="categoryEditGeneral" coreComponents={fields} />
      </CardContent>
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
