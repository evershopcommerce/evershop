const STATUSES = ['pending', 'sending', 'delivered', 'failed', 'canceled'];

export function registerDefaultWebhookDeliveryFilters() {
  return [
    {
      key: 'status',
      operation: ['eq'],
      callback: (
        query: any,
        operation: string,
        value: any,
        currentFilters: any[]
      ) => {
        if (STATUSES.includes(value)) {
          query.andWhere('webhook_delivery.status', '=', value);
          currentFilters.push({ key: 'status', operation, value });
        }
      }
    }
  ];
}
