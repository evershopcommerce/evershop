import { Button } from '@components/common/ui/Button.js';
import { Input } from '@components/common/ui/Input.js';
import { toast } from '@components/common/ui/Sonner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { matchesAccept } from '@evershop/evershop/lib/util/mimeMatch';
import {
  clipboardStamp,
  pastedFileName
} from '@evershop/evershop/lib/util/pastedFileName';
import { Check, Copy, X } from 'lucide-react';
import React from 'react';
import { createPortal } from 'react-dom';
import './FileBrowser.scss';
import { useQuery } from 'urql';

/**
 * How many just-uploaded files to keep in the panel. It is its own surface
 * now and scrolls, so this is about staying a record of "what I just added"
 * rather than becoming a second listing.
 */
const MAX_RECENT_UPLOADS = 9;

const GetApisQuery = `
  query Query ($filters: [FilterInput!]) {
    setting {
      uploadAllowedMimeTypesEffective
    }
    browserApi: url(routeId: "fileBrowser", params: [{key: "0", value: ""}])
    deleteApi: url(routeId: "fileDelete", params: [{key: "0", value: ""}])
    renameApi: url(routeId: "fileRename", params: [{key: "0", value: ""}])
    # "fileUpload", not "imageUpload". The two routes share a handler and the
    # same multer filter (the admin's allowed types); "imageUpload" adds one
    # extra middleware that rejects anything whose mimetype does not start
    # with "image", unconditionally. Posting here meant enabling PDF or video
    # in System Setting had no effect — the upload was refused by a rule that
    # never consulted the setting. "imageUpload" still exists and is still
    # correct for ImageUploader, which genuinely only wants images.
    uploadApi: url(routeId: "fileUpload", params: [{key: "0", value: ""}])
    folderCreateApi: url(routeId: "folderCreate")
  }
`;

export interface File {
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
}

/** 1.4 MB, 812 KB, 96 B. Absent size renders as nothing, never as "0 B". */
function formatBytes(bytes: number | undefined): string | undefined {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) {
    return undefined;
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/** The badge drawn instead of a thumbnail: "PDF", "DOCX", "ZIP". */
function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toUpperCase() : '?';
}

/**
 * A file name that becomes an input when clicked.
 *
 * Used by both the grid and the just-uploaded panel, so a rename works
 * wherever the name is visible. Clicking the NAME edits it and clicking the
 * PICTURE selects or uses the file — two targets, two meanings, no modal.
 */
const EditableName: React.FC<{
  name: string;
  className: string;
  onRename: (next: string) => Promise<void> | void;
}> = ({ name, className, onRename }) => {
  // The extension is split off and NOT put in the input.
  //
  // It is what every consumer uses to decide what the file is — the grid picks
  // a thumbnail from it, the media type is derived from it, the storefront
  // serves by it. An editable extension lets a rename silently retype or
  // untype the file; shown as a fixed suffix, there is nothing to get wrong.
  // The API refuses a changed extension as well, because it is reachable on
  // its own.
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : '';

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(stem);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // A rename elsewhere, or a different file taking this slot, must not leave
  // a stale draft behind.
  React.useEffect(() => {
    setDraft(stem);
    setEditing(false);
  }, [name, stem]);

  React.useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = async () => {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== stem) {
      // Send the whole name; the service would re-attach the extension anyway,
      // but sending a partial name would make the API's contract depend on who
      // is calling it.
      await onRename(`${next}${extension}`);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        className={`${className} file-browser__name-button`}
        title={_('${name} — click to rename', { name })}
        onClick={(e) => {
          e.stopPropagation();
          setDraft(stem);
          setEditing(true);
        }}
      >
        {name}
      </button>
    );
  }

  return (
    <div className="file-browser__rename">
      <input
        ref={inputRef}
        className="file-browser__rename-input"
        value={draft}
        aria-label={_('New file name, without the extension')}
        onChange={(e) => setDraft(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          // Enter and Escape, because a text field that ignores them feels
          // broken however many buttons sit beside it.
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(stem);
            setEditing(false);
          }
        }}
      />
      {extension && (
        <span className="file-browser__rename-ext" aria-hidden="true">
          {extension}
        </span>
      )}
      <button
        type="button"
        className="file-browser__rename-ok"
        title={_('Save')}
        aria-label={_('Save the new name')}
        onClick={(e) => {
          e.stopPropagation();
          commit();
        }}
      >
        <Check aria-hidden="true" />
      </button>
      <button
        type="button"
        className="file-browser__rename-cancel"
        title={_('Cancel')}
        aria-label={_('Cancel renaming')}
        onClick={(e) => {
          e.stopPropagation();
          setDraft(stem);
          setEditing(false);
        }}
      >
        <X aria-hidden="true" />
      </button>
    </div>
  );
};

const File: React.FC<{
  file: File;
  /** True when this file's details panel is open, so the panel's subject is
   *  obvious when the grid runs long. */
  active: boolean;
  /**
   * False when this type cannot be INSERTED by the caller — drawn dimmed. It
   * can still be opened: the details panel is also where a file is deleted,
   * and an image picker must not make a stray PDF unremovable.
   */
  insertable?: boolean;
  openInfo: (file: File) => void;
  rename: (file: File, newName: string) => Promise<void> | void;
}> = ({ file, active, insertable = true, openInfo, rename }) => {
  const className = [active ? 'active' : '', insertable ? '' : 'not-insertable']
    .filter(Boolean)
    .join(' ');
  // A file can be an image by extension and still fail to load — truncated
  // upload, a `.png` that is not one. Fall back to the badge rather than
  // leaving a broken image in the grid.
  const [previewFailed, setPreviewFailed] = React.useState(false);
  const showPreview =
    !previewFailed && (file.mimeType ?? '').startsWith('image/');

  return (
    <div className={`col image-item ${className}`}>
      <div className="inner">
        {/* A button, not a link. This opens a panel beside the grid; it does
            not navigate, and the old `<a href="#">` both announced itself as
            a link and needed its default suppressed on every click. */}
        <button
          type="button"
          className="image-item__open"
          aria-label={_('Show details for ${name}', { name: file.name })}
          aria-expanded={active}
          onClick={() => openInfo(file)}
        >
          {showPreview ? (
            <img src={file.url} alt="" onError={() => setPreviewFailed(true)} />
          ) : (
            <div
              className="image-item__badge"
              aria-label={file.mimeType || _('File')}
            >
              {extensionOf(file.name)}
            </div>
          )}
        </button>
      </div>
      {/* The name, with its extension — the thing you are actually looking
          for when scanning a folder, and the way to rename it. */}
      <EditableName
        name={file.name}
        className="image-item__name"
        onRename={(next) => rename(file, next)}
      />
    </div>
  );
};

/**
 * Details for one file, sliding in beside the grid.
 *
 * This replaces a card that was revealed on hover and drawn INSIDE the
 * thumbnail. Once the cells were made smaller there was no room in them for a
 * name, a type, a size, a pixel count and a full URL, so the card covered the
 * picture it was describing and still truncated. Out of the cell the same
 * information is legible at any grid density, and it becomes the natural home
 * for the actions that act on one file.
 *
 * Mount it with a `key` of the file name. Each file then gets a fresh
 * instance, so a measured pixel size or a copied-URL flash cannot carry over
 * from the file looked at before.
 */
const FileInfoPanel: React.FC<{
  file: File;
  baseUrl?: string;
  /** Whether the caller can accept this type — wording only, see below. */
  insertable: boolean;
  /** Absent when the browser was opened to manage files rather than pick one;
   *  the insert action is then not offered at all. */
  onInsert?: (file: File) => void;
  onDelete: (file: File) => void;
  onClose: () => void;
}> = ({ file, baseUrl, insertable, onInsert, onDelete, onClose }) => {
  // Measured from the rendered preview, never from the server: no listing API
  // on any storage provider reports dimensions, and reading each file's header
  // would be one request per image. The browser has to fetch the picture to
  // draw it here anyway, so the numbers are free.
  const [dimensions, setDimensions] = React.useState<string>('');
  const [previewFailed, setPreviewFailed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const panelRef = React.useRef<HTMLElement>(null);
  const showPreview =
    !previewFailed && (file.mimeType ?? '').startsWith('image/');
  const size = formatBytes(file.size);

  // The stored URL stays as the provider gave it — relative for local disk
  // (`/assets/...`), absolute for S3/Azure/GCS — because that is what gets
  // inserted into content, and a relative path has to stay relative to survive
  // the store changing domain. Only the DISPLAYED and COPIED value is
  // resolved, which is what is useful outside this screen.
  //
  // Resolved against the STORE's base URL, which the API sends, not against
  // `window.location.origin`: the admin can be reached on a different origin
  // from the storefront — behind a proxy, by IP, or on a separate admin host —
  // and the origin would then produce a URL that does not serve the file. The
  // origin is only the fallback for a response without the field.
  const absoluteUrl = React.useMemo(() => {
    try {
      return new URL(file.url, baseUrl || window.location.origin).href;
    } catch {
      return file.url;
    }
  }, [file.url, baseUrl]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access needs a secure context and can be refused outright.
      // The URL is still on screen to select by hand, so a failure here is not
      // worth an error banner.
      setCopied(false);
    }
  };

  // Escape closes the panel rather than the whole browser: the panel is the
  // innermost thing open, and dismissing the browser out from under someone
  // who meant to close a side panel loses their place in the folder.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  // Clicking away closes it, so the X is a convenience rather than the only
  // way out.
  //
  // A thumbnail is the one exception. Without it, moving from one file to the
  // next would cost two clicks — one to dismiss, one to open — and which of
  // the two handlers ran first would decide whether the second click even
  // landed. Skipping the grid entirely leaves the tile's own handler to swap
  // the subject, and makes the behaviour independent of listener order.
  //
  // `mousedown`, not `click`: it matches how every other dismissable layer
  // feels, and it cannot be lost to the target being re-rendered away between
  // press and release.
  React.useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (target.closest?.('.image-item')) return;
      onClose();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [onClose]);

  return (
    <aside
      ref={panelRef}
      className="file-browser__info"
      aria-label={_('File details')}
    >
      <div className="file-browser__info-head">
        <span className="file-browser__info-title">{_('Details')}</span>
        <button
          type="button"
          className="file-browser__info-close"
          title={_('Close')}
          aria-label={_('Close details')}
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </div>

      <div className="file-browser__info-body">
        <div className="file-browser__info-preview">
          {showPreview ? (
            <img
              src={file.url}
              alt=""
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setDimensions(`${img.naturalWidth} × ${img.naturalHeight}`);
                }
              }}
              onError={() => setPreviewFailed(true)}
            />
          ) : (
            <div
              className="image-item__badge"
              aria-label={file.mimeType || _('File')}
            >
              {extensionOf(file.name)}
            </div>
          )}
        </div>

        <div className="file-browser__info-name">{file.name}</div>

        <dl className="file-browser__info-meta">
          <div className="file-browser__info-meta-row">
            <dt>{_('Type')}</dt>
            <dd>
              {/* The EXTENSION, not the media type. A modern Office mime
                  string is seventy characters
                  ("application/vnd.openxmlformats-…"); the full value stays on
                  the tooltip. */}
              <span className="image-item__chip" title={file.mimeType}>
                {extensionOf(file.name)}
              </span>
            </dd>
          </div>
          {size && (
            <div className="file-browser__info-meta-row">
              <dt>{_('Size')}</dt>
              <dd>{size}</dd>
            </div>
          )}
          {dimensions && (
            <div className="file-browser__info-meta-row">
              <dt>{_('Dimensions')}</dt>
              <dd>{dimensions} px</dd>
            </div>
          )}
        </dl>

        <div className="file-browser__info-url-label">{_('URL')}</div>
        <div className="file-browser__info-url-row">
          <span className="file-browser__info-url" title={absoluteUrl}>
            {absoluteUrl}
          </span>
          <button
            type="button"
            className="file-browser__info-copy"
            title={copied ? _('Copied') : _('Copy URL')}
            // The file NAME, not the URL: a screen reader would otherwise read
            // out the whole address character by character, and the name is
            // what identifies which file this copies.
            aria-label={
              copied
                ? _('URL copied')
                : _('Copy URL for ${name}', { name: file.name })
            }
            onClick={copyUrl}
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="file-browser__info-actions">
        {/* Deliberately NOT disabled for a type the caller cannot take. The
            press is what produces the explanation, and a dead button with no
            stated reason is worse than a clear refusal — the same reasoning
            the toolbar button carried before this panel replaced it. */}
        {onInsert && (
          <Button
            variant="default"
            title={
              insertable
                ? _('Use ${name}', { name: file.name })
                : _('${name} cannot be used here', { name: file.name })
            }
            onClick={() => onInsert(file)}
          >
            {_('Insert')}
          </Button>
        )}
        <Button
          variant="destructive"
          title={_('Delete ${name}', { name: file.name })}
          onClick={() => onDelete(file)}
        >
          {_('Delete')}
        </Button>
      </div>
    </aside>
  );
};

/**
 * Placeholder tiles shown while a folder is being fetched.
 *
 * A spinner says "something is happening"; this says what is coming and where
 * it will be. Because the tiles are the same shape as real ones, the grid does
 * not jump when they are replaced — the layout is already correct before the
 * data arrives, which a centred spinner cannot manage.
 */
const FileGridSkeleton: React.FC<{ count?: number }> = ({ count = 18 }) => (
  <div className="file-browser__grid" aria-hidden="true">
    {Array.from({ length: count }, (_unused, index) => (
      <div className="file-browser__skeleton" key={index}>
        <div className="file-browser__skeleton-well" />
        <div className="file-browser__skeleton-name" />
      </div>
    ))}
  </div>
);

/**
 * Placeholder rows for the folder list.
 *
 * Same purpose as the grid's: hold the shape so the sidebar does not appear
 * from nothing. Each row matches a real one — a 2rem icon square and a name
 * beside it — and the names vary in width, because a column of identical bars
 * reads as a pattern rather than as a list.
 */
const FolderListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <ul className="mt-4 mb-4 file-browser__folders" aria-hidden="true">
    {Array.from({ length: count }, (_unused, index) => (
      <li className="file-browser__folder-skeleton" key={index}>
        <span className="file-browser__folder-skeleton-icon" />
        <span
          className="file-browser__folder-skeleton-name"
          style={{ width: `${55 + ((index * 13) % 35)}%` }}
        />
      </li>
    ))}
  </ul>
);

const FileBrowser: React.FC<{
  /**
   * Called with the chosen file's URL.
   *
   * Optional: a media-library page opens this browser to MANAGE files, not to
   * put one anywhere. Without a handler the Insert button is not rendered at
   * all — a button that cannot do anything is worse than its absence — and the
   * just-uploaded thumbnails stop being "use this file" targets.
   */
  onInsert?: (url: string) => void;
  isMultiple: boolean;
  /**
   * Optional for the same reason: a page has nothing to close back to, so the
   * dismiss control is not drawn.
   */
  close?: () => void;
  /**
   * The media types this caller can SELECT — exact types or family wildcards
   * (`['image/*']`). Omit to allow inserting anything.
   *
   * Selection only. It does NOT restrict what can be UPLOADED: uploading adds
   * to the shared media library, and what may go in there is the store's
   * decision (System Setting -> File Uploads), not the open picker's. A banner
   * picker asking for images is saying what it can insert, not what the
   * library may hold.
   */
  accept?: string[];
}> = ({ onInsert, close, accept }) => {
  // Portals need a document, and this component is rendered from places that
  // may render on the server. Mount first, portal after.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [error, setError] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);
  const [folders, setFolders] = React.useState<string[]>([]);
  const [files, setFiles] = React.useState<File[]>([]);
  // Absent once the listing is exhausted. There is deliberately no page number
  // or total: S3, Azure and GCS list by continuation token and expose neither.
  const [nextCursor, setNextCursor] = React.useState<string | undefined>();
  const [loadingMore, setLoadingMore] = React.useState<boolean>(false);
  // `search` is what the user is typing; `appliedSearch` is what the server
  // was last asked for. Keeping them apart is what stops every keystroke from
  // becoming a request.
  const [baseUrl, setBaseUrl] = React.useState<string | undefined>();
  /**
   * Files uploaded during this visit, newest first.
   *
   * They are kept here rather than hunted down in the grid because the grid
   * cannot be made to jump to them: pages are name-ordered and the cursor is
   * an opaque provider token on S3, Azure and GCS, so there is no way to ask
   * for "the page containing this name". A freshly uploaded file can land on
   * any page, and after an upload the listing resets to the first one.
   */
  const [recentUploads, setRecentUploads] = React.useState<File[]>([]);
  /**
   * Dismissed by the close button and re-opened by the next upload: someone
   * who closes it has finished with those files, but a fresh paste is a new
   * event and hiding it would look like the upload did nothing.
   */
  const [recentDismissed, setRecentDismissed] = React.useState(false);
  const [search, setSearch] = React.useState<string>('');
  const [appliedSearch, setAppliedSearch] = React.useState<string>('');
  const [currentPath, setCurrentPath] = React.useState<
    {
      name: string;
      index: number;
    }[]
  >([{ name: '', index: 0 }]);
  const newFolderRefInput = React.useRef<HTMLInputElement>(null);
  const browserApiRef = React.useRef<string>('');
  const deleteApiRef = React.useRef<string>('');
  const renameApiRef = React.useRef<string>('');
  const uploadApiRef = React.useRef<string>('');
  const folderCreateApiRef = React.useRef<string>('');

  const [result] = useQuery({
    query: GetApisQuery
  });
  const { data, fetching, error: err } = result;

  // What the store allows to be uploaded. Deliberately NOT narrowed by the
  // caller's `accept`: uploading adds to the shared media library, which every
  // picker draws from. A banner picker asking for images is describing what IT
  // can insert, not restricting what the library may hold — narrowing upload
  // to the open picker's type would stop an admin adding a PDF to the library
  // merely because they happened to open the browser from a banner.
  const allowedMimeTypes: string[] = React.useMemo(
    () => data?.setting?.uploadAllowedMimeTypesEffective ?? [],
    [data]
  );

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

  const closeFileBrowser = (e) => {
    e.preventDefault();
    close?.();
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

  const deleteFile = (file: File) => {
    // Close the panel BEFORE the request, not in its success handler.
    //
    // `setLoading(true)` below already swaps the grid for its skeleton, so the
    // delete is visibly in flight. Keeping the panel up until the round trip
    // finished added a second wait on top of that with no feedback of its own,
    // and spent it describing a file that is on its way out.
    //
    // A failure is still reported: `setError` surfaces it in the browser's own
    // banner, and the file stays in the listing, which is refreshed only on
    // success.
    setInfoFile(null);
    const path = currentPath.map((f) => f.name);
    path.push(file.name);
    setLoading(true);
    fetch(deleteApiRef.current + path.join('/'), {
      method: 'DELETE'
    })
      .then((res) => res.json())
      .then((response) => {
        if (!response.error) {
          // The panel closed on the press, and the grid comes back without the
          // file — but a tile quietly missing from a folder of thumbnails is
          // easy to miss, and "did that work?" is the question a destructive
          // action has to answer. The failure path keeps the persistent banner
          // instead: an error should not time out before it is read.
          toast.success(_('${name} deleted', { name: file.name }));
          setCurrentPath(currentPath.map((f) => f));
        } else {
          setError(response.error.message);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  /**
   * Rename one file. Returns once the listing has been asked to refresh, so
   * the caller can await it and keep its own view in step.
   */
  const renameFile = React.useCallback(
    async (file: File, newName: string) => {
      const path = currentPath.map((f) => f.name);
      const target = [...path, file.name].filter(Boolean).join('/');
      setLoading(true);
      try {
        const res = await fetch(renameApiRef.current + target, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName })
        });
        const body = await res.json();
        if (body.error) {
          setError(body.error.message);
          return;
        }
        setError('');
        // The panel keeps its own copies, so update them from the response
        // rather than leaving a thumbnail pointing at a name that is gone.
        if (body.data?.file) {
          setRecentUploads((prev) =>
            prev.map((f) => (f.name === file.name ? body.data.file : f))
          );
        } else {
          setRecentUploads((prev) => prev.filter((f) => f.name !== file.name));
        }
        // A new name sorts somewhere else, so the page has to come back from
        // the start rather than being patched in place.
        setCurrentPath((prev) => prev.map((f) => f));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [currentPath]
  );

  // The file whose details panel is open. Clicking a thumbnail opens this
  // rather than selecting — there is no selection any more, because every
  // action that needed one now lives in the panel and acts on its own subject.
  const [infoFile, setInfoFile] = React.useState<File | null>(null);

  // Keep the panel pointing at the listing's own object. A refresh replaces
  // `files`, and a file that is no longer there — deleted, renamed, or in a
  // folder we have navigated away from — closes the panel instead of leaving
  // details for something that is gone. The functional form keeps `infoFile`
  // out of the dependency list, so this cannot re-run itself.
  React.useEffect(() => {
    setInfoFile((prev) =>
      prev ? (files.find((f) => f.name === prev.name) ?? null) : prev
    );
  }, [files]);

  // Showing the skeleton INSTEAD of the grid: the APIs are still resolving, or
  // a folder's first page is in flight. Not `loadingMore`, which appends to
  // what is already on screen and must not blank it.
  const busy = fetching || loading;

  const insertFile = (file: File) => {
    // Backstop: a file opened before the caller's
    // requirements were known, or a file replaced under the same name, must
    // not reach a caller that cannot render it.
    if (!matchesAccept(file.mimeType, accept)) {
      setError(
        _('${name} cannot be used here. Allowed types: ${types}', {
          name: file.name,
          types: (accept || []).join(', ')
        })
      );
      return;
    }
    onInsert?.(file.url);
  };

  /**
   * Upload a set of files. Shared by the Upload button and by paste, so both
   * get the same validation, the same error wording and the same refresh.
   */
  const uploadFiles = React.useCallback(
    (picked: globalThis.File[]) => {
      if (picked.length === 0) {
        return;
      }
      // Checked here as well as on the server. `accept` on the input is only a
      // filter in the file dialog — paste and drag-and-drop walk straight past
      // it — and the server's refusal is one generic sentence for the whole
      // request. This names the file and the reason before anything is sent.
      const rejected = picked.filter(
        (f) => !matchesAccept(f.type || undefined, allowedMimeTypes)
      );
      if (rejected.length > 0) {
        setError(
          _('Cannot upload ${files}: allowed types are ${types}', {
            files: rejected.map((f) => f.name).join(', '),
            types: allowedMimeTypes.join(', ')
          })
        );
        return;
      }
      setError('');

      const formData = new FormData();
      picked.forEach((f) => formData.append('images', f));
      const path = currentPath.map((f) => f.name);

      setLoading(true);
      fetch(uploadApiRef.current + path.join('/'), {
        method: 'POST',
        body: formData
      })
        .then((res) => res.json())
        .then((response) => {
          if (!response.error) {
            // The upload response already carries name, url, mimetype and
            // size for every file — no extra request to show them.
            const uploaded: File[] = (response.data?.files || []).map(
              (f: {
                name: string;
                url: string;
                mimetype?: string;
                size?: number;
              }) => ({
                name: f.name,
                url: f.url,
                mimeType: f.mimetype,
                size: f.size
              })
            );
            setRecentDismissed(false);
            setRecentUploads((prev) =>
              [
                ...uploaded,
                ...prev.filter((p) => !uploaded.some((u) => u.name === p.name))
              ].slice(0, MAX_RECENT_UPLOADS)
            );
            setCurrentPath(currentPath.map((f) => f));
          } else {
            setError(response.error.message);
          }
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    },
    [allowedMimeTypes, currentPath]
  );

  /**
   * Paste-to-upload: copy an image anywhere — a web page, a screenshot tool,
   * a file manager — and paste it straight into the current folder.
   *
   * Only fires when the clipboard actually carries FILES. A plain text paste
   * falls through untouched, so typing in the search box or the new-folder
   * field still works normally; there is no need to special-case the focused
   * element, which would be guesswork.
   *
   * Note this handles pasted image DATA, not a copied image ADDRESS. "Copy
   * image address" puts a URL on the clipboard, and fetching it from the
   * browser is blocked by CORS for most sites while fetching it on the server
   * would be a request-forgery hole. "Copy image" is the gesture that works.
   */
  const onPaste = React.useCallback(
    (event: ClipboardEvent) => {
      const items = event.clipboardData?.files;
      if (!items || items.length === 0) {
        return;
      }
      event.preventDefault();

      // Copying an image out of a web page puts the pixels on the clipboard
      // with no name — but usually the `<img>` markup too, and the src in it
      // carries the name the site gave the file. Worth far more to whoever
      // looks for it later than a timestamp.
      const html = event.clipboardData?.getData('text/html') || '';
      const srcMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      const uri = event.clipboardData?.getData('text/uri-list') || '';
      const sourceUrl = srcMatch?.[1] || uri.split(/\s+/)[0] || undefined;

      const stamp = clipboardStamp();
      const many = items.length > 1;
      const pasted = Array.from(items).map((file, index) => {
        const name = pastedFileName(
          file.name,
          file.type,
          stamp,
          many ? index : undefined,
          sourceUrl
        );
        return name === file.name
          ? file
          : new globalThis.File([file], name, { type: file.type });
      });

      uploadFiles(pasted);
    },
    [uploadFiles]
  );

  React.useEffect(() => {
    // On the document, not the overlay: the overlay is not focused when it
    // opens, and a paste goes to the focused element. The browser covers the
    // screen while it is open, so there is nothing else to steal it from.
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [onPaste]);

  const onUpload = (e) => {
    e.persist();
    uploadFiles(Array.from(e.target.files as FileList));
    // Clear the input so re-picking the same file fires `change` again.
    e.target.value = '';
  };

  // One page of the current folder. `cursor` absent = the first page, which
  // replaces what is on screen; a cursor appends, so the files already
  // scanned stay visible and a selection made earlier survives.
  const fetchPage = React.useCallback(
    (cursor?: string) => {
      if (!browserApiRef.current) {
        return;
      }

      const path = currentPath.map((f) => f.name);
      const query = new URLSearchParams();
      if (cursor) {
        query.set('cursor', cursor);
      }
      if (appliedSearch) {
        query.set('prefix', appliedSearch);
      }
      const qs = query.toString();
      if (cursor) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      fetch(`${browserApiRef.current}${path.join('/')}${qs ? `?${qs}` : ''}`, {
        method: 'GET'
      })
        .then((res) => res.json())
        .then((response) => {
          if (!response.error) {
            if (cursor) {
              // Only files append. Folders came complete with the first page
              // — they are navigation, and a sidebar that fills in as you
              // press "Load more" cannot be navigated.
              //
              // De-duplicate by name: a file uploaded into a part of the
              // folder already scanned can otherwise arrive twice, and two
              // React children with the same key is a rendering bug.
              setFiles((prev) => [
                ...prev,
                ...response.data.files.filter(
                  (f: File) => !prev.some((p) => p.name === f.name)
                )
              ]);
            } else {
              setFolders(response.data.folders);
              setFiles(response.data.files);
            }
            setNextCursor(response.data.nextCursor);
            setBaseUrl(response.data.baseUrl);
          } else {
            // A cursor issued by a storage provider that is no longer active
            // comes back 400. Drop it and show the folder from the top rather
            // than leaving the user on a page that can never load.
            setNextCursor(undefined);
            setError(response.error.message);
          }
        })
        .catch((e) => setError(e.message))
        .finally(() => {
          setLoading(false);
          setLoadingMore(false);
        });
    },
    [currentPath, appliedSearch]
  );

  // Kept so the existing callers (upload, delete, create folder) still read
  // naturally: they all want the folder shown from the top again.
  const fetchFilesAndFolders = React.useCallback(() => {
    setNextCursor(undefined);
    fetchPage();
  }, [fetchPage]);

  if (data) {
    browserApiRef.current = data.browserApi;
    deleteApiRef.current = data.deleteApi;
    renameApiRef.current = data.renameApi;
    uploadApiRef.current = data.uploadApi;
    folderCreateApiRef.current = data.folderCreateApi;
  }

  // Fetch files and folders when APIs are ready
  React.useEffect(() => {
    if (data) {
      fetchFilesAndFolders();
    }
  }, [currentPath, appliedSearch, fetchFilesAndFolders, data]);

  // The strip belongs to the folder it was filled in: a file uploaded into
  // `catalog` is not a useful shortcut while browsing `banners`, and its
  // thumbnail there would suggest it lives in the folder on screen.
  const folderKey = currentPath.map((f) => f.name).join('/');
  React.useEffect(() => {
    setRecentUploads([]);
  }, [folderKey]);

  if (err) {
    return (
      <p className="text-destructive">
        {_('There was an error fetching file browser APIs.')}
        {err.message}
      </p>
    );
  }

  /*
   * Rendered into <body>, not where it is mounted.
   *
   * This is a full-screen overlay, and its z-index only means anything within
   * its own stacking context. Opened from the CMS menu it sits inside
   * `.admin-navigation`, which is `position: fixed` — and a fixed element
   * creates a stacking context, at `z-index: auto` here. So the whole overlay
   * was confined to a layer sitting BELOW the header's `z-index: 1000`, and
   * the header painted over it. No z-index on the overlay could have fixed
   * that; it had to leave the subtree. Leaving it also means the overlay is
   * now a SIBLING of what it covers rather than nested inside it, which is why
   * its z-index sits at the modal tier — see the stylesheet.
   *
   * Doing it here rather than at the one call site that hit the problem,
   * because it is a property of what this component IS: a thing that covers
   * the screen must not be subject to where it happens to be mounted.
   */
  const overlay = (
    /*
     * `data-slot` marks this as a portalled popup layer for outside-click
     * handlers to skip. The page builder's settings drawer closes itself on any
     * mousedown it does not contain (`Editor.tsx`), and because this overlay
     * portals to <body> it is never contained — so without the marker the first
     * click on a thumbnail closed the drawer that opened the browser, taking
     * the browser down with it. The drawer already skips
     * `alert-dialog-content` and `dialog-content` for the same reason.
     */
    <div className="file-browser" data-slot="file-browser">
      {recentUploads.length > 0 && !recentDismissed && (
        /* A panel pinned to the bottom-left rather than a row in the toolbar:
           it holds the files just added, which is a temporary concern, and
           anchoring it out of the way lets the thumbnails be big enough to
           recognise. Fixed, so it stays put while the grid scrolls. */
        <div
          className="file-browser__recent"
          role="region"
          aria-label={_('Just uploaded')}
        >
          <div className="file-browser__recent-head">
            <span className="file-browser__recent-label">
              {_('Just uploaded')}
            </span>
            <button
              type="button"
              className="file-browser__recent-close"
              title={_('Dismiss')}
              aria-label={_('Dismiss just-uploaded files')}
              onClick={() => setRecentDismissed(true)}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="file-browser__recent-items">
            {recentUploads.map((f) => {
              const usable = matchesAccept(f.mimeType, accept);
              return (
                <div className="file-browser__recent-entry" key={f.name}>
                  <button
                    type="button"
                    className="file-browser__recent-item"
                    // Without an insert target the thumbnail has nothing to
                    // do; it stays visible as a record of the upload.
                    disabled={!usable || !onInsert}
                    title={
                      usable
                        ? _('Use ${name}', { name: f.name })
                        : _('${name} cannot be used here', { name: f.name })
                    }
                    aria-label={
                      usable
                        ? _('Use ${name}', { name: f.name })
                        : _('${name} cannot be used here', { name: f.name })
                    }
                    onClick={() => onInsert?.(f.url)}
                  >
                    {(f.mimeType ?? '').startsWith('image/') ? (
                      <img src={f.url} alt="" />
                    ) : (
                      <span>{extensionOf(f.name)}</span>
                    )}
                  </button>
                  <EditableName
                    name={f.name}
                    className="file-browser__recent-name"
                    onRename={(next) => renameFile(f, next)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="content">
        {/* Search, the actions and close share the top band. Close used to
            own a full-width row by itself, which cost ~32px of grid height
            for one small link. */}
        <div className="file-browser__header">
          <div className="file-browser__toolbar">
            <div className="file-browser__search">
              <Input
                type="search"
                value={search}
                placeholder={_('File name starts with…')}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setAppliedSearch(search.trim());
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => setAppliedSearch(search.trim())}
              >
                {_('Search')}
              </Button>
              {appliedSearch && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearch('');
                    setAppliedSearch('');
                  }}
                >
                  {_('Clear')}
                </Button>
              )}
            </div>
            <div className="file-browser__actions">
              <Button
                variant="outline"
                // A feature nobody is told about is a feature nobody uses;
                // the tooltip is where someone looks when wondering whether
                // they have to download the image first.
                title={_('Upload a file, or paste an image from the clipboard')}
                onClick={() => {
                  (
                    document.getElementById('upload-image') as HTMLInputElement
                  ).click();
                }}
              >
                {_('Upload')}
              </Button>
              {/* Delete and Insert used to sit here, driven by whichever
                  thumbnail was selected. Both now live in the details panel,
                  which opens on the file they act on — so the action is beside
                  its subject instead of across the screen from it, and neither
                  needs a selection to exist. */}
              <label
                className="hidden"
                id="upload-image-label"
                htmlFor="upload-image"
              >
                <input
                  id="upload-image"
                  type="file"
                  multiple
                  onChange={onUpload}
                />
              </label>
            </div>
          </div>
          {close && (
            <div className="file-browser__close">
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
          )}
        </div>
        {error && <div className="error text-destructive mb-2">{error}</div>}
        <div className="file-browser__panes">
          <div className="file-browser__row">
            <div className="file-browser__sidebar">
              <div className="current-path mb-4">
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
              {busy ? (
                <FolderListSkeleton />
              ) : (
                <ul className="mt-4 mb-4 file-browser__folders">
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
              )}
              <div className="justify-start items-center gap-2 flex file-browser__new-folder">
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
            <div className="file-browser__main">
              <div className="file-browser__files">
                {files.length === 0 && !busy && (
                  <div className="file-browser__empty">
                    <div>{_('There is no file to display.')}</div>
                    <div className="file-browser__empty-hint">
                      {_(
                        'Upload a file, or paste an image copied from anywhere.'
                      )}
                    </div>
                  </div>
                )}
                {busy ? (
                  <FileGridSkeleton />
                ) : (
                  <div className="file-browser__grid">
                    {files.map((f) => (
                      <File
                        file={f}
                        active={infoFile?.name === f.name}
                        insertable={matchesAccept(f.mimeType, accept)}
                        openInfo={setInfoFile}
                        rename={renameFile}
                        key={f.name}
                      />
                    ))}
                  </div>
                )}
                {loadingMore && <FileGridSkeleton count={6} />}
                {nextCursor && (
                  <div className="flex justify-center mt-5">
                    <Button
                      variant="outline"
                      disabled={loadingMore}
                      onClick={() => fetchPage(nextCursor)}
                    >
                      {loadingMore ? _('Loading…') : _('Load more')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Keyed by name so each file gets a fresh panel: the measured pixel
          size and the copied-URL flash belong to one file and must not be
          inherited by the next one opened. */}
      {infoFile && (
        <FileInfoPanel
          key={infoFile.name}
          file={infoFile}
          baseUrl={baseUrl}
          insertable={matchesAccept(infoFile.mimeType, accept)}
          onInsert={onInsert ? insertFile : undefined}
          onDelete={deleteFile}
          onClose={() => setInfoFile(null)}
        />
      )}
    </div>
  );

  return mounted ? createPortal(overlay, document.body) : overlay;
};

export { FileBrowser };
