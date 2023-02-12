import React from 'react';

export default function Error() {
  return (
    <div className="text-center">
      <h1>Error</h1>
      <p>
        We are sorry. There was an error processing your payment. Your card was
        not charged. Please try again.
      </p>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};
