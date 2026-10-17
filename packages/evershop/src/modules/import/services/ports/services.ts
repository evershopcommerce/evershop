import type { EditorRow } from '../cells/description.js';

/**
 * What the category services take, in the form they want it (§ 4.1): numbers as
 * strings where the core pattern checks strings, ids as strings of digits. Only
 * the fields that are given are present: on an update a missing field stays as
 * it is.
 */
export interface CategoryWrite {
  name?: string;
  url_key?: string;
  status?: 0 | 1;
  position?: string;
  description?: EditorRow[];
  meta_title?: string;
  meta_description?: string;
  /** The path that `uploadFile` returned. */
  image?: string;
  /** The `category_id` of the parent, as a string of digits. */
  parent_id?: string;
}

/**
 * The writes: the existing core services behind one object (§ 4.5, point 2), so
 * that a test replaces all of them. An error they throw is a failed row, and the
 * run goes on. The real one is made from `createCategory` and `updateCategory`;
 * the test doubles are `MemoryServices` and `RecordingServices`.
 *
 * Each call is one short transaction, owned by the service.
 */
export interface EntityServices {
  createCategory(input: CategoryWrite): Promise<{ id: number; uuid: string }>;
  updateCategory(uuid: string, input: CategoryWrite): Promise<void>;
}
