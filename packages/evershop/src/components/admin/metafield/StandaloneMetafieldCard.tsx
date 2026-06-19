import { Form } from '@components/common/form/Form.js';
import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { MetafieldSection } from './MetafieldSection.js';

/**
 * Self-contained metafield editor for entities whose admin screen is a read-only
 * VIEW with no surrounding entity form (customer, order, shop). It wraps
 * MetafieldSection in its own form and PATCHes the values to a dedicated endpoint
 * on Save, instead of folding them into an entity create/update payload.
 *
 * The Add-field / View-JSON dialogs inside MetafieldSection render through a
 * portal, so they don't nest inside this form.
 */
export function StandaloneMetafieldCard({
  ownerType,
  values,
  currency = 'USD',
  saveUrl
}: {
  ownerType: string;
  values?: Record<string, unknown>;
  currency?: string;
  saveUrl: string;
}): React.ReactElement {
  const [submitting, setSubmitting] = useState(false);
  const formId = `mf-standalone-${ownerType}`;

  const handleSubmit = async (data: Record<string, any>) => {
    setSubmitting(true);
    try {
      await axios.patch(saveUrl, { metafields: data.metafields ?? {} });
      toast.success(_('Custom fields saved'));
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: { message?: string } } };
      };
      toast.error(
        err.response?.data?.error?.message ?? _('Failed to save custom fields')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form id={formId} submitBtn={false} onSubmit={handleSubmit}>
      <MetafieldSection
        ownerType={ownerType}
        values={values}
        currency={currency}
      />
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          isLoading={submitting}
          onClick={() =>
            (document.getElementById(formId) as HTMLFormElement)?.dispatchEvent(
              new Event('submit', { cancelable: true, bubbles: true })
            )
          }
        >
          {_('Save custom fields')}
        </Button>
      </div>
    </Form>
  );
}
