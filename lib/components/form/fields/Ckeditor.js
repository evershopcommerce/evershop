import { TextArea } from "./TextArea";
import React from "react";
import Button from "../Button";

function File({ file, select }) {
    let className = file.isSelected === true ? "selected" : "";
    return <div className={"col image-item " + className}>
        <div className="inner">
            <a href="#" onClick={(e) => { e.preventDefault(); select(file) }}>
                <img src={file.url} />
            </a>
            {file.isSelected === true && <div className="select"><i className="far fa-check-square"></i></div>}
        </div>
    </div>
}

function FileBrowser({ editor, setFileBrowser, browserApi, deleteApi, uploadApi, folderCreateApi }) {
    const [error, setError] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [folders, setFolders] = React.useState([]);
    const [files, setFiles] = React.useState([]);
    const [currentPath, setCurrentPath] = React.useState([]);
    const newFolderRefInput = React.useRef(null);

    const onSelectFolder = (e, f) => {
        e.preventDefault();
        setCurrentPath(currentPath.concat({ name: f, index: currentPath.length + 1 }));
    };

    const onSelectFolderFromBreadcrumb = (e, index) => {
        e.preventDefault();
        let newPath = [];
        currentPath.forEach((f, k) => {
            if (f.index <= index)
                newPath.push(f);
        });
        setCurrentPath(newPath);
    };

    const onSelectFile = (f) => {
        setFiles(files.map((file) => {
            if (f.name === file.name)
                file.isSelected = true;
            else
                file.isSelected = false;

            return file;
        }));
    };

    const close = (e) => {
        e.preventDefault();
        setFileBrowser(false);
    };

    const createFolder = (e, folder) => {
        e.preventDefault();
        if (!folder || !folder.trim()) {
            setError("Invalid folder name");
            return;
        }
        let path = currentPath.map((f) => f.name);
        path.push(folder.trim());
        setLoading(true);
        fetch(
            folderCreateApi + path.join("/"),
            {
                method: "GET"
            }
        )
            .then(res => res.json())
            .then(response => {
                if (response.success === true)
                    setFolders(folders.concat(response.data.name));
                else
                    setError(response.message);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    };

    const deleteFile = (e) => {
        e.preventDefault();
        let file = null;
        files.forEach((f) => {
            if (f.isSelected === true) {
                file = f;
            }
        });

        if (file === null)
            setError("No file selected");
        else {
            let path = currentPath.map((f) => f.name);
            path.push(file.name);
            setLoading(true);
            fetch(
                deleteApi + path.join("/"),
                {
                    method: "POST"
                }
            )
                .then(res => res.json())
                .then(response => {
                    if (response.success === true) {
                        setCurrentPath(currentPath.map((f) => f));
                    } else {
                        setError(response.message);
                    }
                })
                .catch(e => setError(e.message))
                .finally(() => setLoading(false));
        }
    };

    const insertFile = (e) => {
        e.preventDefault();
        let file = null;
        files.forEach((f) => {
            if (f.isSelected === true)
                file = f;
        });

        if (file === null)
            setError("No file selected");
        else {
            editor.insertHtml(`<img src='${file.url}'/>`);
            setFileBrowser(false);
        }
    };

    const onUpload = (e) => {
        e.persist();
        let formData = new FormData();
        for (var i = 0; i < e.target.files.length; i++)
            formData.append('images', e.target.files[i]);

        let path = [];
        currentPath.forEach((f, k) => {
            path.push(f.name);
        });

        setLoading(true);
        fetch(
            uploadApi + path.join("/"),
            {
                method: "POST",
                body: formData
            }
        )
            .then(res => res.json())
            .then(response => {
                if (response.success === true)
                    setCurrentPath(currentPath.map((f) => f));
                else
                    setError(response.message);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    };

    React.useEffect(() => {
        let path = currentPath.map((f) => f.name);
        setLoading(true);
        fetch(
            browserApi + path.join("/"),
            {
                method: "GET"
            }
        )
            .then(res => res.json())
            .then(response => {
                if (response.success === true) {
                    setFolders(response.data.folders);
                    setFiles(response.data.files);
                } else
                    setError(response.message);

            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [currentPath]);

    return <div className="file-browser">
        {loading === true && <div className="loading"><div className="lds-ring"><div></div><div></div><div></div><div></div></div></div>}
        <div className="content">
            <div className="close"><a href="#" onClick={(e) => close(e)}><i className="fas fa-times"></i></a></div>
            <div>
                <div className="grid grid-cols-4">
                    <div className="col-span-1">
                        <div className="current-path mb-4">
                            <div><div className="d-inline h4 pr-2">You are here:</div>
                                <div className="d-inline"><a href="#" onClick={(e) => onSelectFolderFromBreadcrumb(e, 0)}>Root</a></div>
                                {currentPath.map((f, index) => {
                                    return <div className="d-inline" key={index}><span>/</span><a href="#" onClick={(e) => onSelectFolderFromBreadcrumb(e, f.index)}>{f.name}</a></div>
                                })}
                            </div>
                        </div>
                        <ul className="list-group list-group-flush">
                            {folders.map((f, i) => <li className={"list-group-item"} key={i}><i className="far fa-folder"></i><a className="pl-2" href="#" onClick={(e) => onSelectFolder(e, f)}>{f}</a></li>)}
                            {folders.length === 0 && <li className={"list-group-item"}><span>There is no sub folder.</span></li>}
                        </ul>
                        <div className="input-group mt-3">
                            <input type="text" className="form-control" placeholder="New folder" ref={newFolderRefInput} />
                            <div className="input-group-append">
                                <span className="input-group-text" id="basic-addon2"><a href="#" onClick={(e) => createFolder(e, newFolderRefInput.current.value)}>Create</a></span>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-3">
                        <div className="error text-critical mb-2">{error}</div>
                        <div className="tool-bar mb-2">
                            <Button variant='critical' title='Delete image' onAction={(e) => deleteFile(e)} />
                            <Button variant='primary' title='Insert image' onAction={(e) => insertFile(e)} />
                            <label htmlFor={"upload-image"}><a className='text-primary'><span>Upload images</span></a></label>
                            <a className="invisible">
                                <input id={"upload-image"} type="file" multiple onChange={onUpload} />
                            </a>
                        </div>
                        {files.length === 0 && <div>There is no file to display.</div>}
                        <div className="row row-cols-9">
                            {files.map((f) => <File file={f} select={onSelectFile} />)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
}

export default function Ckeditor(props) {
    const [fileBrowser, setFileBrowser] = React.useState(false);
    const [editor, setEditor] = React.useState(null);

    React.useEffect(function () {
        CKEDITOR.plugins.add('nodejscartimages', {
            icons: 'nodejscartimages',
            init: function (editor) {
                editor.addCommand('openFileBrowser', {
                    exec: function (editor) {
                        setFileBrowser(true);
                    }
                });

                editor.ui.addButton('nodejscartimages', {
                    label: 'nodejscart file browser',
                    command: 'openFileBrowser',
                    toolbar: 'editing'
                });
            }
        });
        setEditor(CKEDITOR.replace(props.name));
        CKEDITOR.instances[props.name].on('change', function () {
            CKEDITOR.instances[props.name].updateElement();
        });
    }, []);

    return <div className='ckeditor'>
        <TextArea {...props} />
        {fileBrowser === true && <FileBrowser {...props} editor={editor} setFileBrowser={setFileBrowser} />}
    </div>
}