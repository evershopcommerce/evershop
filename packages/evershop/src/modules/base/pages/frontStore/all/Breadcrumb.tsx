import React from 'react';

interface BreadcrumbProps {
  pageInfo: {
    breadcrumbs: Array<{
      title: string;
      url: string;
    }>;
  };
}

function Breadcrumb({ pageInfo: { breadcrumbs } }: BreadcrumbProps) {
  return breadcrumbs.length ? (
    <div className="page-width">
      <div className="breadcrumb py-5">
        {breadcrumbs.map((breadcrumb, index) =>
          index === breadcrumbs.length - 1 ? (
            <span key={index}>{breadcrumb.title}</span>
          ) : (
            <span key={index}>
              <a href={breadcrumb.url} className="text-interactive">
                {breadcrumb.title}
              </a>
              <span>{' / '}</span>
            </span>
          )
        )}
      </div>
    </div>
  ) : null;
}

export const query = `
  query query {
    pageInfo {
      breadcrumbs {
        title
        url
      }
    }
  }
`;

export const layout = {
  areaId: 'content',
  sortOrder: 0
};

export default Breadcrumb;
