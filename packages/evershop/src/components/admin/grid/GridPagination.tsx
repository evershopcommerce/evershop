import { Button } from '@components/common/ui/Button.js';
import { ButtonGroup } from '@components/common/ui/ButtonGroup.js';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@components/common/ui/Pagination.js';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@components/common/ui/Select.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export interface GridPaginationProps {
  total: number;
  limit: number;
  page: number;
}

export function GridPagination({ total, limit, page }: GridPaginationProps) {
  const limitInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (limitInput.current) {
      limitInput.current.value = limit.toString();
    }
  }, []);

  const onKeyPress = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.preventDefault();
    let pageNumber = parseInt(e.target.value, 10);
    if (page < 1) pageNumber = 1;
    if (page > Math.ceil(total / limit)) pageNumber = Math.ceil(total / limit);
    const url = new URL(window.location.href);
    url.searchParams.set('page', pageNumber.toString());
    window.location.href = url.href;
  };

  const onPrev = (e: React.MouseEvent) => {
    e.preventDefault();
    const prev = page - 1;
    if (page === 1) return;
    const url = new URL(window.location.href);
    url.searchParams.set('page', prev.toString());
    window.location.href = url.href;
  };

  const onNext = (e: React.MouseEvent) => {
    e.preventDefault();
    const next = page + 1;
    if (page * limit >= total) return;
    const url = new URL(window.location.href);
    url.searchParams.set('page', next.toString());
    window.location.href = url.href;
  };

  const onFirst = (e: React.MouseEvent) => {
    e.preventDefault();
    if (page === 1) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('page');
    window.location.href = url.href;
  };

  const onLast = (e: React.MouseEvent) => {
    e.preventDefault();
    if (page === Math.ceil(total / limit)) return;
    const url = new URL(window.location.href);
    url.searchParams.set('page', Math.ceil(total / limit).toString());
    window.location.href = url.href;
  };

  return (
    <div className="pagination flex w-full mt-3">
      <div className="flex justify-between w-full space-x-2">
        <ButtonGroup>
          <Button variant={'outline'}>{_('Show')}</Button>
          <Select
            value={limit.toString()}
            onValueChange={(value) => {
              const url = new URL(window.location.href);
              url.searchParams.set('limit', value?.toString() || '10');
              window.location.href = url.href;
            }}
          >
            <SelectTrigger className="w-20">
              <SelectValue>{limit}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{_('Limit')}</SelectLabel>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="150">150</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </ButtonGroup>
        <div className="flex justify-end">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={(e) => {
                    onPrev(e);
                  }}
                />
              </PaginationItem>
              {page > 1 && (
                <PaginationItem>
                  <PaginationLink
                    isActive={page === 1}
                    onClick={(e) => {
                      onFirst(e);
                    }}
                  >
                    1
                  </PaginationLink>
                </PaginationItem>
              )}
              {page >= 3 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink isActive={true}>{page}</PaginationLink>
              </PaginationItem>
              {page < Math.ceil(total / limit) - 1 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              {page * limit < total && (
                <PaginationItem>
                  <PaginationLink
                    isActive={page === Math.ceil(total / limit)}
                    onClick={(e) => {
                      onLast(e);
                    }}
                  >
                    {Math.ceil(total / limit)}
                  </PaginationLink>
                </PaginationItem>
              )}
              <PaginationNext onClick={onNext} />
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}
