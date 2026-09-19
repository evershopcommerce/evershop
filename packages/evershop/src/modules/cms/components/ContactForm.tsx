import { CheckboxField } from '@components/common/form/CheckboxField.js';
import { EmailField } from '@components/common/form/EmailField.js';
import { Form, useFormContext } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { TelField } from '@components/common/form/TelField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import {
  Editable,
  isPageBuilderActive,
  useWidgetUid
} from '@components/common/page-builder/index.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useForm } from 'react-hook-form';

export interface ContactFormProps {
  contactFormWidget: {
    title: string | null;
    subtitle: string | null;
    submitLabel: string | null;
    successMessage: string | null;
    showPhone: boolean | null;
    showSubject: boolean | null;
    consentEnabled: boolean | null;
    consentText: string | null;
  };
}

/**
 * `widget_uuid` tells the API which instance produced the message; `website` is
 * the honeypot. Both ride in the form state so they are part of the same JSON
 * body `<Form>` posts — no separate payload assembly.
 */
function HiddenFields({ widgetUid }: { widgetUid: string | null }) {
  const { register } = useFormContext();
  return (
    <>
      <input
        type="hidden"
        {...register('widget_uuid')}
        defaultValue={widgetUid ?? ''}
      />
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
        {...register('website')}
      />
    </>
  );
}

export default function ContactForm({ contactFormWidget }: ContactFormProps) {
  const {
    title,
    subtitle,
    submitLabel,
    successMessage,
    showPhone,
    showSubject,
    consentEnabled,
    consentText
  } = contactFormWidget;

  // The widget instance uuid. Available on the live storefront too — Area tags
  // every widget with its uuid and WidgetChrome provides the context even
  // outside the page-builder iframe.
  const widgetUid = useWidgetUid();

  // Owned here rather than left to <Form> so the fields can be cleared after a
  // successful send. `shouldUnregister` keeps hidden optional fields out of the
  // payload entirely when the merchant has toggled them off.
  const form = useForm({
    shouldUnregister: true,
    shouldFocusError: false
  });

  const [status, setStatus] = React.useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Inside the editor the form is a design surface, not a live one — a
  // merchandiser tabbing through their own layout should not mail the store.
  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => {
    setIsClient(true);
  }, []);
  const inPageBuilder = isClient && isPageBuilderActive();

  return (
    <section className="evershop-contact-form max-w-2xl mx-auto py-8">
      {title && (
        <Editable
          as="h2"
          fieldPath="settings.title"
          className="evershop-contact-form__title text-2xl font-semibold mb-2"
        >
          {title}
        </Editable>
      )}
      {subtitle && (
        <Editable
          as="p"
          fieldPath="settings.subtitle"
          multiline
          className="evershop-contact-form__subtitle text-muted-foreground mb-6"
        >
          {subtitle}
        </Editable>
      )}

      {/* Announced when it appears, without stealing focus. */}
      <div aria-live="polite">
        {status && (
          <div
            className={`mb-4 ${
              status.type === 'success' ? 'text-green-700' : 'text-destructive'
            }`}
          >
            {status.text}
          </div>
        )}
      </div>

      <Form
        id="contactForm"
        form={form}
        action="/api/contact"
        method="POST"
        submitBtnText={submitLabel || _('Send message')}
        onSubmit={inPageBuilder ? async () => undefined : undefined}
        onSuccess={() => {
          setStatus({
            type: 'success',
            text: successMessage || _('Thanks! Your message has been sent.')
          });
          form.reset();
        }}
        onError={(error) => {
          setStatus({
            type: 'error',
            text: error || _('Something went wrong. Please try again.')
          });
        }}
      >
        {/* <Form> wraps children in a <fieldset>, so the spacing wrapper has to
            live in here rather than on the form element. */}
        <div className="space-y-3">
          <HiddenFields widgetUid={widgetUid} />

          {/* Name and email share a row on tablet and up; they are short
              fields and pairing them keeps the form from reading as a long
              column. They stack below `md`. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InputField
              name="name"
              label={_('Name')}
              placeholder={_('Your name')}
              required
              validation={{ required: _('Name is required') }}
            />

            <EmailField
              name="email"
              label={_('Email')}
              placeholder={_('you@example.com')}
              required
              validation={{ required: _('Email is required') }}
            />
          </div>

          {showPhone && (
            <TelField
              name="phone"
              label={_('Phone')}
              placeholder={_('Your phone number')}
            />
          )}

          {showSubject && (
            <InputField
              name="subject"
              label={_('Subject')}
              placeholder={_('What is this about?')}
            />
          )}

          <TextareaField
            name="message"
            label={_('Message')}
            placeholder={_('How can we help?')}
            rows={5}
            required
            validation={{ required: _('Message is required') }}
          />

          {consentEnabled && (
            <CheckboxField
              name="consent"
              label={
                consentText ||
                _(
                  'I agree that my details may be used to respond to my enquiry.'
                )
              }
              required
              validation={{ required: _('Please accept before sending') }}
            />
          )}
        </div>
      </Form>
    </section>
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
