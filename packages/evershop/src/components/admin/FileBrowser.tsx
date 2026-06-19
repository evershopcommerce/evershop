import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import './FileBrowser.scss';
import { useQuery } from 'urql';
import Spinner from '@components/admin/Spinner.js';
import { Input } from '@components/common/ui/Input.js';

const GetApisQuery = `
  query Query ($filters: [FilterInput!]) {
    browserApi: url(routeId: "fileBrowser", params: [{key: "0", value: ""}])
    deleteApi: url(routeId: "fileDelete", params: [{key: "0", value: ""}])
    uploadApi: url(routeId: "imageUpload", params: [{key: "0", value: ""}])
    folderCreateApi: url(routeId: "folderCreate")
  }
`;

export interface File {
  isSelected?: boolean;
  name: string;
  url: string;
}

const File: React.FC<{
  file: File;
  select: (url: File) => void;
}> = ({ file, select }) => {
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
              className="h-4 w-4"
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
};

const FileBrowser: React.FC<{
  onInsert: (url: string) => void;
  isMultiple: boolean;
  close: () => void;
}> = ({ onInsert, isMultiple, close }) => {
  const [error, setError] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);
  const [folders, setFolders] = React.useState<string[]>([]);
  const [files, setFiles] = React.useState<File[]>([]);
  const [currentPath, setCurrentPath] = React.useState<
    {
      name: string;
      index: number;
    }[]
  >([{ name: '', index: 0 }]);
  const newFolderRefInput = React.useRef<HTMLInputElement>(null);
  const browserApiRef = React.useRef<string>('');
  const deleteApiRef = React.useRef<string>('');
  const uploadApiRef = React.useRef<string>('');
  const folderCreateApiRef = React.useRef<string>('');

  const onSelectFolder = (e, f) => {
    e.preventDefault();
    setCurrentPath(
      currentPath.concat({ name: f, index: currentPath.length + 1 })
    );
  };

  const onSelectFolderFromBreadcrumb = (e, index) => {
    e.preventDefault();
    const newPath = [] as { name: string; index: number }[];
    currentPath.forEach((f) => {
      if (f.index <= index) newPath.push(f);
    });
    setCurrentPath(newPath);
  };

  const onSelectFile = (f) => {
    if (isMultiple === false) {
      setFiles(
        files.map((file) => {
          if (f.name === file.name) {
            file.isSelected = !file.isSelected;
          } else {
            file.isSelected = false;
          }
          return file;
        })
      );
    } else {
      setFiles(
        files.map((file) => {
          if (f.name === file.name) {
            file.isSelected = true;
          } else {
            file.isSelected = false;
          }
          return file;
        })
      );
    }
  };

  const closeFileBrowser = (e) => {
    e.preventDefault();
    close();
  };

  const createFolder = (e, folder) => {
    e.preventDefault();
    if (!folder || !folder.trim()) {
      setError(_('Invalid folder name'));
      return;
    }
    const path = currentPath.map((f) => f.name);
    path.push(folder.trim());
    setLoading(true);
    fetch(folderCreateApiRef.current, {
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
          // Get the first level folder, incase of recursive folder creation
          const recursiveFolders = folder.split('/');
          setFolders([...new Set(folders.concat(recursiveFolders[0]))]);
        } else {
          setError(response.error.message);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const deleteFile = () => {
    let file;
    files.forEach((f) => {
      if (f.isSelected === true) {
        file = f;
      }
    });

    if (!file) {
      setError(_('No file selected'));
    } else {
      const path = currentPath.map((f) => f.name);
      path.push(file.name);
      setLoading(true);
      fetch(deleteApiRef.current + path.join('/'), {
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
    let file;
    files.forEach((f) => {
      if (f.isSelected === true) {
        file = f;
      }
    });

    if (!file) {
      setError(_('No file selected'));
    } else {
      onInsert(file.url);
    }
  };

  const onUpload = (e) => {
    e.persist();
    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i += 1)
      formData.append('images', e.target.files[i]);

    const path = [] as string[];
    currentPath.forEach((f) => {
      path.push(f.name);
    });

    setLoading(true);
    fetch(uploadApiRef.current + path.join('/'), {
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

  // Create a function to fetch files and folders to avoid code duplication
  const fetchFilesAndFolders = React.useCallback(() => {
    if (!browserApiRef.current) {
      return;
    }

    const path = currentPath.map((f) => f.name);
    setLoading(true);
    fetch(browserApiRef.current + path.join('/'), {
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

  const [result] = useQuery({
    query: GetApisQuery
  });
  const { data, fetching, error: err } = result;

  if (data) {
    browserApiRef.current = data.browserApi;
    deleteApiRef.current = data.deleteApi;
    uploadApiRef.current = data.uploadApi;
    folderCreateApiRef.current = data.folderCreateApi;
  }

  // Fetch files and folders when APIs are ready
  React.useEffect(() => {
    if (data) {
      fetchFilesAndFolders();
    }
  }, [currentPath, fetchFilesAndFolders, data]);

  if (err) {
    return (
      <p className="text-destructive">
        {_('There was an error fetching file browser APIs.')}
        {err.message}
      </p>
    );
  }
  if (fetching) {
    return (
      <div className="fixed top-0 left-0 bottom-0 right-0 flex justify-center">
        <Spinner width={30} height={30} />
      </div>
    );
  }

  return (
    <div className="file-browser">
      {loading === true && (
        <div className="fixed top-0 left-0 bottom-0 right-0 flex justify-center">
          <Spinner width={30} height={30} />
        </div>
      )}
      <div className="content">
        <div className="flex justify-end">
          <a
            href="#"
            onClick={(e) => closeFileBrowser(e)}
            className="text-interactive fill-current"
          >
            <svg
              style={{ width: '2rem' }}
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
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
          <div className="grid grid-cols-4 gap-5">
            <div className="col-span-1">
              <div className="current-path mb-10">
                <div className="flex">
                  <div className="pr-2">{_('You are here:')}</div>
                  <div>
                    <a
                      href="#"
                      onClick={(e) => onSelectFolderFromBreadcrumb(e, 0)}
                      className="text-primary hover:underline"
                    >
                      {_('Root')}
                    </a>
                  </div>
                  {currentPath
                    .filter((f) => f.name !== '')
                    .map((f, index) => (
                      <div key={index}>
                        <span>/</span>
                        <a
                          className="text-primary hover:underline"
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
              <ul className="mt-4 mb-4">
                {folders.map((f, i) => (
                  <li
                    key={i}
                    className="text-primary fill-current flex list-group-item"
                  >
                    <svg
                      style={{ width: '2rem', height: '2rem' }}
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
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
                      className="pl-2 hover:underline"
                      href="#"
                      onClick={(e) => onSelectFolder(e, f)}
                    >
                      {f}
                    </a>
                  </li>
                ))}
                {folders.length === 0 && (
                  <li className="list-group-item">
                    <span>{_('There is no sub folder.')}</span>
                  </li>
                )}
              </ul>
              <div className="justify-start items-center gap-2 flex">
                <Input
                  type="text"
                  placeholder={_('New folder')}
                  ref={newFolderRefInput}
                />
                <Button
                  onClick={(e) =>
                    createFolder(e, newFolderRefInput.current?.value)
                  }
                  variant={'outline'}
                >
                  {_('Create')}
                </Button>
              </div>
            </div>
            <div className="col-span-3">
              <div className="error text-destructive mb-5">{error}</div>
              <div className="tool-bar grid grid-cols-3 gap-2 mb-5">
                <Button
                  variant="destructive"
                  title={_('Delete image')}
                  onClick={() => deleteFile()}
                >
                  {_('Delete')}
                </Button>
                <Button
                  variant="default"
                  title={_('Insert image')}
                  onClick={() => insertFile()}
                >
                  {_('Insert')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    (
                      document.getElementById(
                        'upload-image'
                      ) as HTMLInputElement
                    ).click();
                  }}
                >
                  {_('Upload')}
                </Button>
                <label
                  className="self-center"
                  id="upload-image-label"
                  htmlFor="upload-image"
                >
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
              {files.length === 0 && (
                <div>{_('There is no file to display.')}</div>
              )}
              <div className="grid grid-cols-9 gap-2">
                {files.map((f) => (
                  <File file={f} select={onSelectFile} key={f.name} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { FileBrowser };
