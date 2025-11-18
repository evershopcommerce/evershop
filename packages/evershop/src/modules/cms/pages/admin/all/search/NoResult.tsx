import { Dot } from '@components/admin/Dot.js';
import React from 'react';

interface NoResultProps {
  keyword: string;
  resourseLinks?: {
    url: string;
    name: string;
  }[];
}

export function NoResult({ keyword = '', resourseLinks = [] }: NoResultProps) {
  return (
    <div className="no-result items-center text-center">
      <h3>
        No results for &quot;
        {keyword}
        &quot;
      </h3>
      <div>TRY OTHER RESOURCES</div>
      <div className="grid grid-cols-2 mt-2">
        {resourseLinks.map((link, index) => (
          <div
            key={index}
            className="flex space-x-2 justify-center items-center"
          >
            <Dot variant="info" />
            <a href={link.url} className="text-divider hover:underline">
              {link.name}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
