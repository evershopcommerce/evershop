/* eslint-disable no-undef, global-require */
const path = require('path');
const { resolveAlias } = require('../../resolveAlias');

describe('resolveAlias', () => {
  it('It should get the components and css file with correct priority', () => {
    const resolves = resolveAlias(
      [
        {
          path: path.resolve(__dirname, 'extensions/extensionA'),
          priority: 1
        },
        {
          path: path.resolve(__dirname, 'extensions/extensionB'),
          priority: 2
        }
      ],
      path.resolve(__dirname, 'theme')
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
