import React, { useMemo } from 'react';
import { Product } from '../types';
import { resolveProductImageUrl } from '../services/cloudinary';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ProductCardProps {
  product: Product;
  openEditModal: (product: Product) => void;
  handleDeleteProduct: (id: string) => void;
  canManageProducts: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, openEditModal, handleDeleteProduct, canManageProducts }) => {
  const imageUrl = useMemo(() => resolveProductImageUrl(product.image_url, 200, 200), [product.image_url]);

  return (
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col"
      aria-label={`Produit ${product.name}`}
      tabIndex={0}
    >
      <img
        src={imageUrl}
        alt={product.name}
        className="w-full h-48 object-cover"
        loading="lazy"
      />
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
        <p className="text-gray-600 text-sm flex-grow">{product.description}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-xl text-brand-primary">{product.price.toFixed(2)} €</span>
          {canManageProducts && (
            <div className="flex space-x-2">
              <button
                onClick={() => openEditModal(product)}
                className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                aria-label={`Modifier ${product.name}`}
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDeleteProduct(product.id)}
                className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                aria-label={`Supprimer ${product.name}`}
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProductCard);

