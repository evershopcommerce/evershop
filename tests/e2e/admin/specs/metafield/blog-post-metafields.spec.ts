import { expect, test } from '@playwright/test';
import {
  cleanupBlogPostDefinitions,
  createTestBlogPost,
  deleteTestBlogPost,
  getBlogPostMeta,
  seedBlogPostDefinitions,
  setBlogPostMeta,
  type TestBlogPost
} from '../../../shared/metafieldDb.js';

/**
 * Blog-post metafields (PR D of the theme-metafields plan) — the owner-wiring
 * acceptance test. Definition of done: a value saved through the admin blog
 * form persists into `blog_post.meta_data` via the fold processors registered
 * in `blog/bootstrap.ts` (payload key `metafields` → `validateMetafields` →
 * `meta_data`), and the storefront `blogPostView` page data exposes it through
 * the non-admin `metafields` GraphQL field the master now selects.
 *
 * Mirrors the product suite's data conventions: definitions seeded for
 * `owner_type='blog_post'` under `custom` with `e2e_` keys; the test post is
 * created and deleted by the suite.
 */

const TEXT = 'metafields.custom.e2e_blog_text';
const RATING = 'metafields.custom.e2e_blog_rating';

let post: TestBlogPost;

test.describe('admin + storefront / blog post metafields', () => {
  test.beforeAll(async () => {
    post = await createTestBlogPost();
    await seedBlogPostDefinitions([
      { fieldKey: 'e2e_blog_text', name: 'E2E Blog Text', fieldType: 'short_text' },
      {
        fieldKey: 'e2e_blog_rating',
        name: 'E2E Blog Rating',
        fieldType: 'integer',
        validations: [{ type: 'range', min: 1, max: 10 }]
      }
    ]);
  });

  test.afterAll(async () => {
    await cleanupBlogPostDefinitions();
    await deleteTestBlogPost(post.blogPostId);
  });

  test.beforeEach(async () => {
    await setBlogPostMeta(post.blogPostId, {});
  });

  test('custom-fields card saves through the fold path into blog_post.meta_data', async ({
    page
  }) => {
    await page.goto(`/admin/blog/posts/edit/${post.uuid}`);
    // The description block editor registers a hidden input ("") and only
    // seeds the real Row[] after its lazily-imported EditorJS chunks load
    // (Editor.tsx initEditors) — saving before that submits "" and 400s.
    // Waiting for the seeded body text guarantees the form holds the rows.
    await expect(page.getByText('e2e body')).toBeVisible({ timeout: 20_000 });

    // The shared MetafieldSection card renders the seeded blog_post rows.
    await page.getByTestId('mf-preview-e2e_blog_text').scrollIntoViewIfNeeded();
    await page.getByTestId('mf-preview-e2e_blog_text').click();
    await page.locator(`[name="${TEXT}"]`).fill('hello-blog-metafield');

    await page.getByTestId('mf-preview-e2e_blog_rating').scrollIntoViewIfNeeded();
    await page.getByTestId('mf-preview-e2e_blog_rating').click();
    await page.locator(`[name="${RATING}"]`).fill('7');

    const [response] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.request().method() === 'PATCH' && r.url().includes('/blog/posts/')
      ),
      page.getByRole('button', { name: 'Save', exact: true }).last().click()
    ]);
    expect(response.ok()).toBeTruthy();

    await expect
      .poll(async () => getBlogPostMeta(post.blogPostId), { timeout: 5_000 })
      .toEqual({
        custom: {
          e2e_blog_text: 'hello-blog-metafield',
          e2e_blog_rating: 7
        }
      });
    // The integer survives as a JSON number (AJV-validated), not a string.
    expect(typeof (await getBlogPostMeta(post.blogPostId)).custom.e2e_blog_rating).toBe(
      'number'
    );
  });

  test('integer range validation blocks an out-of-range save inline', async ({
    page
  }) => {
    await page.goto(`/admin/blog/posts/edit/${post.uuid}`);

    await page.getByTestId('mf-preview-e2e_blog_rating').scrollIntoViewIfNeeded();
    await page.getByTestId('mf-preview-e2e_blog_rating').click();
    await page.locator(`[name="${RATING}"]`).fill('50');
    await page.getByRole('button', { name: 'Save', exact: true }).last().click();

    await expect(
      page.getByTestId('mf-row-e2e_blog_rating').getByRole('alert')
    ).toHaveText(/at most 10/i);
    expect(await getBlogPostMeta(post.blogPostId)).toEqual({});
  });

  test('storefront blogPostView page data exposes the value via the metafields field', async ({
    page
  }) => {
    await setBlogPostMeta(post.blogPostId, {
      custom: { e2e_blog_text: 'storefront-visible-value' }
    });

    await page.goto(`/blogPost/${post.uuid}`);
    // Dev renders client-side; eContext carries the merged page query either
    // way, and the master's query now selects `metafields { ... }`.
    const exposed = await page.evaluate(() =>
      JSON.stringify((window as any).eContext?.graphqlResponse ?? {})
    );
    expect(exposed).toContain('storefront-visible-value');
    expect(exposed).toContain('e2e_blog_text');
  });
});
