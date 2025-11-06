'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Category } from '@prisma/client';
import { Filter } from 'lucide-react';

interface ProductFiltersProps {
  categories: Category[];
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');

  const currentCategory = searchParams.get('category');
  const currentSort = searchParams.get('sort') || 'newest';

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page'); // Reset to page 1
    router.push(`/products?${params.toString()}`);
  };

  const applyPriceFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (minPrice) params.set('minPrice', minPrice);
    else params.delete('minPrice');
    if (maxPrice) params.set('maxPrice', maxPrice);
    else params.delete('maxPrice');
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  };

  const clearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    router.push('/products');
  };

  return (
    <div className="card p-6 sticky top-20">
      <div className="flex items-center gap-2 mb-6">
        <Filter className="h-5 w-5" />
        <h3 className="font-semibold text-lg">Filters</h3>
      </div>

      {/* Sort */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Sort By</label>
        <select
          value={currentSort}
          onChange={(e) => updateFilters('sort', e.target.value)}
          className="input w-full"
        >
          <option value="newest">Newest First</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="name-asc">Name: A to Z</option>
          <option value="name-desc">Name: Z to A</option>
        </select>
      </div>

      {/* Categories */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Category</label>
        <div className="space-y-2">
          <button
            onClick={() => updateFilters('category', '')}
            className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              !currentCategory
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            All Categories
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => updateFilters('category', category.slug)}
              className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                currentCategory === category.slug
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Price Range</label>
        <div className="space-y-2">
          <input
            type="number"
            placeholder="Min Price"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="input w-full"
          />
          <input
            type="number"
            placeholder="Max Price"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="input w-full"
          />
          <button onClick={applyPriceFilter} className="btn-primary w-full">
            Apply Price Filter
          </button>
        </div>
      </div>

      {/* Clear Filters */}
      <button onClick={clearFilters} className="btn-outline w-full">
        Clear All Filters
      </button>
    </div>
  );
}
