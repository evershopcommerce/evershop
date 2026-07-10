import concat from 'concat-stream';

function CustomMemoryStorage(opts) {
  this.getFilename = opts.filename;
  // Optional (file) => MB. When provided, the file is rejected AS IT STREAMS
  // once it exceeds its limit — uploads buffer in memory, so waiting for the
  // full body before checking would defeat the guard.
  this.getFileSizeLimitMb = opts.fileSizeLimitMb;
}

CustomMemoryStorage.prototype._handleFile = function _handleFile(
  req,
  file,
  cb
) {
  const filename = this.getFilename(file.originalname);
  const limitMb = this.getFileSizeLimitMb
    ? this.getFileSizeLimitMb(file)
    : undefined;
  const limitBytes =
    limitMb !== undefined ? Math.round(limitMb * 1024 * 1024) : undefined;
  let received = 0;
  let aborted = false;

  const concatStream = concat({ encoding: 'buffer' }, (data) => {
    if (!aborted) {
      cb(null, {
        buffer: data,
        size: data.length,
        filename
      });
    }
  });

  if (limitBytes !== undefined) {
    file.stream.on('data', (chunk) => {
      received += chunk.length;
      if (received > limitBytes && !aborted) {
        aborted = true;
        file.stream.unpipe(concatStream);
        // Same code as multer's own limit error so callers handle both alike
        const error = new Error('File too large');
        error.code = 'LIMIT_FILE_SIZE';
        error.limitMb = limitMb;
        error.mimetype = file.mimetype;
        cb(error);
      }
    });
  }

  file.stream.pipe(concatStream);
};

CustomMemoryStorage.prototype._removeFile = function _removeFile(
  req,
  file,
  cb
) {
  delete file.buffer;
  cb(null);
};

export default function (opts) {
  return new CustomMemoryStorage(opts);
}
