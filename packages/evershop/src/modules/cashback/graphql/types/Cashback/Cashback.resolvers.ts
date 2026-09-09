import {
  getCustomerBalance,
  getCustomerTransactions
} from '../../../services/customerBalanceService.js';
import {
  isCashbackEnabled,
  getCashbackPercentage,
  getCashbackMinOrderAmount
} from '../../../services/cashbackSettings.js';

export default {
  Query: {
    cashbackSetting: async () => ({
      enabled: await isCashbackEnabled(),
      percentage: await getCashbackPercentage(),
      minOrderAmount: await getCashbackMinOrderAmount()
    }),
    customerCashback: async (root: any, { customerId }: { customerId?: number }, { customer }: any) => {
      const id = customerId || customer?.customerId;
      if (!id) {
        return null;
      }
      const balance = await getCustomerBalance(id);
      const transactions = await getCustomerTransactions(id);
      return {
        balance: balance.balance,
        pendingBalance: balance.pending_balance,
        transactions: transactions.map((t) => ({
          uuid: t.uuid,
          orderId: t.order_id,
          amount: t.amount,
          type: t.type,
          status: t.status,
          note: t.note,
          createdAt: t.created_at
        }))
      };
    }
  },
  Customer: {
    cashbackBalance: async (customerObj: any) => {
      const customerId = customerObj.customerId;
      if (!customerId) return null;
      const balance = await getCustomerBalance(customerId);
      const transactions = await getCustomerTransactions(customerId);
      return {
        balance: balance.balance,
        pendingBalance: balance.pending_balance,
        transactions: transactions.map((t) => ({
          uuid: t.uuid,
          orderId: t.order_id,
          amount: t.amount,
          type: t.type,
          status: t.status,
          note: t.note,
          createdAt: t.created_at
        }))
      };
    }
  }
};
