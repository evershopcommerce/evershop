import React from 'react';
type FooListProps = {
    foos?: {
        id: number;
        name: string;
        description: string;
    }[];
};
export default function FooList({ foos }: FooListProps): React.JSX.Element;
export declare const layout: {
    areaId: string;
    sortOrder: number;
};
export declare const query = "\n  query Query {\n    foos {\n      id\n      name\n      description\n    }\n  }\n";
export {};
