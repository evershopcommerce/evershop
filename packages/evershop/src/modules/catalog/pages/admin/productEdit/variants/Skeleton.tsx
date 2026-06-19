import {
  Table,
  TableBody,
  TableCell,
  TableRow
} from '@components/common/ui/Table.js';
import React from 'react';

interface SkeletonProps {
  rows?: number;
  className?: string;
}

const SkeletonRow: React.FC = () => (
  <TableRow>
    <TableCell>
      <div className="w-7 h-7 bg-gray-200 rounded animate-pulse" />
    </TableCell>
    <TableCell>
      <div className="w-5 h-4 bg-gray-200 rounded animate-pulse" />
    </TableCell>
    <TableCell>
      <div className="w-7 h-4 bg-gray-200 rounded animate-pulse" />
    </TableCell>
    <TableCell>
      <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
    </TableCell>
    <TableCell>
      <div className="w-10 h-4 bg-gray-200 rounded animate-pulse" />
    </TableCell>
    <TableCell>
      <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
    </TableCell>
    <TableCell>
      <div className="w-10 h-4 bg-gray-200 rounded animate-pulse" />
    </TableCell>
    <TableCell>
      <div className="w-7 h-5 bg-gray-200 rounded animate-pulse" />
    </TableCell>
  </TableRow>
);

export const Skeleton: React.FC<SkeletonProps> = ({
  rows = 5,
  className = ''
}) => {
  return (
    <div className={`w-full ${className}`}>
      <Table>
        <TableBody>
          {Array.from({ length: rows }, (_, index) => (
            <SkeletonRow key={index} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
