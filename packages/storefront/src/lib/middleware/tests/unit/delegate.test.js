import http from 'http';
import axios from 'axios';
import { app, bootstrap, close } from '../app/app.js';
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { delegates } from '../app/modules/delegate/pages/frontStore/delegateTest/collection.js';
import { getDelegateManager } from '../../delegate.js';

jest.setTimeout(80000);
describe('test delegate', () => {
  const server = http.createServer(app);
  let port;
  beforeAll(async () => {
    port = await bootstrap(server);
  });

  it('It should allow set delegate the fist time', () => {
    const delegate = getDelegateManager({ locals: {} });
    delegate.setOnce('returnOne', 1);
    expect(delegate.get('returnOne')).toEqual(1);
  });

  it('It should throw error when set delegate again', () => {
    const delegate = getDelegateManager({ locals: {} });
    delegate.setOnce('returnOne', 1);
    expect(() => {
      delegate.setOnce('returnOne', 2);
    }).toThrowError('is already set');
  });

  it('It should allow to get all values', () => {
    const delegate = getDelegateManager({ locals: {} });
    delegate.setOnce('returnTwo', 2);
    delegate.setOnce('returnThree', 3);
    expect(delegate.getAll()).toEqual({
      returnTwo: 2,
      returnThree: 3
    });
    expect(delegate.keys()).toEqual(['returnTwo', 'returnThree']);
  });

  it('It should give a cloned value instead of the original value', () => {
    const delegate = getDelegateManager({ locals: {} });
    delegate.setOnce('returnOne', 1);
    delegate.setOnce('returnTwo', { value: 2 });
    let value = delegate.get('returnOne');
    value += 1; // modify the value
    const objectValue = delegate.get('returnTwo');
    objectValue.value += 1; // modify the value
    expect(value).toEqual(2); // cloned value should not change
    expect(objectValue.value).toEqual(3);
    expect(delegate.get('returnOne')).toEqual(1); // original value should not change
  });

  it('Middleware function return desired value', async () => {
    // Visit a url
    await axios.get(`http://localhost:${port}/delegateTest`, {
      validateStatus(status) {
        return status >= 200 && status < 600;
      }
    });
    expect(delegates.returnOne).toEqual(1);
    expect(delegates.returnTwo).toEqual(undefined);
    expect(delegates.returnThree).toEqual(3);
  });

  afterAll((done) => {
    close(server, done);
  });
});
