import { useMemo, useState } from 'react';

export type FilterableProduct = {
  title: string;
  price: string;
  availableForSale?: boolean;
  brand?: string;
  sizes?: string[];
  minPrice?: number;
};

export type ProductSort = 'featured' | 'price-low' | 'price-high' | 'az';
export type AvailabilityFilter = 'all' | 'in-stock';

export function useProductFilters<T extends FilterableProduct>(products: T[]) {
  const [availability, setAvailability] = useState<AvailabilityFilter>('all');
  const [sort, setSort] = useState<ProductSort>('featured');
  const [minimumPrice, setMinimumPrice] = useState('');
  const [maximumPrice, setMaximumPrice] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  const brands = useMemo(() => [...new Set(products.map((product) => product.brand).filter(Boolean) as string[])].sort(), [products]);
  const sizes = useMemo(() => [...new Set(products.flatMap((product) => product.sizes ?? []))], [products]);
  const visibleProducts = useMemo(() => {
    const parsePrice = (value: string) => Number(value.replace(/[^0-9.]/g, '')) || 0;
    const minimum = minimumPrice ? Number(minimumPrice) : 0;
    const maximum = maximumPrice ? Number(maximumPrice) : Number.POSITIVE_INFINITY;
    const filtered = products.filter((product) => {
      const price = product.minPrice ?? parsePrice(product.price);
      return (availability === 'all' || product.availableForSale) &&
        price >= minimum && price <= maximum &&
        (selectedBrands.length === 0 || Boolean(product.brand && selectedBrands.includes(product.brand))) &&
        (selectedSizes.length === 0 || Boolean(product.sizes?.some((size) => selectedSizes.includes(size))));
    });
    if (sort === 'price-low') return [...filtered].sort((a, b) => (a.minPrice ?? parsePrice(a.price)) - (b.minPrice ?? parsePrice(b.price)));
    if (sort === 'price-high') return [...filtered].sort((a, b) => (b.minPrice ?? parsePrice(b.price)) - (a.minPrice ?? parsePrice(a.price)));
    if (sort === 'az') return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    return filtered;
  }, [availability, maximumPrice, minimumPrice, products, selectedBrands, selectedSizes, sort]);

  const toggleBrand = (value: string) => setSelectedBrands((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  const toggleSize = (value: string) => setSelectedSizes((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  const clearFilters = () => {
    setAvailability('all'); setSort('featured'); setMinimumPrice(''); setMaximumPrice(''); setSelectedBrands([]); setSelectedSizes([]);
  };

  return { availability, setAvailability, sort, setSort, minimumPrice, setMinimumPrice, maximumPrice, setMaximumPrice, selectedBrands, selectedSizes, brands, sizes, visibleProducts, toggleBrand, toggleSize, clearFilters };
}
