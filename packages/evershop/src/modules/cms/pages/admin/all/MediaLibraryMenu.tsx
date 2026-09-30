import { FileBrowser } from '@components/admin/FileBrowser.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Images } from 'lucide-react';
import React from 'react';

/**
 * "Media library" in the CMS menu — an overlay, not a page.
 *
 * It opens the same full-screen browser the image pickers use, over whatever
 * is on screen. Navigating to a page to look at the media folder would mean
 * leaving a half-edited product to do it, and coming back afterwards; this
 * closes and the page is still there, untouched.
 *
 * Registered into the `cmsMenuGroup` Area rather than added to
 * `CmsMenuGroup`'s item list, because that list builds `NavigationItem`s,
 * which are links. A menu entry that opens something in place has to be its
 * own component, and the Area is the seam for exactly that.
 *
 * `close` is passed and `onInsert` is not: the browser can be dismissed, but
 * there is nowhere to insert a file into from here, so it draws no Insert
 * button.
 */
export default function MediaLibraryMenu() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* An anchor rather than a button so it inherits the sibling items'
          styling exactly; the href is inert and the click is handled. */}
      <li className="nav-item">
        <a
          href="#"
          className="flex justify-left"
          onClick={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
        >
          <i className="menu-icon">
            <Images />
          </i>
          {_('Media library')}
        </a>
      </li>
      {open && <FileBrowser isMultiple={false} close={() => setOpen(false)} />}
    </>
  );
}

// Last in the group, after Pages, Widgets and Contact messages. The note goes
// ABOVE the export, never inside the object: the layout is read by REGEX from
// the compiled file text, and anything between the braces the pattern does not
// expect — a comment most of all — drops the component from the scan with no
// error and no warning. It simply never renders.
export const layout = {
  areaId: 'cmsMenuGroup',
  sortOrder: 100
};
