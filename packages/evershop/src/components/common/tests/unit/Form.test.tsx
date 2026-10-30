import { jest, describe, it, expect } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Before hydration the browser submits a form by itself. A <form> with no
 * method submits as GET, which put the admin's email and password in the URL
 * (/admin/login?email=…&password=…). The native form must always POST, to the
 * page's own URL — never GET, and never to the JSON endpoint in `action`.
 */
jest.unstable_mockModule('urql', () => ({ useQuery: () => [{ data: undefined, fetching: false, error: undefined }] }));
const { AppProvider } = await import('../../context/app.js');
const { Form } = await import('../../form/Form.js');
const { InputField } = await import('../../form/InputField.js');
const LoginForm = (await import('../../../../modules/auth/pages/admin/adminLogin/LoginForm.js')).default;

const appContext = {
  config: { pageMeta: { route: { id: 'adminLogin' } } },
  widgets: [],
  propsMap: {}
} as unknown as React.ComponentProps<typeof AppProvider>['value'];

const formTag = (html: string) => (html.match(/<form\b[^>]*>/) || [])[0] || '';

describe('Form native submission', () => {
  it('renders the admin login form with method="post" and no action', () => {
    const html = renderToStaticMarkup(
      <AppProvider value={appContext}>
        <LoginForm authUrl="/admin/user/login" dashboardUrl="/admin" />
      </AppProvider>
    );
    const tag = formTag(html);
    expect(tag).toContain('id="adminLoginForm"');
    expect(tag).toContain('method="post"');
    expect(tag).not.toContain('action=');
    expect(html).toContain('name="password"');
  });

  it('posts natively whatever the fetch method, as a native form has no PATCH', () => {
    for (const method of [undefined, 'POST', 'PATCH', 'PUT', 'DELETE'] as const) {
      const html = renderToStaticMarkup(
        <AppProvider value={appContext}>
          <Form action="/api/things" method={method}>
            <InputField name="title" label="Title" />
          </Form>
        </AppProvider>
      );
      expect(formTag(html)).toContain('method="post"');
      expect(formTag(html)).not.toContain('action=');
    }
  });
});
