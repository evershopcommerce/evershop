import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { resolveAlias } from '../../resolveAlias.js';

// Get the directory name for this file
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);

describe('resolveAlias', () => {
  it('It should get the components and css file with correct priority', () => {
    const resolves = resolveAlias(
      [
        {
          path: path.resolve(currentDirPath, 'extensions/extensionA'),
          priority: 1
        },
        {
          path: path.resolve(currentDirPath, 'extensions/extensionB'),
          priority: 2
        }
      ],
      path.resolve(currentDirPath, 'theme')
    );
    expect(resolves[path.join('@components', 'a', 'A')])
      .toString()
      .includes('theme');

    expect(resolves[path.join('@components', 'a', 'a')])
      .toString()
      .includes('theme');

    expect(resolves[path.join('@components', 'b', 'bb')])
      .toString()
      .includes('theme');

    expect(resolves[path.join('@components', 'b', 'bb', 'BB')])
      .toString()
      .includes('theme');

    expect(resolves[path.join('@components', 'd', 'D')])
      .toString()
      .includes('extensionA');

    expect(resolves[path.join('@components', 'd', 'dd', 'DD')])
      .toString()
      .includes('extensionA');

    expect(resolves[path.join('@components', 'e', 'E')])
      .toString()
      .includes('extensionB');

    expect(resolves[path.join('@components', 'e', 'ee', 'EE')])
      .toString()
      .includes('extensionB');
  });
}); 