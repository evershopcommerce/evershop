import { useModal } from '@components/common/modal/useModal.js';
import React from 'react';
import { Method, ShippingMethod } from './Method.js';
import { MethodForm } from './MethodForm.js';

export interface MethodsProps {
  methods: Array<ShippingMethod>;
  reload: () => void;
  addMethodApi: string;
}

export function Methods({ reload, methods, addMethodApi }: MethodsProps) {
  const modal = useModal();
  return (
    <div className="my-8">
      <table className="border-collapse divide-y">
        <thead>
          <tr>
            <th className="border-none">Method</th>
            <th className="border-none">Status</th>
            <th className="border-none">Cost</th>
            <th className="border-none">Condition</th>
            <th className="border-none">Action</th>
          </tr>
        </thead>
        <tbody>
          {methods.map((method) => (
            <tr key={method.methodId} className="border-divider py-8">
              <Method method={method} reload={reload} />
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4">
        <a
          href="#"
          className="text-interactive"
          onClick={(e) => {
            e.preventDefault();
            modal.open();
          }}
        >
          + Add Method
        </a>
      </div>
      <modal.Content title="Add Method">
        <MethodForm
          saveMethodApi={addMethodApi}
          onSuccess={() => modal.close()}
          reload={reload}
        />
      </modal.Content>
    </div>
  );
}
