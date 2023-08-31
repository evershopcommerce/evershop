/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/no-array-index-key */
/* eslint-disable no-param-reassign */
import PropTypes from 'prop-types';
import React from 'react';
import Button from '@components/common/form/Button';
import { Input } from '@components/common/form/fields/Input';
import './Ckeditor.scss';

function File({ file, select }) {
  const className = file.isSelected === true ? 'selected' : '';
  return (
    <div className={`col image-item ${className}`}>
      <div className="inner">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            select(file);
          }}
        >
          <img src={file.url} alt="" />
        </a>
        {file.isSelected === true && (
          <div className="select fill-current text-primary">
            <svg
              style={{ width: '2rem' }}
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

File.propTypes = {
  file: PropTypes.shape({
    isSelected: PropTypes.bool,
    url: PropTypes.string
  }).isRequired,
  select: PropTypes.func.isRequired
};

function FileBrowser({
  editor,
  setFileBrowser,
  browserApi,
  deleteApi,
  uploadApi,
  folderCreateApi
}) {
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [folders, setFolders] = React.useState([]);
  const [files, setFiles] = React.useState([]);
  const [currentPath, setCurrentPath] = React.useState([]);
  const newFolderRefInput = React.useRef(null);

  const onSelectFolder = (e, f) => {
    e.preventDefault();
    setCurrentPath(
      currentPath.concat({ name: f, index: currentPath.length + 1 })
    );
  };

  const onSelectFolderFromBreadcrumb = (e, index) => {
    e.preventDefault();
    const newPath = [];
    currentPath.forEach((f) => {
      if (f.index <= index) newPath.push(f);
    });
    setCurrentPath(newPath);
  };

  const onSelectFile = (f) => {
    setFiles(
      files.map((file) => {
        if (f.name === file.name) file.isSelected = true;
        else file.isSelected = false;

        return file;
      })
    );
  };

  const close = (e) => {
    e.preventDefault();
    setFileBrowser(false);
  };

  const createFolder = (e, folder) => {
    e.preventDefault();
    if (!folder || !folder.trim()) {
      setError('Invalid folder name');
      return;
    }
    const path = currentPath.map((f) => f.name);
    path.push(folder.trim());
    setLoading(true);
    fetch(folderCreateApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path: path.join('/') }),
      credentials: 'same-origin'
    })
      .then((res) => res.json())
      .then((response) => {
        if (!response.error) {
          setFolders(folders.concat(response.data.name));
        } else {
          setError(response.error.message);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const deleteFile = () => {
    let file = null;
    files.forEach((f) => {
      if (f.isSelected === true) {
        file = f;
      }
    });

    if (file === null) setError('No file selected');
    else {
      const path = currentPath.map((f) => f.name);
      path.push(file.name);
      setLoading(true);
      fetch(deleteApi + path.join('/'), {
        method: 'DELETE'
      })
        .then((res) => res.json())
        .then((response) => {
          if (!response.error) {
            setCurrentPath(currentPath.map((f) => f));
          } else {
            setError(response.error.message);
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  };

  const insertFile = () => {
    let file = null;
    files.forEach((f) => {
      if (f.isSelected === true) file = f;
    });

    if (file === null) setError('No file selected');
    else {
      // editor.insertHtml(`<img src='${file.url}'/>`);
      editor.execute('insertImage', { source: file.url });
      editor.fire('change');
      setFileBrowser(false);
    }
  };

  const onUpload = (e) => {
    e.persist();
    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i += 1)
      formData.append('images', e.target.files[i]);

    const path = [];
    currentPath.forEach((f) => {
      path.push(f.name);
    });

    setLoading(true);
    fetch(uploadApi + path.join('/'), {
      method: 'POST',
      body: formData
    })
      .then((res) => res.json())
      .then((response) => {
        if (!response.error) {
          setCurrentPath(currentPath.map((f) => f));
        } else {
          setError(response.error.message);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  React.useEffect(() => {
    const path = currentPath.map((f) => f.name);
    setLoading(true);
    fetch(browserApi + path.join('/'), {
      method: 'GET'
    })
      .then((res) => res.json())
      .then((response) => {
        if (!response.error) {
          setFolders(response.data.folders);
          setFiles(response.data.files);
        } else {
          setError(response.error.message);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [currentPath]);

  return (
    <div className="file-browser">
      {loading === true && (
        <div className="loading">
          <div className="lds-ring">
            <div />
            <div />
            <div />
            <div />
          </div>
        </div>
      )}
      <div className="content">
        <div className="flex justify-end">
          <a
            href="#"
            onClick={(e) => close(e)}
            className="text-interactive fill-current"
          >
            <svg
              style={{ width: '2rem' }}
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </a>
        </div>
        <div>
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-1">
              <div className="current-path mb-4">
                <div className="flex">
                  <div className="pr-1">You are here:</div>
                  <div>
                    <a
                      href="#"
                      onClick={(e) => onSelectFolderFromBreadcrumb(e, 0)}
                      className="text-interactive hover:underline"
                    >
                      Root
                    </a>
                  </div>
                  {currentPath.map((f, index) => (
                    <div key={index}>
                      <span>/</span>
                      <a
                        className="text-interactive hover:underline"
                        href="#"
                        onClick={(e) =>
                          onSelectFolderFromBreadcrumb(e, f.index)
                        }
                      >
                        {f.name}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
              <ul className="mt-15 mb-15">
                {folders.map((f, i) => (
                  <li
                    key={i}
                    className="text-interactive fill-current flex list-group-item"
                  >
                    <svg
                      style={{ width: '2rem', height: '2rem' }}
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                    <a
                      className="pl-05 hover:underline"
                      href="#"
                      onClick={(e) => onSelectFolder(e, f)}
                    >
                      {f}
                    </a>
                  </li>
                ))}
                {folders.length === 0 && (
                  <li className="list-group-item">
                    <span>There is no sub folder.</span>
                  </li>
                )}
              </ul>
              <div className=" justify-between">
                <Input
                  type="text"
                  placeholder="New folder"
                  ref={newFolderRefInput}
                />
                <div className="mt-1">
                  <a
                    href="#"
                    onClick={(e) =>
                      createFolder(e, newFolderRefInput.current.value)
                    }
                    className="text-interactive hover:underline"
                  >
                    Create
                  </a>
                </div>
              </div>
            </div>
            <div className="col-span-3">
              <div className="error text-critical mb-2">{error}</div>
              <div className="tool-bar grid grid-cols-3 gap-1 mb-2">
                <Button
                  variant="critical"
                  outline
                  title="Delete image"
                  onAction={() => deleteFile()}
                />
                <Button
                  variant="primary"
                  title="Insert image"
                  onAction={() => insertFile()}
                />
                <Button
                  title="Upload image"
                  variant="info"
                  onAction={() => {
                    document.getElementById('upload-image').click();
                  }}
                />
                <label htmlFor="upload-image" className="self-center">
                  <a className="invisible">
                    <input
                      id="upload-image"
                      type="file"
                      multiple
                      onChange={onUpload}
                    />
                  </a>
                </label>
              </div>
              {files.length === 0 && <div>There is no file to display.</div>}
              <div className="grid grid-cols-9 gap-1">
                {files.map((f) => (
                  <File file={f} select={onSelectFile} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

FileBrowser.propTypes = {
  browserApi: PropTypes.string.isRequired,
  deleteApi: PropTypes.string.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  editor: PropTypes.object.isRequired,
  folderCreateApi: PropTypes.string.isRequired,
  setFileBrowser: PropTypes.string.isRequired,
  uploadApi: PropTypes.string.isRequired
};

export default function CkeditorField({
  name,
  value,
  label,
  browserApi,
  deleteApi,
  uploadApi,
  folderCreateApi
}) {
  const editorRef = React.useRef();
  const [editorLoaded, setEditorLoaded] = React.useState(false);
  const [fileBrowser, setFileBrowser] = React.useState(false);
  const [editor, setEditor] = React.useState(null);
  const { CKEditor, ClassicEditor } = editorRef.current || {};
  const [editorData, setEditorData] = React.useState(value);

  React.useEffect(() => {
    editorRef.current = {
      CKEditor: require('@ckeditor/ckeditor5-react').CKEditor,
      ClassicEditor: require('@ckeditor/ckeditor5-build-classic')
    };
    setEditorLoaded(true);
  }, []);

  return (
    <div className="ckeditor">
      <label htmlFor="description mt-1">{label}</label>
      <div className="image-icon mt-1">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setFileBrowser(true);
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '20px', height: '20px' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="hover:fill-primary"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </a>
      </div>
      <input type="hidden" name={name} value={editorData} />
      {editorLoaded && (
        <CKEditor
          config={{
            toolbar: [
              'heading',
              '|',
              'bold',
              'italic',
              'link',
              'bulletedList',
              'numberedList',
              'blockQuote',
              'insertTable',
              'codeBlock'
            ]
          }}
          editor={ClassicEditor}
          data={value}
          onReady={(editor) => {
            setEditor(editor);
          }}
          onChange={(event, editor) => {
            const data = editor.getData();
            // eslint-disable-next-line no-undef
            // Set data to the textarea with the name of the editor
            // CKEditor.instances[name].setData(data);
            setEditorData(data);
          }}
        />
      )}
      {fileBrowser === true && (
        <FileBrowser
          editor={editor}
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

CkeditorField.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  browserApi: PropTypes.string.isRequired,
  deleteApi: PropTypes.string.isRequired,
  uploadApi: PropTypes.string.isRequired,
  folderCreateApi: PropTypes.string.isRequired
};

CkeditorField.defaultProps = {
  label: ''
};
