/**
 * Shared limits for finishing a folder enumeration on the first page.
 *
 * Folders are navigation and must arrive complete (see `ListResult.folders`),
 * but an object store returns sub-folders interleaved with files in one
 * key-ordered response — you cannot ask for only the folders. So the first
 * page keeps scanning after it has its files, collecting the remaining
 * sub-folder names and discarding everything else.
 *
 * This is cheap in the normal case. A delimiter collapses each sub-tree into a
 * single entry, so a folder holding 5,000 objects costs one entry, not 5,000 —
 * the scan only continues when more than one page of files sits DIRECTLY in
 * the directory being listed.
 *
 * It is bounded anyway. A directory with tens of thousands of files directly
 * in it would otherwise reintroduce the unbounded listing this pagination
 * exists to remove, so the scan stops after `MAX_FOLDER_SCAN_REQUESTS` and
 * says so. Folders past that point are not shown; the alternative is an open
 * -ended stall when the browser is opened.
 */
export const MAX_FOLDER_SCAN_REQUESTS = 10;

/** Entries per scan request — the maximum every provider accepts. */
export const FOLDER_SCAN_PAGE_SIZE = 1000;
