import {
  drawerInputClass,
  drawerTextareaClass,
  Field,
  Section,
  Toggle,
  useScopedFormContext
} from '@components/common/page-builder/index.js';
import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@components/common/ui/Alert.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Mail, TriangleAlert } from 'lucide-react';
import React from 'react';
import { useQuery } from 'urql';

const StoreEmailQuery = `
  query StoreEmail {
    setting {
      storeEmail
    }
    storeSettingUrl: url(routeId: "storeSetting")
  }
`;

/**
 * Where the messages go.
 *
 * The recipient is the store email setting and nothing else — never a
 * per-widget address, which would be scraped straight off the page source. That
 * is invisible from inside the drawer, so state it either way rather than only
 * when something is wrong: a merchant configuring this form should not have to
 * guess where a customer's message will land.
 *
 * Both branches also say that submissions are stored regardless, because the
 * email is a notification, not the record.
 */
function StoreEmailNote() {
  const [{ data, fetching }] = useQuery({ query: StoreEmailQuery });
  if (fetching) {
    return null;
  }
  const storeEmail = data?.setting?.storeEmail;
  const settingsUrl = data?.storeSettingUrl;

  if (!storeEmail) {
    return (
      <Alert
        variant="destructive"
        className="border-amber-300 bg-amber-50 text-amber-900 [&>svg]:text-amber-700"
      >
        <TriangleAlert />
        <AlertTitle>{_('Store email is not set')}</AlertTitle>
        <AlertDescription>
          {_(
            'Messages will still be saved and visible under CMS → Contact messages, but no notification email will be sent.'
          )}{' '}
          {settingsUrl && (
            <a href={settingsUrl} className="underline underline-offset-2">
              {_('Add a store email')}
            </a>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Quiet by design — this is reassurance on every open, not an alert.
  return (
    <div className="flex items-start gap-2 rounded-md border border-divider bg-card px-3 py-2 text-[11px] text-muted-foreground">
      <Mail className="mt-px h-3.5 w-3.5 shrink-0" />
      <div>
        {_(
          'Messages are sent to ${email} and saved under CMS → Contact messages.',
          {
            email: storeEmail
          }
        )}{' '}
        {settingsUrl && (
          <a href={settingsUrl} className="underline underline-offset-2">
            {_('Change')}
          </a>
        )}
      </div>
    </div>
  );
}

interface ContactFormSettingProps {
  contactFormWidget?: {
    title?: string | null;
    subtitle?: string | null;
    submitLabel?: string | null;
    successMessage?: string | null;
    showPhone?: boolean | null;
    showSubject?: boolean | null;
    consentEnabled?: boolean | null;
    consentText?: string | null;
  };
}

export default function ContactFormSetting({
  contactFormWidget
}: ContactFormSettingProps) {
  // Optional-chained: in the page-builder drawer this mounts via
  // <Area id="widget_setting_form"> with no GraphQL props — the page-level form
  // already holds the values.
  const {
    title = '',
    subtitle = '',
    submitLabel = '',
    successMessage = '',
    showPhone,
    showSubject,
    consentEnabled,
    consentText = ''
  } = contactFormWidget ?? {};
  const { setValue, watch } = useScopedFormContext();

  const phoneOn =
    (watch('settings.showPhone') as boolean | null) ?? showPhone ?? false;
  const subjectOn =
    (watch('settings.showSubject') as boolean | null) ?? showSubject ?? false;
  const consentOn =
    (watch('settings.consentEnabled') as boolean | null) ??
    consentEnabled ??
    false;

  return (
    // The drawer's `space-y-6` applies to the <Area> wrapper, not to what the
    // setting component renders inside it — so the spacing between sections is
    // ours to supply, like every other widget setting component.
    <div className="space-y-3">
      <StoreEmailNote />

      <Section title={_('Titles')}>
        <Field label={_('Heading')}>
          <input
            type="text"
            value={(watch('settings.title') as string) ?? title ?? ''}
            onChange={(e) =>
              setValue('settings.title', e.target.value, { shouldDirty: true })
            }
            placeholder={_('e.g. Get in touch')}
            className={drawerInputClass}
          />
        </Field>
        <Field label={_('Subheading')} hint={_('Optional supporting copy.')}>
          <textarea
            rows={2}
            value={(watch('settings.subtitle') as string) ?? subtitle ?? ''}
            onChange={(e) =>
              setValue('settings.subtitle', e.target.value, {
                shouldDirty: true
              })
            }
            placeholder={_('e.g. We usually reply within one business day.')}
            className={drawerTextareaClass}
          />
        </Field>
      </Section>

      <Section title={_('Fields')}>
        <Toggle
          label={_('Show phone field')}
          checked={phoneOn}
          onChange={(v) =>
            setValue('settings.showPhone', v, { shouldDirty: true })
          }
        />
        <Toggle
          label={_('Show subject field')}
          checked={subjectOn}
          onChange={(v) =>
            setValue('settings.showSubject', v, { shouldDirty: true })
          }
        />
      </Section>

      <Section title={_('Submit')}>
        <Field label={_('Button label')}>
          <input
            type="text"
            value={
              (watch('settings.submitLabel') as string) ?? submitLabel ?? ''
            }
            onChange={(e) =>
              setValue('settings.submitLabel', e.target.value, {
                shouldDirty: true
              })
            }
            placeholder={_('e.g. Send message')}
            className={drawerInputClass}
          />
        </Field>
        <Field
          label={_('Success message')}
          hint={_('Shown after the message is sent.')}
        >
          <textarea
            rows={2}
            value={
              (watch('settings.successMessage') as string) ??
              successMessage ??
              ''
            }
            onChange={(e) =>
              setValue('settings.successMessage', e.target.value, {
                shouldDirty: true
              })
            }
            placeholder={_('e.g. Thanks! Your message has been sent.')}
            className={drawerTextareaClass}
          />
        </Field>
      </Section>

      <Section title={_('Consent')}>
        <Toggle
          label={_('Show consent checkbox')}
          checked={consentOn}
          onChange={(v) =>
            setValue('settings.consentEnabled', v, { shouldDirty: true })
          }
        />
        {consentOn && (
          <Field label={_('Consent text')}>
            <textarea
              rows={2}
              value={
                (watch('settings.consentText') as string) ?? consentText ?? ''
              }
              onChange={(e) =>
                setValue('settings.consentText', e.target.value, {
                  shouldDirty: true
                })
              }
              placeholder={_(
                'e.g. I agree that my details may be used to respond to my enquiry.'
              )}
              className={drawerTextareaClass}
            />
          </Field>
        )}
      </Section>
    </div>
  );
}

export const query = `
  query Query(
    $title: String
    $subtitle: String
    $submitLabel: String
    $successMessage: String
    $showPhone: Boolean
    $showSubject: Boolean
    $consentEnabled: Boolean
    $consentText: String
  ) {
    contactFormWidget(
      title: $title
      subtitle: $subtitle
      submitLabel: $submitLabel
      successMessage: $successMessage
      showPhone: $showPhone
      showSubject: $showSubject
      consentEnabled: $consentEnabled
      consentText: $consentText
    ) {
      title
      subtitle
      submitLabel
      successMessage
      showPhone
      showSubject
      consentEnabled
      consentText
    }
  }
`;

export const variables = `{
  title: getWidgetSetting("title"),
  subtitle: getWidgetSetting("subtitle"),
  submitLabel: getWidgetSetting("submitLabel"),
  successMessage: getWidgetSetting("successMessage"),
  showPhone: getWidgetSetting("showPhone"),
  showSubject: getWidgetSetting("showSubject"),
  consentEnabled: getWidgetSetting("consentEnabled"),
  consentText: getWidgetSetting("consentText")
}`;
