import { FileBrowser } from '@components/admin/FileBrowser.js';
import { getColumnClasses } from '@components/common/form/editor/GetColumnClasses.js';
import { getRowClasses } from '@components/common/form/editor/GetRowClasses.js';
import { RowTemplates } from '@components/common/form/editor/RowTemplates.js';
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
import { XCircleIcon } from '@heroicons/react/24/outline';
import React from 'react';
import { useFormContext } from 'react-hook-form';
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

async function loadEditorJSRaw(): Promise<any> {
  const { default: RawTool } = await import('@editorjs/raw');
  return RawTool;
}

const SortableRow: React.FC<{
  row: Row;
  removeRow: (rowId: string) => void;
  children: React.ReactNode;
}> = ({ row, removeRow, children }) => {
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
    position: 'relative',
    zIndex: isDragging ? 1 : 0
  } as React.CSSProperties;

  return (
    <div
      className="border row__container mt-5"
      id={row.id}
      ref={setNodeRef}
      style={style}
    >
      <div className="config p-3 flex justify-between bg-[#cccccc] items-center">
        <div className="drag__icon cursor-move" {...attributes} {...listeners}>
          <svg
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            fill="#949494"
            width={20}
            height={20}
          >
            <g>
              <path fill="none" d="M0 0h24v24H0z" />
              <path
                fillRule="nonzero"
                d="M14 6h2v2h5a1 1 0 0 1 1 1v7.5L16 13l.036 8.062 2.223-2.15L20.041 22H9a1 1 0 0 1-1-1v-5H6v-2h2V9a1 1 0 0 1 1-1h5V6zm8 11.338V21a1 1 0 0 1-.048.307l-1.96-3.394L22 17.338zM4 14v2H2v-2h2zm0-4v2H2v-2h2zm0-4v2H2V6h2zm0-4v2H2V2h2zm4 0v2H6V2h2zm4 0v2h-2V2h2zm4 0v2h-2V2h2z"
              />
            </g>
          </svg>
        </div>
        <div>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              removeRow(row.id);
            }}
          >
            <XCircleIcon color="#d72c0d" width={20} height={20} />
          </a>
        </div>
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
}

export const Editor: React.FC<EditorProps> = ({ name, value = [], label }) => {
  const [openFileBrowser, setOpenFileBrowser] = React.useState(false);
  const [fileBrowser, setFileBrowser] = React.useState<{
    onUpload: (fileUrl: string) => void;
    onError: (error: string) => void;
  } | null>(null);
  const { register, setValue } = useFormContext();
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
      const RawTool = await loadEditorJSRaw();
      setValue(name, rows);
      rows.forEach((row) => {
        row.columns.forEach((column) => {
          if (!editors.current[column.id]) {
            editors.current[column.id] = {};
            editors.current[column.id].instance = new EditorJS({
              holder: column.id,
              placeholder: 'Type / to see the available blocks',
              minHeight: 0,
              tools: {
                header: Header,
                list: List,
                raw: RawTool,
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
                }
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

  const addRow = (row) => {
    setRows(rows.concat(row));
  };

  return (
    <div className="editor form-field-container">
      <label htmlFor="description mt-4">{label}</label>
      <div className="prose prose-xl max-w-none">
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
                <SortableRow key={row.id} row={row} removeRow={removeRow}>
                  <div
                    className={`row grid p-5 divide-x divide-dashed ${row.className}`}
                    style={{
                      minHeight: '30px'
                    }}
                  >
                    {row.columns.map((column) => (
                      <div
                        className={`column p-3 ${column.className}`}
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
    </div>
  );
};
