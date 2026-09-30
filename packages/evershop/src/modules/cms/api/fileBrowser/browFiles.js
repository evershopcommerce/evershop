import { getBaseUrl } from '../../../../lib/util/getBaseUrl.js';
import { INVALID_PAYLOAD, OK } from '../../../../lib/util/httpStatus.js';
import { browFiles } from '../../services/browFiles.js';
import { InvalidCursorError } from '../../services/storage/cursor.js';

export default async (request, response, next) => {
  const path = request.params[0] || '';
  const { limit, cursor, prefix } = request.query;

  try {
    // Paging is on by default. The response carries `nextCursor` while more
    // entries remain; it is absent at the end of the listing. There is no
    // total and no page number — S3, Azure Blob and GCS all list in key order
    // with a continuation token and expose neither, so a count would mean
    // reading the whole folder, which is the cost pagination exists to avoid.
    const results = await browFiles(path, {
      // No `limit` in the query = use the configured page size
      // (`system.file_browser_page_size`), not a constant baked in here.
      ...(limit === undefined ? {} : { limit: Number(limit) }),
      ...(cursor ? { cursor: String(cursor) } : {}),
      ...(prefix ? { prefix: String(prefix) } : {})
    });
    response.status(OK);
    response.json({
      data: {
        ...results,
        // The store's base URL, so the client can resolve a relative file URL
        // into the full one it shows and copies.
        //
        // Only the LOCAL provider returns a relative URL (`/assets/…`, from
        // `buildUrl`); S3, Azure and GCS all return absolute ones already, so
        // for them this is unused. It is sent once per response rather than
        // resolved per file because the stored URL must stay relative — that
        // is what gets inserted into content, and it has to survive the store
        // changing domain.
        //
        // It cannot be resolved in the browser either: the admin may be
        // reached on a different origin from the storefront (a proxy, an IP,
        // a separate admin host), and `window.location.origin` would then
        // produce a URL that does not serve the file. `getBaseUrl()` is the
        // configured answer — EVERSHOP_HOME_URL, then `shop.homeUrl`.
        baseUrl: getBaseUrl()
      }
    });
  } catch (error) {
    // A cursor can outlive the provider that issued it — the storage backend
    // is switchable at runtime. Answer 400 so the browser restarts the listing
    // instead of retrying a page that can never be fetched.
    if (error instanceof InvalidCursorError) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: { status: INVALID_PAYLOAD, message: error.message }
      });
      return;
    }
    next(error);
  }
};
