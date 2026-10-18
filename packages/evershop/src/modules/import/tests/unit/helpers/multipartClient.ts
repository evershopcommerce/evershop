import http from 'http';

/** A multipart/form-data body and the client that sends it, for the tests of the upload. */
export type Part = {
  name: string;
  value?: string;
  filename?: string;
  content?: Buffer;
};

export function multipart(parts: Part[], boundary = 'BOUNDARY'): Buffer {
  const out: Buffer[] = [];
  for (const part of parts) {
    out.push(Buffer.from(`--${boundary}\r\n`));
    if (part.filename !== undefined) {
      out.push(
        Buffer.from(
          `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\nContent-Type: text/csv\r\n\r\n`
        ),
        part.content ?? Buffer.alloc(0),
        Buffer.from('\r\n')
      );
    } else {
      out.push(
        Buffer.from(
          `Content-Disposition: form-data; name="${part.name}"\r\n\r\n${part.value}\r\n`
        )
      );
    }
  }
  out.push(Buffer.from(`--${boundary}--\r\n`));
  return Buffer.concat(out);
}

export function postTo(
  port: number,
  body: Buffer,
  contentType = 'multipart/form-data; boundary=BOUNDARY',
  writeSize = 65_536
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: '127.0.0.1',
        port,
        method: 'POST',
        path: '/',
        headers: { 'Content-Type': contentType }
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            body: JSON.parse(Buffer.concat(chunks).toString('utf8'))
          })
        );
      }
    );
    request.on('error', reject);
    // The body goes out in pieces, as a browser sends it.
    (async () => {
      for (let at = 0; at < body.length; at += writeSize) {
        if (!request.write(body.subarray(at, at + writeSize))) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((drained) => {
            request.once('drain', drained);
          });
        }
      }
      request.end();
    })().catch(reject);
  });
}
