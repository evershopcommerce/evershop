import { _ } from '@evershop/evershop/lib/locale/translate/_';
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
    <div className="items-center text-center">
      <h3 className="text-xl font-semibold text-muted-foreground">
        {_('No results for "${keyword}"', { keyword })}
      </h3>
      <div className="grid grid-cols-2 mt-2">
        {resourseLinks.map((link, index) => (
          <div
            key={index}
            className="flex space-x-2 justify-center items-center"
          >
            <a href={link.url} className="text-divider hover:underline">
              {link.name}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
