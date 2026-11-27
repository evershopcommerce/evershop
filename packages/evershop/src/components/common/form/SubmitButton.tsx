import { useFormSubmitting } from '@components/common/form/Form.js';
import { Button } from '@components/common/ui/Button.js';
import React from 'react';

/**
 * A submit button for a `<Form submitBtn={false}>` that places its own save
 * button (a card footer, a dialog footer). It shows a spinner while the form
 * submits, and while the page loads when the save redirects. Render it inside
 * the `<Form>`; pass `form="<form id>"` when it sits outside the form element.
 */
export function SubmitButton({
  isLoading = false,
  ...props
}: React.ComponentProps<typeof Button>) {
  const submitting = useFormSubmitting();
  return <Button type="submit" {...props} isLoading={submitting || isLoading} />;
}
