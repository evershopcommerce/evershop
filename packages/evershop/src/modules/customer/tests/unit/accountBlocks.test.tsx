import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppProvider } from '../../../../components/common/context/app.js';
import { CustomerProvider } from '../../../../components/frontStore/customer/CustomerContext.js';
import AccountHeader, { layout as headerLayout } from '../../pages/frontStore/account+orderList/AccountHeader.js';
import AccountNav, { layout as navLayout } from '../../pages/frontStore/account+orderList/AccountNav.js';
import AccountAddressBook, { layout as addressBookLayout } from '../../pages/frontStore/account/AccountAddressBook.js';
import AccountInfo, { layout as infoLayout } from '../../pages/frontStore/account/AccountInfo.js';
import AccountRecentOrders, { layout as recentOrdersLayout } from '../../pages/frontStore/account/AccountRecentOrders.js';
import CustomerOrders, { layout as ordersLayout } from '../../pages/frontStore/orderList/CustomerOrders.js';

// The dashboard and order list shells own the centered column; the header and
// nav blocks are shared through the `account+orderList` folder, the rest are
// route-specific. All register into Areas so `layouts.json` can move them.
const customer = {
  customerId: 1,
  uuid: 'c-1',
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  groupId: 1,
  status: 1,
  addresses: [],
  orders: [
    {
      orderId: 1,
      uuid: 'o-1',
      orderNumber: '10001',
      createdAt: { text: '12 Sep 2026' },
      status: { name: 'Processing' },
      shipmentStatus: { name: 'Pending' },
      grandTotal: { text: '$110.00' },
      items: []
    }
  ]
} as unknown as React.ComponentProps<typeof CustomerProvider>['initialCustomer'];

const render = (routeId: string, el: React.ReactElement) =>
  renderToStaticMarkup(
    <AppProvider
      value={
        { config: { pageMeta: { route: { id: routeId } } }, widgets: [], propsMap: {} } as unknown as React.ComponentProps<
          typeof AppProvider
        >['value']
      }
    >
      <CustomerProvider loginAPI="/api/login" registerAPI="/api/register" logoutAPI="/api/logout" initialCustomer={customer}>
        {el}
      </CustomerProvider>
    </AppProvider>
  );

describe('account page blocks', () => {
  it('keep the default slots the shells had when the pieces were inline', () => {
    expect(headerLayout).toEqual({ areaId: 'accountPageHeader', sortOrder: 10 });
    expect(navLayout).toEqual({ areaId: 'accountPageHeader', sortOrder: 20 });
    expect(recentOrdersLayout).toEqual({ areaId: 'accountPageContent', sortOrder: 10 });
    expect(infoLayout).toEqual({ areaId: 'accountPageContent', sortOrder: 20 });
    expect(addressBookLayout).toEqual({ areaId: 'accountPageContent', sortOrder: 30 });
    expect(ordersLayout).toEqual({ areaId: 'accountPageContent', sortOrder: 10 });
  });

  it('render the sections from the customer context, without props', () => {
    expect(render('account', <AccountHeader />)).toContain('account-header');
    expect(render('account', <AccountRecentOrders />)).toContain('account-recent-orders');
    expect(render('account', <AccountInfo />)).toContain('account-info-section');
    expect(render('account', <AccountAddressBook />)).toContain('account-address-section');
    const orders = render('orderList', <CustomerOrders />);
    expect(orders).toContain('#10001');
    expect(orders).toContain('/account/orders/o-1');
  });

  it('highlight the nav tab of the current route', () => {
    const onDashboard = render('account', <AccountNav />);
    const onOrders = render('orderList', <AccountNav />);
    expect(onDashboard).toContain('account-nav');
    expect(onDashboard).not.toBe(onOrders);
  });
});
