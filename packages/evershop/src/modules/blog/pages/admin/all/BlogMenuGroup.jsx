import { NavigationItemGroup } from '@components/admin/NavigationItemGroup';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { FolderTree, MessageSquare, Newspaper, Tags } from 'lucide-react';
import PropTypes from 'prop-types';
import React from 'react';

export default function BlogMenuGroup({
  blogPostGrid,
  blogCategoryGrid,
  blogTagGrid,
  blogCommentGrid
}) {
  return (
    <NavigationItemGroup
      id="blogMenuGroup"
      name={_('Blog')}
      items={[
        {
          Icon: Newspaper,
          url: blogPostGrid,
          title: _('Posts')
        },
        {
          Icon: FolderTree,
          url: blogCategoryGrid,
          title: _('Categories')
        },
        {
          Icon: Tags,
          url: blogTagGrid,
          title: _('Tags')
        },
        {
          Icon: MessageSquare,
          url: blogCommentGrid,
          title: _('Comments')
        }
      ]}
    />
  );
}

BlogMenuGroup.propTypes = {
  blogPostGrid: PropTypes.string.isRequired,
  blogCategoryGrid: PropTypes.string.isRequired,
  blogTagGrid: PropTypes.string.isRequired,
  blogCommentGrid: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 25
};

export const query = `
  query Query {
    blogPostGrid: url(routeId: "blogPostGrid")
    blogCategoryGrid: url(routeId: "blogCategoryGrid")
    blogTagGrid: url(routeId: "blogTagGrid")
    blogCommentGrid: url(routeId: "blogCommentGrid")
  }
`;
