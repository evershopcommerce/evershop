import { Badge } from '@components/common/ui/Badge.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import React, { useState } from 'react';

interface SendTestProps {
  webhook: { testApi: string };
}

interface TestResult {
  status: 'delivered' | 'failed';
  statusCode: number | null;
  error: string | null;
}

function describe(result: TestResult): string {
  if (result.status === 'delivered') {
    return _('Delivered (HTTP ${code})', { code: `${result.statusCode}` });
  }
  if (result.statusCode) {
    return _('Failed (HTTP ${code})', { code: `${result.statusCode}` });
  }
  return _('Failed (${error})', { error: result.error ?? '' });
}

export default function SendTest({ webhook }: SendTestProps) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const send = async () => {
    setSending(true);
    setResult(null);
    setProblem(null);
    try {
      const response = await axios.post(webhook.testApi);
      setResult(response.data.data);
    } catch (e: any) {
      setProblem(
        e?.response?.data?.error?.message || _('Something went wrong')
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-2/3 mx-auto">
    <Card className="mt-5">
      <CardHeader>
        <CardTitle>{_('Test')}</CardTitle>
        <CardDescription>
          {_(
            'Send a "webhook_ping" event to check the URL and the secret. It works even if the webhook is disabled, and it is not retried.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 items-center" aria-live="polite">
          <Button variant="outline" onClick={send} isLoading={sending}>
            {_('Send test event')}
          </Button>
          {result && (
            <Badge
              variant={result.status === 'delivered' ? 'success' : 'destructive'}
            >
              {describe(result)}
            </Badge>
          )}
          {problem && <Badge variant="destructive">{problem}</Badge>}
          {(result || problem) && (
            <Button variant="link" onClick={() => window.location.reload()}>
              {_('Refresh the list')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 14
};

export const query = `
  query Query {
    webhook(id: getContextValue("webhookUuid", null)) {
      testApi
    }
  }
`;
