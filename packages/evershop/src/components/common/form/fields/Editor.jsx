
import RemoveIcon from '@heroicons/react/outline/XCircleIcon';
import PropTypes from 'prop-types';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Field } from '../Field';
import { validator } from '../validator';
import FileBrowser from './editor/FileBrowser';
import getColumnClasses from './editor/GetColumnClasses';
import getRowClasses from './editor/GetRowClasses';
import RowTemplates from './editor/RowTemplates';
import './Editor.scss';

async function loadSwappable() {
  const { Swappable } = await import('@shopify/draggable');
  return Swappable;
}

async function loadEditorJS() {
  const { default: EditorJS } = await import('@editorjs/editorjs');
  return EditorJS;
}

async function loadEditorJSImage() {
  const { default: ImageTool } = await import('@evershop/editorjs-image');
  return ImageTool;
}

async function loadEditorJSHeader() {
  const { default: Header } = await import('@editorjs/header');
  return Header;
}

async function loadEditorJSList() {
  const { default: List } = await import('@editorjs/list');
  return List;
}

async function loadEditorJSQuote() {
  const { default: Quote } = await import('@editorjs/quote');
  return Quote;
}

async function loadEditorJSRaw() {
  const { default: RawTool } = await import('@editorjs/raw');
  return RawTool;
}

export default function Editor({
  name,
  value = [],
  label,
  browserApi,
  deleteApi,
  uploadApi,
  folderCreateApi
}) {
  const draggable = React.useRef(null);
  const [fileBrowser, setFileBrowser] = React.useState(null);
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
  const isBuilding = React.useRef(false);

  React.useEffect(() => {
    async function initSwappable() {
      const Swappable = await loadSwappable();

      const swappable = new Swappable(document.querySelectorAll(`div#rows`), {
        draggable: 'div.row__container',
        handle: 'div.row__container .drag__icon',
        mirror: {
          constrainDimensions: true
        }
      });
      let source = null;
      let destination = null;
      swappable.on('swappable:swapped', (event) => {
        source = event.data.dragEvent.data.source.id;
        destination = event.data.dragEvent.data.over.id;
      });

      swappable.on('swappable:stop', () => {
        if (!source || !destination) {
          return;
        }
        setRows((originRows) => {
          // Swap the source and destination in the rows array
          const newRows = originRows.map((r) => {
            const newRow = { ...r };
            newRow.columns = r.columns.map((c) => ({ ...c }));
            return newRow;
          });
          const sourceIndex = newRows.findIndex((r) => r.id === source);
          const destinationIndex = newRows.findIndex(
            (r) => r.id === destination
          );
          const temp = newRows[sourceIndex];
          newRows[sourceIndex] = newRows[destinationIndex];
          newRows[destinationIndex] = temp;
          return newRows;
        });
      });
      draggable.current = swappable;
    }
    initSwappable();
  }, []);

  React.useEffect(() => {
    const initEditors = async () => {
      const EditorJS = await loadEditorJS();
      const ImageTool = await loadEditorJSImage();
      const Header = await loadEditorJSHeader();
      const List = await loadEditorJSList();
      const Quote = await loadEditorJSQuote();
      const RawTool = await loadEditorJSRaw();
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
                    }
                  }
                }
              },
              data: column.data,
              onChange: (api) => {
                isBuilding.current = true;
                api.saver.save().then((outputData) => {
                  // Save outputData to the column and trigger re-render
                  setRows((prevRows) => {
                    const newRows = [...prevRows];
                    const rowIdx = newRows.findIndex((r) => r.id === row.id);
                    const columnIdx = newRows[rowIdx].columns.findIndex(
                      (c) => c.id === column.id
                    );
                    newRows[rowIdx].columns[columnIdx].data = outputData;
                    return newRows;
                  });
                  isBuilding.current = false;
                });
              }
            });
          }
        });
      });
    };
    initEditors();
  }, [rows.length]);

  React.useEffect(() => {
    validator.addRule(
      'editorBuilding',
      () => !isBuilding.current,
      'Please wait for the editor to finish building'
    );
  }, []);

  const removeRow = (rowId) => {
    setRows(rows.filter((i) => i.id !== rowId));
  };

  const addRow = (row) => {
    setRows(rows.concat(row));
  };

  //
  return (
    <div className="editor form-field-container">
      <label htmlFor="description mt-4">{label}</label>
      <div className="prose prose-xl max-w-none">
        <div id="rows">
          {rows.map((row) => (
            // Grid template columns based on the number of columns in the row
            <div
              className="border row__container mt-5"
              id={row.id}
              key={row.id}
            >
              <div className="config p-3 flex justify-between bg-[#cccccc] items-center">
                <div className="drag__icon">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                    }}
                  >
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
                  </a>
                </div>
                <div>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      removeRow(row.id);
                    }}
                  >
                    <RemoveIcon color="#d72c0d" width={20} height={20} />
                  </a>
                </div>
              </div>
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
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <div className="flex justify-center flex-col mt-5">
            <RowTemplates addRow={addRow} />
          </div>
        </div>
      </div>
      <Field
        type="hidden"
        value={JSON.stringify(
          rows.map((row) => ({
            id: row.id,
            size: row.size,
            columns: row.columns.map((column) => ({
              id: column.id,
              size: column.size,
              data: column.data
            }))
          }))
        )}
        name={name}
        validationRules={['editorBuilding']}
      />
      {fileBrowser && (
        <FileBrowser
          onInsert={(url) => {
            fileBrowser.onUpload(url);
          }}
          isMultiple={false}
          setFileBrowser={setFileBrowser}
          browserApi={browserApi}
          deleteApi={deleteApi}
          uploadApi={uploadApi}
          folderCreateApi={folderCreateApi}
        />
      )}
    </div>
  );
}

Editor.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.arrayOf(
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
  browserApi: PropTypes.string.isRequired,
  deleteApi: PropTypes.string.isRequired,
  uploadApi: PropTypes.string.isRequired,
  folderCreateApi: PropTypes.string.isRequired
};

Editor.defaultProps = {
  value: [],
  label: ''
};
