/**
 * The staged file is not what was uploaded: a chunk is missing, or the size or
 * the SHA-256 differs from what was recorded at the end of the upload (J1). The
 * job fails and the admin uploads the file again.
 */
export class FileDamagedError extends Error {
  constructor(message = 'The uploaded file is damaged') {
    super(message);
    this.name = 'FileDamagedError';
  }
}
