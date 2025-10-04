import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Product, Category } from '../types';
import { notificationService } from '../services/notificationService';
import Modal from '../components/Modal';
import { PlusIcon, XMarkIcon, CheckIcon, PhotoIcon } from '@heroicons/react/24/outline';
import ProductCard from '../components/ProductCard'; // Import du composant ProductCard

const Products: React.FC = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 0,
    category_id: '',
    image_url: '',
    is_available: true,
    is_best_seller: false,
    best_seller_rank: null,
  });
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const canManageProducts = role?.permissions?.['/produits']?.write;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedProducts = await api.getProducts();
      setProducts(fetchedProducts);
    } catch (err) {
      notificationService.showError("Erreur lors du chargement des produits.");
      setError("Impossible de charger les produits.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const fetchedCategories = await api.getCategories();
      setCategories(fetchedCategories);
    } catch (err) {
      notificationService.showError("Erreur lors du chargement des catégories.");
      setError("Impossible de charger les catégories.");
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setNewProduct(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (name === 'best_seller_rank') {
      setNewProduct(prev => ({ ...prev, [name]: value ? parseInt(value, 10) : null }));
    } else {
      setNewProduct(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
    }
  };

  const resetForm = useCallback(() => {
    setNewProduct({
      name: '',
      description: '',
      price: 0,
      category_id: '',
      image_url: '',
      is_available: true,
      is_best_seller: false,
      best_seller_rank: null,
    });
    setCurrentProduct(null);
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    setFormMode('add');
  }, []);

  const openAddModal = useCallback(() => {
    resetForm();
    setIsModalOpen(true);
  }, [resetForm]);

  const openEditModal = useCallback((product: Product) => {
    setCurrentProduct(product);
    setNewProduct({
      name: product.name,
      description: product.description || '',
      price: product.price,
      category_id: product.category_id || '',
      image_url: product.image_url || '',
      is_available: product.is_available,
      is_best_seller: product.is_best_seller,
      best_seller_rank: product.best_seller_rank || null,
    });
    setImagePreviewUrl(product.image_url || null);
    setFormMode('edit');
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    resetForm();
  }, [resetForm]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let imageUrl = newProduct.image_url;
      if (selectedImageFile) {
        const uploadResult = await api.uploadProductImage(selectedImageFile);
        if (uploadResult) {
          imageUrl = uploadResult.url;
        } else {
          notificationService.showError("Échec du téléchargement de l'image.");
          setLoading(false);
          return;
        }
      }

      const productData = {
        ...newProduct,
        image_url: imageUrl,
        price: parseFloat(newProduct.price.toString()),
        best_seller_rank: newProduct.is_best_seller ? newProduct.best_seller_rank : null,
      };

      if (formMode === 'add') {
        await api.createProduct(productData);
        notificationService.showSuccess("Produit ajouté avec succès !");
      } else if (currentProduct) {
        await api.updateProduct(currentProduct.id, productData);
        notificationService.showSuccess("Produit mis à jour avec succès !");
      }
      closeModal();
      fetchProducts();
    } catch (err) {
      notificationService.showError("Erreur lors de l'enregistrement du produit.");
    } finally {
      setLoading(false);
    }
  }, [formMode, newProduct, selectedImageFile, currentProduct, closeModal, fetchProducts]);

  const handleDeleteProduct = useCallback(async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
      setLoading(true);
      try {
        await api.deleteProduct(id);
        notificationService.showSuccess("Produit supprimé avec succès !");
        fetchProducts();
      } catch (err) {
        notificationService.showError("Erreur lors de la suppression du produit.");
      } finally {
        setLoading(false);
      }
    }
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (filterCategory !== 'all') {
      filtered = filtered.filter(product => product.category_id === filterCategory);
    }
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  }, [products, filterCategory, searchTerm]);

  if (loading) {
    return <div className="text-center py-8">Chargement des produits...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestion des Produits</h1>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
        <div className="flex space-x-4">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary"
            aria-label="Filtrer par catégorie"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-2 border border-gray-300 rounded-md shadow-sm p-2 focus:ring-brand-primary focus:border-brand-primary"
            aria-label="Champ de recherche de produit"
          />
        </div>
        {canManageProducts && (
          <button
            onClick={openAddModal}
            className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md shadow-sm hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-opacity-50"
            aria-label="Ajouter un nouveau produit"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Ajouter Produit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.length > 0 ? (
          filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} openEditModal={openEditModal} handleDeleteProduct={handleDeleteProduct} canManageProducts={canManageProducts} />
          ))
        ) : (
          <p className="col-span-full text-center text-gray-500">Aucun produit trouvé.</p>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={formMode === 'add' ? 'Ajouter un Produit' : 'Modifier le Produit'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom</label>
            <input
              type="text"
              name="name"
              id="name"
              value={newProduct.name}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-brand-primary focus:border-brand-primary"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              id="description"
              value={newProduct.description}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-brand-primary focus:border-brand-primary"
            ></textarea>
          </div>
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">Prix</label>
            <input
              type="number"
              name="price"
              id="price"
              value={newProduct.price}
              onChange={handleInputChange}
              required
              min="0"
              step="0.01"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-brand-primary focus:border-brand-primary"
            />
          </div>
          <div>
            <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">Catégorie</label>
            <select
              name="category_id"
              id="category_id"
              value={newProduct.category_id}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-brand-primary focus:border-brand-primary"
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="image_url" className="block text-sm font-medium text-gray-700">Image</label>
            <div className="mt-1 flex items-center space-x-4">
              {imagePreviewUrl && (
                <img src={imagePreviewUrl} alt="Aperçu" className="h-20 w-20 object-cover rounded-md" />
              )}
              <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-primary">
                <PhotoIcon className="h-5 w-5 inline-block mr-2" />
                <span>{selectedImageFile ? selectedImageFile.name : (newProduct.image_url ? 'Changer l\'image' : 'Télécharger une image')}</span>
                <input id="image_url" name="image_url" type="file" className="sr-only" onChange={handleImageChange} accept="image/*" />
              </label>
              {imagePreviewUrl && !selectedImageFile && (
                <button
                  type="button"
                  onClick={() => {
                    setNewProduct(prev => ({ ...prev, image_url: '' }));
                    setImagePreviewUrl(null);
                  }}
                  className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                  aria-label="Supprimer l'image existante"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center">
            <input
              id="is_available"
              name="is_available"
              type="checkbox"
              checked={newProduct.is_available}
              onChange={handleInputChange}
              className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded"
            />
            <label htmlFor="is_available" className="ml-2 block text-sm text-gray-900">Disponible</label>
          </div>
          <div className="flex items-center">
            <input
              id="is_best_seller"
              name="is_best_seller"
              type="checkbox"
              checked={newProduct.is_best_seller}
              onChange={handleInputChange}
              className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded"
            />
            <label htmlFor="is_best_seller" className="ml-2 block text-sm text-gray-900">Meilleure vente</label>
          </div>
          {newProduct.is_best_seller && (
            <div>
              <label htmlFor="best_seller_rank" className="block text-sm font-medium text-gray-700">Rang meilleure vente</label>
              <input
                type="number"
                name="best_seller_rank"
                id="best_seller_rank"
                value={newProduct.best_seller_rank || ''}
                onChange={handleInputChange}
                min="1"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-brand-primary focus:border-brand-primary"
              />
            </div>
          )}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-primary text-white rounded-md shadow-sm text-sm font-medium hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
            >
              <CheckIcon className="h-5 w-5 inline-block mr-2" />
              {formMode === 'add' ? 'Ajouter' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Products;

