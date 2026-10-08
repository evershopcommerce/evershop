import { GridPagination } from '@components/admin/grid/GridPagination.js';
import { Badge } from '@components/common/ui/Badge.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@components/common/ui/Dialog.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@components/common/ui/Select.js';
import { toast } from '@components/common/ui/Sonner.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import React, { useState } from 'react';

interface DeliveryRow {
  uuid: string;
  topic: string;
  topicLabel: string;
  status: 'pending' | 'sending' | 'delivered' | 'failed' | 'canceled';
  attempts: number;
  lastStatusCode: number | null;
  lastError: string | null;
  payload: unknown;
  retryApi: string;
  createdAt: { text: string } | null;
  nextAttemptAt: { text: string } | null;
}

interface Filter {
  key: string;
  operation: string;
  value: string;
}

const STATUS_VARIANT = {
  delivered: 'success',
  pending: 'warning',
  sending: 'warning',
  failed: 'destructive',
  canceled: 'secondary'
} as const;

function statusLabel(status: DeliveryRow['status']): string {
  switch (status) {
    case 'delivered':
      return _('Delivered');
    case 'pending':
      return _('Pending');
    case 'sending':
      return _('Sending');
    case 'failed':
      return _('Failed');
    default:
      return _('Canceled');
  }
}

/** The result of the last attempt: an HTTP status, or why there was none. */
function resultText(d: DeliveryRow): string {
  if (d.lastStatusCode) {
    return _('HTTP ${code}', { code: `${d.lastStatusCode}` });
  }
  return d.lastError ?? '';
}

export default function Deliveries({
  webhookDeliveries: { items, total, currentFilters = [] }
}: {
  webhookDeliveries: {
    items: DeliveryRow[];
    total: number;
    currentFilters: Filter[];
  };
}) {
  const filterValue = (key: string) =>
    currentFilters.find((f) => f.key === key)?.value;
  const page = parseInt(filterValue('page') ?? '1', 10);
  const limit = parseInt(filterValue('limit') ?? '20', 10);
  const status = filterValue('status') ?? 'all';
  const [viewing, setViewing] = useState<DeliveryRow | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const retry = async (d: DeliveryRow) => {
    setRetrying(d.uuid);
    try {
      await axios.post(d.retryApi);
      toast.success(_('Queued. It will be sent within a minute.'));
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      setRetrying(null);
      toast.error(
        e?.response?.data?.error?.message || _('Something went wrong')
      );
    }
  };

  const changeStatus = (value: string | null) => {
    const url = new URL(window.location.href);
    url.searchParams.delete('page');
    if (value && value !== 'all') {
      url.searchParams.set('status[operation]', 'eq');
      url.searchParams.set('status[value]', value);
    } else {
      url.searchParams.delete('status[operation]');
      url.searchParams.delete('status[value]');
    }
    window.location.href = url.href;
  };

  return (
    <div className="w-2/3 mx-auto">
    <Card className="mt-5">
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle>{_('Deliveries')}</CardTitle>
          <CardDescription>
            {_('The newest first. Failed deliveries can be retried.')}
          </CardDescription>
        </div>
        <Select value={status} onValueChange={changeStatus}>
          <SelectTrigger className="w-40" aria-label={_('Filter by status')}>
            <SelectValue>
              {status === 'all' ? _('All statuses') : statusLabel(status as any)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{_('All statuses')}</SelectItem>
            <SelectItem value="pending">{_('Pending')}</SelectItem>
            <SelectItem value="delivered">{_('Delivered')}</SelectItem>
            <SelectItem value="failed">{_('Failed')}</SelectItem>
            <SelectItem value="canceled">{_('Canceled')}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{_('Time')}</TableHead>
              <TableHead>{_('Event')}</TableHead>
              <TableHead>{_('Status')}</TableHead>
              <TableHead>{_('Last result')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((d) => (
              <TableRow key={d.uuid}>
                <TableCell>
                  {d.createdAt?.text}
                </TableCell>
                <TableCell className="whitespace-normal">{d.topicLabel}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[d.status]}>
                    {statusLabel(d.status)}
                  </Badge>
                  {d.attempts > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {_('Attempts: ${count}', { count: `${d.attempts}` })}
                    </div>
                  )}
                </TableCell>
                <TableCell className="whitespace-normal">
                  <div>{resultText(d)}</div>
                  {d.status === 'pending' && d.attempts > 0 && d.nextAttemptAt && (
                    <div className="text-sm text-muted-foreground">
                      {_('Next try ${time}', { time: d.nextAttemptAt.text })}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button variant="link" size="sm" onClick={() => setViewing(d)}>
                      {_('View payload')}
                    </Button>
                    {d.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        isLoading={retrying === d.uuid}
                        onClick={() => retry(d)}
                      >
                        {_('Retry')}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {items.length === 0 && (
          <div className="flex w-full justify-center mt-2 text-muted-foreground">
            {_('No deliveries yet.')}
          </div>
        )}
        <GridPagination total={total} limit={limit} page={page} />
      </CardContent>
      <Dialog
        open={viewing !== null}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewing?.topicLabel}</DialogTitle>
            <DialogDescription>
              {_('The JSON body that is sent to the URL.')}
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(viewing?.payload ?? null, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </Card>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query($filters: [FilterInput]) {
    webhookDeliveries(webhookId: getContextValue("webhookUuid"), filters: $filters) {
      items {
        uuid
        topic
        topicLabel
        status
        attempts
        lastStatusCode
        lastError
        payload
        retryApi
        createdAt {
          text(format: "LLL dd, HH:mm")
        }
        nextAttemptAt {
          text(format: "LLL dd, HH:mm")
        }
      }
      total
      currentFilters {
        key
        operation
        value
      }
    }
  }
`;

export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;
