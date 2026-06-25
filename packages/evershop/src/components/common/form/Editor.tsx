import { FileBrowser } from '@components/admin/FileBrowser.js';
import { getColumnClasses } from '@components/common/form/editor/GetColumnClasses.js';
import { getRowClasses } from '@components/common/form/editor/GetRowClasses.js';
import { RawToolWrapper } from '@components/common/form/editor/RawToolWrapper.js';
import { RowTemplates } from '@components/common/form/editor/RowTemplates.js';
import { useScopedFormContext } from '@components/common/page-builder/WidgetSettingsScope.js';
import { Field, FieldLabel } from '@components/common/ui/Field.js';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import React from 'react';
import { useClient } from 'urql';
import { v4 as uuidv4 } from 'uuid';
import './Editor.scss';

async function loadEditorJS(): Promise<any> {
  const { default: EditorJS } = await import('@editorjs/editorjs');
  return EditorJS;
}

async function loadEditorJSImage(): Promise<any> {
  const { default: ImageTool } = await import('@evershop/editorjs-image');
  return ImageTool;
}

async function loadEditorJSProductList(): Promise<any> {
  const { default: ProductListTool } = await import(
    '@evershop/editorjs-product-list'
  );
  return ProductListTool;
}

async function loadEditorJSHeader(): Promise<any> {
  const { default: Header } = await import('@editorjs/header');
  return Header;
}

async function loadEditorJSList(): Promise<any> {
  const { default: List } = await import('@editorjs/list');
  return List;
}

async function loadEditorJSQuote(): Promise<any> {
  const { default: Quote } = await import('@editorjs/quote');
  return Quote;
}

// Using custom RawToolWrapper instead to fix backspace issues
// async function loadEditorJSRaw(): Promise<any> {
//   const { default: RawTool } = await import('@editorjs/raw');
//   return RawTool;
// }

const SortableRow: React.FC<{
  row: Row;
  removeRow: (rowId: string) => void;
  moveRowUp: (rowId: string) => void;
  moveRowDown: (rowId: string) => void;
  children: React.ReactNode;
}> = ({ row, removeRow, moveRowUp, moveRowDown, children }) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const actionsRef = React.useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: row.id
  });

  const style = {
    transform: transform ? `translateY(${transform.y}px)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative'
  } as React.CSSProperties;

  React.useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  return (
    <div
      className="row__container mt-3 first:mt-0 rounded-md"
      id={row.id}
      ref={setNodeRef}
      style={style}
    >
      <div
        className="row__actions"
        ref={actionsRef}
        style={dropdownOpen ? { opacity: 1, pointerEvents: 'all' } : undefined}
      >
        <button
          type="button"
          className="row__actions-btn"
          {...attributes}
          {...listeners}
          onClick={() => setDropdownOpen((prev) => !prev)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2.6"
              d="M9.40999 7.29999H9.4"
            ></path>
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2.6"
              d="M14.6 7.29999H14.59"
            ></path>
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2.6"
              d="M9.30999 12H9.3"
            ></path>
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2.6"
              d="M14.6 12H14.59"
            ></path>
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2.6"
              d="M9.40999 16.7H9.4"
            ></path>
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2.6"
              d="M14.6 16.7H14.59"
            ></path>
          </svg>
        </button>
        {dropdownOpen && (
          <div className="row__dropdown">
            <button
              type="button"
              className="row__dropdown-item"
              onClick={() => {
                moveRowUp(row.id);
                setDropdownOpen(false);
              }}
            >
              <ArrowUp width={14} height={14} />
              <span>{_('Move up')}</span>
            </button>
            <button
              type="button"
              className="row__dropdown-item"
              onClick={() => {
                moveRowDown(row.id);
                setDropdownOpen(false);
              }}
            >
              <ArrowDown width={14} height={14} />
              <span>{_('Move down')}</span>
            </button>
            <button
              type="button"
              className="row__dropdown-item row__dropdown-item--danger"
              onClick={() => {
                removeRow(row.id);
                setDropdownOpen(false);
              }}
            >
              <Trash2 width={14} height={14} />
              <span>{_('Delete')}</span>
            </button>
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

export interface Row {
  id: string;
  size: number;
  columns: {
    id: string;
    size: number;
    data: any;
  }[];
}

export interface EditorProps {
  name: string;
  value?: Row[];
  label?: string;
  /**
   * Opt-in: enable the Product List block for this editor. Default OFF.
   */
  enableProductList?: boolean;
}

export const Editor: React.FC<EditorProps> = ({
  name,
  value = [],
  label,
  enableProductList = false
}) => {
  const client = useClient();
  // Data source for the Product List tool's built-in search modal.
  const searchProducts = React.useCallback(
    async (
      keyword: string,
      { page, limit }: { page: number; limit: number }
    ) => {
      const filters: Array<{ key: string; operation: string; value: string }> =
        [
          { key: 'page', operation: 'eq', value: String(page) },
          { key: 'limit', operation: 'eq', value: String(limit) }
        ];
      if (keyword) {
        filters.unshift({ key: 'keyword', operation: 'eq', value: keyword });
      }

      const result = await client
        .query(
          `query SearchProducts($filters: [FilterInput!]) {
            products(filters: $filters) {
              items {
                productId
                uuid
                sku
                name
                url
                status
                price { regular { value text } special { value text } }
                image { url alt }
                inventory { isInStock }
              }
              total
            }
          }`,
          { filters }
        )
        .toPromise();

      const items = (result.data?.products?.items ?? []).map((p: any) => ({
        productId: p.productId,
        uuid: p.uuid,
        sku: p.sku,
        name: p.name,
        url: p.url,
        image: p.image?.url ? { url: p.image.url, alt: p.image.alt } : null,
        price: {
          regular: p.price?.regular
            ? { value: p.price.regular.value, text: p.price.regular.text }
            : undefined,
          special: p.price?.special
            ? { value: p.price.special.value, text: p.price.special.text }
            : undefined
        },
        inStock: p.inventory?.isInStock,
        status: p.status
      }));

      return { items, total: result.data?.products?.total ?? items.length };
    },
    [client]
  );

  // Re-resolve saved products by sku to live data, so the editor reflects each
  // product's current status/stock/price (not the snapshot from selection time).
  const resolveProducts = React.useCallback(
    async (skus: string[]) => {
      if (!skus || skus.length === 0) {
        return [];
      }
      const result = await client
        .query(
          `query ResolveProducts($filters: [FilterInput!]) {
            products(filters: $filters) {
              items {
                productId
                uuid
                sku
                name
                url
                status
                price { regular { value text } special { value text } }
                image { url alt }
                inventory { isInStock }
              }
            }
          }`,
          {
            filters: [
              { key: 'sku', operation: 'in', value: skus.join(',') },
              { key: 'limit', operation: 'eq', value: String(skus.length) }
            ]
          }
        )
        .toPromise();
      return (result.data?.products?.items ?? []).map((p: any) => ({
        productId: p.productId,
        uuid: p.uuid,
        sku: p.sku,
        name: p.name,
        url: p.url,
        image: p.image?.url ? { url: p.image.url, alt: p.image.alt } : null,
        price: {
          regular: p.price?.regular
            ? { value: p.price.regular.value, text: p.price.regular.text }
            : undefined,
          special: p.price?.special
            ? { value: p.price.special.value, text: p.price.special.text }
            : undefined
        },
        inStock: p.inventory?.isInStock,
        status: p.status
      }));
    },
    [client]
  );

  const [openFileBrowser, setOpenFileBrowser] = React.useState(false);
  const [fileBrowser, setFileBrowser] = React.useState<{
    onUpload: (fileUrl: string) => void;
    onError: (error: string) => void;
  } | null>(null);
  const { register, setValue } = useScopedFormContext();
  const [rows, setRows] = React.useState(
    value
      ? value.map((row) => {
          const rowId = `r__${uuidv4()}`;
          return {
            ...row,
            className: getRowClasses(row.size),
            id: row.id || rowId,
            columns: row.columns.map((column) => {
              const colId = `c__${uuidv4()}`;
              return {
                ...column,
                className: getColumnClasses(column.size),
                id: column.id || colId
              };
            })
          };
        })
      : []
  );
  const editors = React.useRef({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      setRows((items) => {
        const oldIndex = items.findIndex((row) => row.id === active.id);
        const newIndex = items.findIndex((row) => row.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          return arrayMove(items, oldIndex, newIndex);
        }
        return items;
      });
    }
  };

  React.useEffect(() => {
    const initEditors = async () => {
      const EditorJS = await loadEditorJS();
      const ImageTool = await loadEditorJSImage();
      const Header = await loadEditorJSHeader();
      const List = await loadEditorJSList();
      const Quote = await loadEditorJSQuote();
      const ProductListTool = enableProductList
        ? await loadEditorJSProductList()
        : null;
      // Using RawToolWrapper instead of loading from @editorjs/raw
      setValue(name, rows);
      rows.forEach((row) => {
        row.columns.forEach((column) => {
          if (!editors.current[column.id]) {
            editors.current[column.id] = {};
            editors.current[column.id].instance = new EditorJS({
              holder: column.id,
              placeholder: _('Type / to see the available blocks'),
              minHeight: 0,
              tools: {
                header: Header,
                list: List,
                raw: {
                  class: RawToolWrapper,
                  inlineToolbar: false
                },
                quote: Quote,
                image: {
                  class: ImageTool,
                  config: {
                    onSelectFile: (onUpload, onError) => {
                      setFileBrowser({
                        onUpload: (fileUrl) => {
                          onUpload({
                            success: 1,
                            file: {
                              url: fileUrl
                            }
                          });
                        },
                        onError
                      });
                      setOpenFileBrowser(true);
                    }
                  }
                },
                ...(ProductListTool
                  ? {
                      productList: {
                        class: ProductListTool,
                        config: {
                          defaultColumns: 4,
                          pageSize: 20,
                          searchProducts,
                          resolveProducts
                        }
                      }
                    }
                  : {})
              },
              data: column.data,
              onChange: (api) => {
                api.saver.save().then((outputData) => {
                  // Save outputData to the column and trigger re-render
                  setRows((prevRows) => {
                    const newRows = [...prevRows];
                    const rowIdx = newRows.findIndex((r) => r.id === row.id);
                    const columnIdx = newRows[rowIdx].columns.findIndex(
                      (c) => c.id === column.id
                    );
                    newRows[rowIdx].columns[columnIdx].data = outputData;
                    setValue(name, newRows);
                    return newRows;
                  });
                });
              }
            });
          }
        });
      });
    };
    initEditors();
  }, [rows.length]);

  const removeRow = (rowId) => {
    setRows(rows.filter((i) => i.id !== rowId));
  };

  const moveRowUp = (rowId: string) => {
    setRows((prevRows) => {
      const index = prevRows.findIndex((r) => r.id === rowId);
      if (index <= 0) return prevRows;
      return arrayMove(prevRows, index, index - 1);
    });
  };

  const moveRowDown = (rowId: string) => {
    setRows((prevRows) => {
      const index = prevRows.findIndex((r) => r.id === rowId);
      if (index >= prevRows.length - 1) return prevRows;
      return arrayMove(prevRows, index, index + 1);
    });
  };

  const addRow = (row) => {
    setRows(rows.concat(row));
  };

  return (
    <Field className="editor form-field-container gap-2">
      <FieldLabel htmlFor="description">{label}</FieldLabel>
      <div className="prose prose-sm max-w-none">
        <div className="border border-border px-3 rounded">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={rows.map((row) => row.id)}
              strategy={verticalListSortingStrategy}
            >
              <div id="rows">
                {rows.map((row) => (
                  // Grid template columns based on the number of columns in the row
                  <SortableRow
                    key={row.id}
                    row={row}
                    removeRow={removeRow}
                    moveRowUp={moveRowUp}
                    moveRowDown={moveRowDown}
                  >
                    <div
                      className={`row grid divide-x gap-x-3 divide-dashed ${row.className}`}
                      style={{
                        minHeight: '30px'
                      }}
                    >
                      {row.columns.map((column) => (
                        <div
                          className={`column  ${column.className}`}
                          key={column.id}
                        >
                          <div id={column.id} />
                        </div>
                      ))}
                    </div>
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
        <div className="flex justify-center">
          <div className="flex justify-center flex-col mt-5">
            <RowTemplates addRow={addRow} />
          </div>
        </div>
      </div>
      <input type="hidden" {...register(name)} />
      {openFileBrowser && (
        <FileBrowser
          onInsert={(url) => {
            fileBrowser && fileBrowser.onUpload(url);
            setOpenFileBrowser(false);
          }}
          close={() => setOpenFileBrowser(false)}
          isMultiple={false}
        />
      )}
    </Field>
  );
};
