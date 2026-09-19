import { expect, test } from '@playwright/test';
import { EditorPage } from '../../pages/EditorPage.js';

/**
 * Editor topbar smoke test.
 *
 * Verifies every interactive control in the editor header is present and
 * in the expected initial state when opening the editor for `homepage`:
 *
 *   - Page selector shows "Home Page".
 *   - Undo / Redo are disabled (no ops yet).
 *   - Publish is disabled (no changes yet).
 *   - Preview, Globals, New changeset are visible + enabled.
 *
 * Catches "did someone break the chrome?" regressions in a single run —
 * cheap because it's a no-state-change test, no DB writes, ~1-2 seconds
 * of wall time.
 */
test.describe('editor / header (chrome)', () => {
  test('topbar controls are visible and in correct initial state', async ({
    page
  }) => {
    const editor = new EditorPage(page);
    await editor.open('homepage');

    // Identity: we opened the homepage editor.
    await expect(editor.pageSelector).toBeVisible();
    await expect(editor.pageSelector).toContainText('Home Page');

    // Mutation history is empty on a fresh open — undo and redo can't
    // do anything yet. They should be disabled, not just invisible.
    await expect(editor.undoButton).toBeVisible();
    await expect(editor.undoButton).toBeDisabled();
    await expect(editor.redoButton).toBeVisible();
    await expect(editor.redoButton).toBeDisabled();

    // Publish stays enabled in draft mode regardless of op count — the
    // dialog itself reports "no changes" when applicable. The only
    // disabled state is while a publish is in flight (`isPublishing`).
    await expect(editor.publishButton).toBeVisible();
    await expect(editor.publishButton).toBeEnabled();

    // These three are always enabled in the editor's home state.
    await expect(editor.previewButton).toBeVisible();
    await expect(editor.previewButton).toBeEnabled();
    await expect(editor.globalsToggle).toBeVisible();
    await expect(editor.globalsToggle).toBeEnabled();
    await expect(editor.newChangesetButton).toBeVisible();
    await expect(editor.newChangesetButton).toBeEnabled();
  });
});
