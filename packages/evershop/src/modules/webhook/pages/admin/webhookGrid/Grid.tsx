import { useAlertContext } from '@components/common/modal/Alert.js';
import { Badge } from '@components/common/ui/Badge.js';
import { Button } from '@components/common/ui/Button.js';
import { ButtonGroup } from '@components/common/ui/ButtonGroup.js';
import { Card, CardContent } from '@components/common/ui/Card.js';
import { Checkbox } from '@components/common/ui/Checkbox.js';
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

interface WebhookRow {
  uuid: string;
  name: string;
  url: string;
  enabled: boolean;
  topics: string[];
  pendingCount: number;
  failedCount: number;
  editUrl: string;
  deleteApi: string;
}

function Actions({
  webhooks,
  selectedIds
}: {
  webhooks: WebhookRow[];
  selectedIds: string[];
}) {
  const { openAlert, closeAlert } = useAlertContext();

  const remove = async () => {
    await Promise.all(
      webhooks
        .filter((w) => selectedIds.includes(w.uuid))
        .map((w) => axios.delete(w.deleteApi))
    );
    window.location.reload();
  };

  if (selectedIds.length === 0) {
    return null;
  }
  return (
    <TableRow>
      <TableCell colSpan={100}>
        <ButtonGroup>
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              openAlert({
                heading: _('Delete the selected webhooks?'),
                content: _(
                  'Their delivery history is deleted too. Are you sure?'
                ),
                primaryAction: {
                  title: _('Cancel'),
                  onAction: closeAlert,
                  variant: 'secondary'
                },
                secondaryAction: {
                  title: _('Delete'),
                  onAction: remove,
                  variant: 'destructive'
                }
              });
            }}
          >
            {_('Delete')}
          </Button>
        </ButtonGroup>
      </TableCell>
    </TableRow>
  );
}

export default function WebhookGrid({ webhooks }: { webhooks: WebhookRow[] }) {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  return (
    <div className="w-2/3 mx-auto">
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style={{ width: '2rem' }}>
                <Checkbox
                  aria-label={_('Select all')}
                  onCheckedChange={(checked) =>
                    setSelectedRows(checked ? webhooks.map((w) => w.uuid) : [])
                  }
                />
              </TableHead>
              <TableHead>{_('Name')}</TableHead>
              <TableHead>{_('URL')}</TableHead>
              <TableHead>{_('Events')}</TableHead>
              <TableHead>{_('Status')}</TableHead>
              <TableHead>{_('Pending')}</TableHead>
              <TableHead>{_('Failed')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <Actions webhooks={webhooks} selectedIds={selectedRows} />
            {webhooks.map((w) => (
              <TableRow key={w.uuid}>
                <TableCell style={{ width: '2rem' }}>
                  <Checkbox
                    aria-label={_('Select ${name}', { name: w.name })}
                    checked={selectedRows.includes(w.uuid)}
                    onCheckedChange={(checked) =>
                      setSelectedRows(
                        checked
                          ? selectedRows.concat([w.uuid])
                          : selectedRows.filter((row) => row !== w.uuid)
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  <a href={w.editUrl} className="hover:underline font-medium">
                    {w.name}
                  </a>
                </TableCell>
                <TableCell className="max-w-xs truncate" title={w.url}>
                  {w.url}
                </TableCell>
                <TableCell>{w.topics.length}</TableCell>
                <TableCell>
                  <Badge variant={w.enabled ? 'success' : 'secondary'}>
                    {w.enabled ? _('Enabled') : _('Disabled')}
                  </Badge>
                </TableCell>
                <TableCell>{w.pendingCount}</TableCell>
                <TableCell>
                  {w.failedCount > 0 ? (
                    <Badge variant="destructive">{w.failedCount}</Badge>
                  ) : (
                    0
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {webhooks.length === 0 && (
          <div className="flex w-full justify-center mt-2 text-muted-foreground">
            {_(
              'No webhook yet. Create one to send store events to another system.'
            )}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query {
    webhooks {
      uuid
      name
      url
      enabled
      topics
      pendingCount
      failedCount
      editUrl
      deleteApi
    }
  }
`;
