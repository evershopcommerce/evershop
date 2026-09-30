import { INVALID_PAYLOAD, OK } from '../../../../lib/util/httpStatus.js';
import { browFiles } from '../../services/browFiles.js';
import { renameFile } from '../../services/renameFile.js';

export default async (request, response, next) => {
  const path = request.params[0] || '';
  const { name } = request.body || {};

  if (!path) {
    response.status(INVALID_PAYLOAD).json({
      error: { status: INVALID_PAYLOAD, message: 'No file was specified' }
    });
    return;
  }

  try {
    const newPath = await renameFile(path, String(name ?? ''));

    // Look the renamed file back up so the caller gets an authoritative URL.
    // Deriving one client-side would mean reimplementing each provider's key
    // -to-URL rule (bucket host, CDN base, percent-encoding); a prefix-filtered
    // listing is one request and comes from the code that already builds them.
    const slash = newPath.lastIndexOf('/');
    const folder = slash === -1 ? '' : newPath.slice(0, slash);
    const fileName = slash === -1 ? newPath : newPath.slice(slash + 1);
    let file = null;
    try {
      const page = await browFiles(folder, { limit: 1, prefix: fileName });
      file = page.files.find((f) => f.name === fileName) ?? null;
    } catch {
      // The rename already succeeded; failing the response over the lookup
      // would tell the caller it did not.
      file = null;
    }

    response.status(OK).json({ data: { path: newPath, file } });
  } catch (error) {
    // Every failure here is the caller's to fix — an invalid name, a name
    // already taken, a file that is gone — so they are 400s with the reason,
    // not 500s. Anything genuinely unexpected still reaches the error handler.
    if (error instanceof Error && error.message) {
      response.status(INVALID_PAYLOAD).json({
        error: { status: INVALID_PAYLOAD, message: error.message }
      });
      return;
    }
    next(error);
  }
};
