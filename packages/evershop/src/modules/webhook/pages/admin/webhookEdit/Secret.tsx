import { useAlertContext } from '@components/common/modal/Alert.js';
import { Button } from '@components/common/ui/Button.js';
import { ButtonGroup } from '@components/common/ui/ButtonGroup.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { toast } from '@components/common/ui/Sonner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import React from 'react';

interface SecretProps {
  webhook: { secret: string; updateApi: string };
}

export default function Secret({ webhook }: SecretProps) {
  const { openAlert, closeAlert } = useAlertContext();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(webhook.secret);
      toast.success(_('Secret copied'));
    } catch {
      toast.error(_('Could not copy the secret'));
    }
  };

  const regenerate = async () => {
    try {
      await axios.patch(webhook.updateApi, { regenerateSecret: true });
      window.location.reload();
    } catch (e: any) {
      closeAlert();
      toast.error(e?.response?.data?.error?.message || _('Something went wrong'));
    }
  };

  return (
    <div className="w-2/3 mx-auto">
    <Card className="mt-5">
      <CardHeader>
        <CardTitle>{_('Signing secret')}</CardTitle>
        <CardDescription>
          {_(
            'Every request carries an X-EverShop-Signature header, an HMAC-SHA256 of "<timestamp>.<body>" made with this secret. Check it on your side to be sure the request came from your store.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 items-center">
          <input
            readOnly
            aria-label={_('Signing secret')}
            value={webhook.secret}
            onFocus={(e) => e.target.select()}
            className="flex-1 min-w-0 rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm"
          />
          <ButtonGroup>
            <Button variant="outline" onClick={copy}>
              {_('Copy')}
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                openAlert({
                  heading: _('Regenerate the signing secret?'),
                  content: _(
                    'The old secret stops working at once. Update it on the receiving side too, or its signature checks will fail.'
                  ),
                  primaryAction: {
                    title: _('Cancel'),
                    onAction: closeAlert,
                    variant: 'secondary'
                  },
                  secondaryAction: {
                    title: _('Regenerate'),
                    onAction: regenerate,
                    variant: 'destructive'
                  }
                })
              }
            >
              {_('Regenerate')}
            </Button>
          </ButtonGroup>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 12
};

export const query = `
  query Query {
    webhook(id: getContextValue("webhookUuid", null)) {
      secret
      updateApi
    }
  }
`;
