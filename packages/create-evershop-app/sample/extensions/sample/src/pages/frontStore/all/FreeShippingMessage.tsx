import React from 'react';

export default function FreeShippingMessage() {
  return (
    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 relative overflow-hidden">
      <div className="container mx-auto text-center relative z-10">
        <p className="font-medium flex items-center justify-center gap-2">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            <path d="M3 4a1 1 0 00-1 1v1a1 1 0 001 1h1l1.68 5.39A3 3 0 008.38 15H15a1 1 0 000-2H8.38a1 1 0 01-.97-.76L6.16 9H15a1 1 0 00.95-.68L17.2 4H3z" />
          </svg>
          <span>🚚 Free shipping on orders over $50!</span>
          <span className="hidden sm:inline text-green-100">
            ✨ No minimum required
          </span>
        </p>
      </div>

      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-white rounded-full -translate-y-16"></div>
        <div className="absolute bottom-0 right-1/3 w-24 h-24 bg-white rounded-full translate-y-12"></div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'body',
  sortOrder: 0
};
