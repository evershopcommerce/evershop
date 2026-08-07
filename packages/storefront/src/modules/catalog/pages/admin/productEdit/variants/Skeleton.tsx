import React from 'react';

interface SkeletonProps {
  rows?: number;
  className?: string;
}

const SkeletonRow: React.FC = () => (
  <tr className="border-b border-gray-200">
    <td className="p-2">
      <div className="w-7 h-7 bg-gray-200 rounded animate-pulse" />
    </td>
    <td className="p-2">
      <div className="w-5 h-4 bg-gray-200 rounded animate-pulse" />
    </td>
    <td className="p-2">
      <div className="w-7 h-4 bg-gray-200 rounded animate-pulse" />
    </td>
    <td className="p-2">
      <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
    </td>
    <td className="p-2">
      <div className="w-10 h-4 bg-gray-200 rounded animate-pulse" />
    </td>
    <td className="p-2">
      <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
    </td>
    <td className="p-2">
      <div className="w-10 h-4 bg-gray-200 rounded animate-pulse" />
    </td>
    <td className="p-2">
      <div className="w-7 h-5 bg-gray-200 rounded animate-pulse" />
    </td>
  </tr>
);

export const Skeleton: React.FC<SkeletonProps> = ({
  rows = 5,
  className = ''
}) => {
  return (
    <div className={`w-full ${className}`}>
      <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
        <tbody>
          {Array.from({ length: rows }, (_, index) => (
            <SkeletonRow key={index} />
          ))}
        </tbody>
      </table>
    </div>
  );
};
