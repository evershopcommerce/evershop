import {expect, jest, test} from '@jest/globals';
import { select, update } from '@evershop/postgres-query-builder';
const middleware = require('@evershop/evershop/src/modules/checkout/pages/frontStore/all/[auth]addCustomerToCart');

// Mock dependencies
jest.mock('@evershop/postgres-query-builder');

jest.mock('@evershop/evershop/src/lib/postgres/connection', () => ({
  pool: {},
}));

/* eslint-disable no-undef, global-require */
describe("Testing frontStore checkout functionality", () => {
  // clear mock after each run
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("correctly get cart for logged-in user", async () => {
    // mock data for testing
    const mockRequest = {
      sessionID: '12345',
      getCurrentCustomer: jest.fn(() => ({
        group_id: 1,
        customer_id: 123,
        full_name: 'chewbarka',
        email: 'dog@example.com',
      })),
    };

    const mockResponse = {};
    const mockNext = jest.fn();

    // mock select query's result
    const mockCart = { cart_id: 'cart123', products: ["shoes", "shirts"] };
    select.mockResolvedValueOnce(mockCart);
    await middleware(mockRequest, mockResponse, {}, mockNext);

    expect(mockRequest.getCurrentCustomer).toHaveBeenCalled();
    expect(select).toHaveBeenCalled();
    expect(await select.mock.results[0].value).toEqual(mockCart);
  });
});
