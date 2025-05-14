import { CONSTANTS } from '../../../../../lib/helpers.js';
import { validatePath } from '../../validatePath.js';

describe('Test validatePath', () => {
  it('It should return true for valid path', async () => {
    const gootPath = '/good/path';
    expect(validatePath(CONSTANTS.MEDIAPATH, gootPath)).toEqual(true);
    const goodPathAgain = 'goot/path/';
    expect(validatePath(CONSTANTS.MEDIAPATH, goodPathAgain)).toEqual(true);
    const oneMoreGood = '';
    expect(validatePath(CONSTANTS.MEDIAPATH, oneMoreGood)).toEqual(true);
    const oneMoreGood2 = 'good/.../path';
    expect(validatePath(CONSTANTS.MEDIAPATH, oneMoreGood2)).toEqual(true);
  });

  it('It should return false for invalid path', async () => {
    const badPath = '../bad/path';
    expect(validatePath(CONSTANTS.MEDIAPATH, badPath)).toEqual(false);
    const badPathAgain = '../../bad/path/';
    expect(validatePath(CONSTANTS.MEDIAPATH, badPathAgain)).toEqual(false);
    const oneMoreBad = '/bad/../path/';
    expect(validatePath(CONSTANTS.MEDIAPATH, oneMoreBad)).toEqual(false);

    const badPath2 = 'bad//path';
    expect(validatePath(CONSTANTS.MEDIAPATH, badPath2)).toEqual(false);
    const badPathAgain2 = './bad/path/';
    expect(validatePath(CONSTANTS.MEDIAPATH, badPathAgain2)).toEqual(false);
    const oneMoreBad2 = '/bad/./path/';
    expect(validatePath(CONSTANTS.MEDIAPATH, oneMoreBad2)).toEqual(false);
  });
});
