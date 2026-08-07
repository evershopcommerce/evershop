import concat from 'concat-stream';

function CustomMemoryStorage(opts) {
  this.getFilename = opts.filename;
}

CustomMemoryStorage.prototype._handleFile = function _handleFile(
  req,
  file,
  cb
) {
  const filename = this.getFilename(file.originalname);
  file.stream.pipe(
    concat({ encoding: 'buffer' }, (data) => {
      cb(null, {
        buffer: data,
        size: data.length,
        filename
      });
    })
  );
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
