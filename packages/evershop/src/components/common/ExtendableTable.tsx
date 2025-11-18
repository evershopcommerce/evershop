import Area from '@components/common/Area.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export interface TableColumn<T = any> {
  key: string;
  header: {
    label: React.ReactNode;
    className?: string;
  };
  sortable?: boolean;
  width?: string;
  className?: string;
  isRemoved?: boolean;
  render?: (row: T, rowIndex?: number, loading?: boolean) => React.ReactNode;
}

export interface TableContextValue<T = any> {
  columns: TableColumn<T>[];
  setColumns: React.Dispatch<React.SetStateAction<TableColumn<T>[]>>;
  tableData: T[];
  currentSort?: { key: string; direction: 'asc' | 'desc' };
  addColumnBefore: (newColumn: TableColumn<T>, beforeColumnKey: string) => void;
  addColumnAfter: (newColumn: TableColumn<T>, afterColumnKey: string) => void;
  removeColumn: (key: string) => void;
  tableName: string;
}

interface TableProviderProps<T = any> {
  children: React.ReactNode;
  name: string;
  initialColumns: TableColumn<T>[];
  tableData: T[];
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  currentSort?: { key: string; direction: 'asc' | 'desc' };
}

const TableContext = React.createContext<TableContextValue | null>(null);

export function useTableContext<T = any>(): TableContextValue<T> {
  const context = React.useContext(TableContext);
  if (!context) {
    throw new Error('useTableContext must be used within a TableProvider');
  }
  return context as TableContextValue<T>;
}

export function TableProvider<T = any>({
  children,
  name,
  initialColumns,
  tableData,
  onSort,
  currentSort
}: TableProviderProps<T>) {
  const [columns, setColumns] =
    React.useState<TableColumn<T>[]>(initialColumns);

  // Update columns when props change
  React.useEffect(() => {
    setColumns(initialColumns.map((col) => ({ ...col })));
  }, [initialColumns]);

  const addColumnBefore = React.useCallback(
    (newColumn: TableColumn<T>, beforeColumnKey: string) => {
      setColumns((cols) => {
        // Find index of the column to insert before
        const index = cols.findIndex((col) => col.key === beforeColumnKey);
        // If found, insert before it (index), else add to the start
        const position = index !== -1 ? index : 0;
        return [...cols.slice(0, position), newColumn, ...cols.slice(position)];
      });
    },
    []
  );

  const addColumnAfter = React.useCallback(
    (newColumn: TableColumn<T>, afterColumnKey: string) => {
      setColumns((cols) => {
        // Find index of the column to insert after
        const index = cols.findIndex((col) => col.key === afterColumnKey);
        // If found, insert after it (index + 1), else add to the end
        const position = index !== -1 ? index + 1 : cols.length;
        return [...cols.slice(0, position), newColumn, ...cols.slice(position)];
      });
    },
    []
  );

  const removeColumn = React.useCallback((key: string) => {
    setColumns((cols) =>
      cols.map((col) => (col.key === key ? { ...col, isRemoved: true } : col))
    );
  }, []);

  const contextValue: TableContextValue<T> = {
    columns,
    setColumns,
    tableData,
    currentSort,
    addColumnBefore,
    addColumnAfter,
    removeColumn,
    tableName: name
  };

  return (
    <TableContext.Provider value={contextValue as TableContextValue}>
      {children}
    </TableContext.Provider>
  );
}

interface ExtendableTableProps<T = any> {
  name: string;
  columns: TableColumn<T>[];
  initialData: T[];
  loading?: boolean;
  noHeader?: boolean;
  emptyMessage?: string;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  currentSort?: { key: string; direction: 'asc' | 'desc' };
  className?: string;
}

export function ExtendableTable<T = any>({
  name,
  columns,
  initialData,
  loading = false,
  noHeader = false,
  emptyMessage = _('No data available'),
  onSort,
  currentSort,
  className = ''
}: ExtendableTableProps<T>) {
  const handleSort = (key: string) => {
    if (!onSort) return;

    const direction =
      currentSort?.key === key && currentSort.direction === 'asc'
        ? 'desc'
        : 'asc';
    onSort(key, direction);
  };

  return (
    <TableProvider
      name={name}
      initialColumns={columns}
      tableData={initialData}
      onSort={onSort}
      currentSort={currentSort}
    >
      <TableContent
        loading={loading}
        noHeader={noHeader}
        onSort={onSort}
        currentSort={currentSort}
        emptyMessage={emptyMessage}
        className={className}
      />
    </TableProvider>
  );
}

// Separate component to use the context
function TableContent<T = any>({
  loading = false,
  noHeader = false,
  onSort,
  currentSort,
  emptyMessage,
  className
}: {
  loading?: boolean;
  noHeader?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  currentSort?: { key: string; direction: 'asc' | 'desc' };
  emptyMessage: string;
  className: string;
}) {
  const { columns, tableData, tableName } = useTableContext<T>();

  const handleSort = (key: string) => {
    if (!onSort) return;

    const direction =
      currentSort?.key === key && currentSort.direction === 'asc'
        ? 'desc'
        : 'asc';
    onSort(key, direction);
  };

  return (
    <>
      <Area id={'shoppingCartItems'} />
      <table className={className}>
        {!noHeader && (
          <thead>
            <tr>
              {columns
                .filter((col) => !col.isRemoved)
                .map((col) => (
                  <th
                    key={col.key}
                    className={`${col.header.className} ${
                      col.sortable ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => col.sortable && handleSort(col.key)}
                    style={{ width: col.width }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{col.header.label}</span>
                      {col.sortable && currentSort?.key === col.key && (
                        <span className="text-blue-500">
                          {currentSort.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-gray-200">
          {tableData.length === 0 ? (
            <tr>
              <td colSpan={columns.filter((col) => !col.isRemoved).length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            tableData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns
                  .filter((col) => !col.isRemoved)
                  .map((col) => (
                    <td
                      key={col.key}
                      className={col.className}
                      style={{ width: col.width }}
                    >
                      {col.render
                        ? col.render(row, rowIndex, loading)
                        : row[col.key]}
                    </td>
                  ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}
