import {
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@components/common/ui/Breadcrumb.js';
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
      <div className="py-5">
        <BreadcrumbRoot>
          <BreadcrumbList>
            {breadcrumbs.map((breadcrumb, index) => (
              <React.Fragment key={index}>
                <BreadcrumbItem>
                  {index === breadcrumbs.length - 1 ? (
                    <BreadcrumbPage>{breadcrumb.title}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={breadcrumb.url}>
                      {breadcrumb.title}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </BreadcrumbRoot>
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
