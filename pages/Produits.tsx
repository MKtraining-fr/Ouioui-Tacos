import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { uploadProductImage, resolveProductImageUrl } from '../services/cloudinary';
import { Product, Category, Ingredient, RecipeItem } from '../types';
import Modal from '../components/Modal';
import { PlusCircle, Edit, Trash2, Search, Settings, GripVertical, CheckCircle, Clock, XCircle, MoreVertical, Upload, HelpCircle } from 'lucide-react';
import { formatCurrencyCOP, formatIntegerAmount } from '../utils/formatIntegerAmount';

const BEST_SELLER_RANKS = [1, 2, 3, 4, 5, 6];

const getStatusInfo = (status: Product['estado']) => {
    switch (status) {
        case 'disponible':
            return { text: 'Disponible', color: 'bg-green-100 text-green-800', Icon: CheckCircle };
        case 'agotado_temporal':
            return { text: 'Rupture (Temp.)', color: 'bg-yellow-100 text-yellow-800', Icon: Clock };
        case 'agotado_indefinido':
            return { text: 'Indisponible', color: 'bg-red-100 text-red-800', Icon: XCircle };
        default:
            return { text: 'Inconnu', color: 'bg-gray-100 text-gray-800', Icon: HelpCircle };
    }
};

// --- Main Page Component ---
const Produits: React.FC = () => {
    const { role } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    const [isProductModalOpen, setProductModalOpen] = useState(false);
    const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

    const canEdit = role?.permissions['/produits'] === 'editor';

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [productsData, categoriesData, ingredientsData] = await Promise.all([
                api.getProducts(),
                api.getCategories(),
                api.getIngredients()
            ]);
            setProducts(productsData);
            setCategories(categoriesData);
            setIngredients(ingredientsData);
            setError(null);
        } catch (err) {
            setError("Impossible de charger les données des produits.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredProducts = useMemo(() =>
        products.filter(p =>
            (p.nom_produit.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (categoryFilter === 'all' || p.categoria_id === categoryFilter)
        ), [products, searchTerm, categoryFilter]);

    const occupiedBestSellerPositions = useMemo(() => {
        const map = new Map<number, Product>();
        products.forEach(prod => {
            if (prod.is_best_seller && prod.best_seller_rank != null) {
                map.set(prod.best_seller_rank, prod);
            }
        });
        return map;
    }, [products]);

    const handleOpenModal = (type: 'product' | 'category' | 'delete', mode: 'add' | 'edit' = 'add', product: Product | null = null) => {
        if (type === 'product') {
            setModalMode(mode);
            setSelectedProduct(product);
            setProductModalOpen(true);
        } else if (type === 'category') {
            setCategoryModalOpen(true);
        } else if (type === 'delete' && product) {
            setSelectedProduct(product);
            setDeleteModalOpen(true);
        }
    };
    
    const handleStatusChange = async (product: Product, newStatus: Product['estado']) => {
        try {
            await api.updateProduct(product.id, { estado: newStatus });
            fetchData();
        } catch (error) {
            console.error("Failed to update status", error);
            const message = error instanceof Error ? error.message : "Une erreur inconnue s'est produite.";
            alert(`Échec de la mise à jour du statut du produit : ${message}`);
        }
    }

    if (loading) return <p className="text-gray-800">Chargement des produits...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="space-y-6">
            <div className="mt-6 ui-card p-4 flex flex-col lg:flex-row justify-between items-center gap-4">
                <div className="flex flex-col md:flex-row gap-4 w-full">
                    <div className="relative flex-grow md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Rechercher un produit..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="ui-input pl-10"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="ui-select md:w-56"
                    >
                        <option value="all">Toutes les catégories</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.nom}</option>)}
                    </select>
                </div>
                {canEdit && (
                    <div className="flex gap-2 w-full lg:w-auto">
                        <button onClick={() => setCategoryModalOpen(true)} className="flex-1 lg:flex-initial ui-btn-secondary">
                            <Settings size={20} />
                        </button>
                        <button onClick={() => handleOpenModal('product', 'add')} className="flex-1 lg:flex-initial ui-btn-primary">
                            <PlusCircle size={20} />
                            Ajouter Produit
                        </button>
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map(p => (
                    <ProductCard 
                        key={p.id} 
                        product={p} 
                        category={categories.find(c => c.id === p.categoria_id)}
                        onEdit={() => handleOpenModal('product', 'edit', p)}
                        onDelete={() => handleOpenModal('delete', 'edit', p)}
                        onStatusChange={handleStatusChange}
                        canEdit={canEdit}
                    />
                ))}
            </div>

            {isProductModalOpen && canEdit && (
                <AddEditProductModal
                    isOpen={isProductModalOpen}
                    onClose={() => setProductModalOpen(false)}
                    onSuccess={fetchData}
                    product={selectedProduct}
                    mode={modalMode}
                    categories={categories}
                    ingredients={ingredients}
                    occupiedPositions={occupiedBestSellerPositions}
                />
            )}
            {isCategoryModalOpen && canEdit && (
                <ManageCategoriesModal
                    isOpen={isCategoryModalOpen}
                    onClose={() => setCategoryModalOpen(false)}
                    onSuccess={fetchData}
                    categories={categories}
                />
            )}
             {isDeleteModalOpen && canEdit && selectedProduct && (
                <DeleteProductModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    onSuccess={fetchData}
                    product={selectedProduct}
                />
            )}
        </div>
    );
});


// --- Child Components ---

const ProductCard = React.memo(({ product, category, onEdit, onDelete, onStatusChange, canEdit }: { product: Product; category?: Category; onEdit: () => void; onDelete: () => void; onStatusChange: (product: Product, newStatus: Product["estado"]) => void; canEdit: boolean; }) => {
    const { text, color, Icon } = getStatusInfo(product.estado);
    const [menuOpen, setMenuOpen] = useState(false);
    
    const margin = product.prix_vente - (product.cout_revient || 0);
    const marginPercentage = product.prix_vente > 0 ? (margin / product.prix_vente) * 100 : 0;

    return (
        <div className="ui-card flex flex-col overflow-hidden">
            <div className="relative">
                <img src={resolveProductImageUrl(product.image, 300, 160)} alt={product.nom_produit} className="w-full h-40 object-cover" />
                {product.is_best_seller && (
                    <span className="absolute top-2 left-2 rounded-full bg-brand-primary/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-md">
                        Best seller{product.best_seller_rank ? ` #${product.best_seller_rank}` : ''}
                    </span>
                )}
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs text-gray-500">{category?.nom || 'Sans catégorie'}</p>
                        <h3 className="font-bold text-lg text-gray-900">{product.nom_produit}</h3>
                    </div>
                <p className="text-xl font-extrabold text-brand-primary">{formatCurrencyCOP(product.prix_vente)}</p>
                </div>
                 <p className="text-xs text-gray-600 mt-1 flex-grow">{product.description}</p>
                
                <div className="flex justify-between items-center mt-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1 ${color}`}>
                        <Icon size={14} /> {text}
                    </span>
                    {canEdit && (
                        <div className="relative">
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="p-1 text-gray-500 hover:text-gray-800"
                                aria-haspopup="true"
                                aria-expanded={menuOpen}
                                aria-label="Options du produit"
                            ><MoreVertical size={20} /></button>
                            {menuOpen && (
                                <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                                    <button onClick={() => { onEdit(); setMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Modifier</button>
                                    <button onClick={() => { onDelete(); setMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">Supprimer</button>
                                    <div className="border-t my-1"></div>
                                    <p className="px-4 pt-2 pb-1 text-xs text-gray-500">Changer statut :</p>
                                    {['disponible', 'agotado_temporal', 'agotado_indefinido'].map(status => (
                                        <button key={status} onClick={() => { onStatusChange(product, status as Product['estado']); setMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                            {getStatusInfo(status as Product['estado']).text}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

type ProductFormState = {
    nom_produit: string;
    prix_vente: number;
    categoria_id: string;
    estado: Product['estado'];
    image: string;
    description: string;
    recipe: RecipeItem[];
    is_best_seller: boolean;
    best_seller_rank: number | null;
};

const AddEditProductModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void; product: Product | null; mode: 'add' | 'edit'; categories: Category[]; ingredients: Ingredient[]; occupiedPositions: Map<number, Product>; }> = ({ isOpen, onClose, onSuccess, product, mode, categories, ingredients, occupiedPositions }) => {
    const [formData, setFormData] = useState<ProductFormState>({
        nom_produit: product?.nom_produit || '',
        prix_vente: product?.prix_vente || 0,
        categoria_id: product?.categoria_id || (categories[0]?.id ?? ''),
        estado: product?.estado || 'disponible',
        image: product?.image ?? '',
        description: product?.description || '',
        recipe: product?.recipe || [],
        is_best_seller: product?.is_best_seller ?? false,
        best_seller_rank: product?.best_seller_rank ?? null,
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        setFormData({
            nom_produit: product?.nom_produit || '',
            prix_vente: product?.prix_vente || 0,
            categoria_id: product?.categoria_id || (categories[0]?.id ?? ''),
            estado: product?.estado || 'disponible',
            image: product?.image ?? '',
            description: product?.description || '',
            recipe: product?.recipe || [],
            is_best_seller: product?.is_best_seller ?? false,
            best_seller_rank: product?.best_seller_rank ?? null,
        });
        setImageFile(null);
    }, [isOpen, product, categories]);

    const findFirstAvailablePosition = useCallback(() => {
        for (const rank of BEST_SELLER_RANKS) {
            const occupant = occupiedPositions.get(rank);
            if (!occupant || occupant.id === product?.id) {
                return rank;
            }
        }
        return null;
    }, [occupiedPositions, product?.id]);

    const handleBestSellerToggle = useCallback(
        (checked: boolean) => {
            setFormData(prev => {
                if (checked) {
                    const nextRank = prev.best_seller_rank ?? findFirstAvailablePosition();
                    return { ...prev, is_best_seller: true, best_seller_rank: nextRank ?? null };
                }
                return { ...prev, is_best_seller: false, best_seller_rank: null };
            });
        },
        [findFirstAvailablePosition],
    );

    const handleBestSellerRankChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        setFormData(prev => ({ ...prev, best_seller_rank: value ? Number(value) : null }));
    }, []);

    const ingredientMap = useMemo(() => new Map(ingredients.map(ing => [ing.id, ing])), [ingredients]);

    const recipeCost = useMemo(() => {
        return formData.recipe.reduce((total, item) => {
            const ingredient = ingredientMap.get(item.ingredient_id);
            if (!ingredient) return total;

            let unitPrice = ingredient.prix_unitaire;
            if (ingredient.unite === 'kg' || ingredient.unite === 'L') {
                unitPrice = unitPrice / 1000;
            }

            return total + unitPrice * item.qte_utilisee;
        }, 0);
    }, [formData.recipe, ingredientMap]);

    const marginValue = formData.prix_vente - recipeCost;
    const marginPercentage = formData.prix_vente > 0 ? (marginValue / formData.prix_vente) * 100 : 0;

    const handleRecipeChange = (
        index: number,
        field: keyof RecipeItem,
        value: string | number
    ) => {
        const updatedRecipe = [...formData.recipe];
        const numericValue = typeof value === 'string' ? parseFloat(value) : value;
        if (!isNaN(numericValue)) {
            (updatedRecipe[index] as any)[field] = numericValue;
            setFormData({ ...formData, recipe: updatedRecipe });
        }
    };

    const addRecipeItem = () => {
        setFormData({
            ...formData,
            recipe: [...formData.recipe, { ingredient_id: '', qte_utilisee: 0 }]
        });
    };

    const removeRecipeItem = (index: number) => {
        const updatedRecipe = formData.recipe.filter((_, i) => i !== index);
        setFormData({ ...formData, recipe: updatedRecipe });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            let imageUrl = formData.image;
            if (imageFile) {
                imageUrl = await uploadProductImage(imageFile);
            }

            const productData = {
                ...formData,
                cout_revient: recipeCost,
                image: imageUrl,
            };

            if (mode === 'add') {
                await api.createProduct(productData);
            } else if (product) {
                await api.updateProduct(product.id, productData);
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to save product', error);
            alert('Error saving product');
        } finally {
            setSubmitting(false);
        }
    };

    const availableRanks = BEST_SELLER_RANKS.filter(rank => {
        const occupant = occupiedPositions.get(rank);
        return !occupant || (product && occupant.id === product.id);
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${mode === 'add' ? 'Ajouter' : 'Modifier'} un Produit`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="Nom du produit"
                        value={formData.nom_produit}
                        onChange={e => setFormData({ ...formData, nom_produit: e.target.value })}
                        className="ui-input"
                        required
                    />
                    <input
                        type="number"
                        placeholder="Prix de vente"
                        value={formData.prix_vente}
                        onChange={e => setFormData({ ...formData, prix_vente: parseFloat(e.target.value) || 0 })}
                        className="ui-input"
                        required
                    />
                    <select
                        value={formData.categoria_id}
                        onChange={e => setFormData({ ...formData, categoria_id: e.target.value })}
                        className="ui-select"
                        required
                    >
                        <option value="" disabled>Sélectionner une catégorie</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.nom}</option>)}
                    </select>
                    <select
                        value={formData.estado}
                        onChange={e => setFormData({ ...formData, estado: e.target.value as Product['estado'] })}
                        className="ui-select"
                        required
                    >
                        <option value="disponible">Disponible</option>
                        <option value="agotado_temporal">Rupture (Temp.)</option>
                        <option value="agotado_indefinido">Indisponible</option>
                    </select>
                </div>
                <textarea
                    placeholder="Description"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="ui-textarea"
                />
                <div className="flex items-center gap-4">
                    <input type="file" onChange={handleImageChange} className="ui-input" />
                    {formData.image && !imageFile && <img src={resolveProductImageUrl(formData.image, 50, 50)} alt="Aperçu" className="w-12 h-12 object-cover rounded" />}
                    {imageFile && <img src={URL.createObjectURL(imageFile)} alt="Aperçu" className="w-12 h-12 object-cover rounded" />}
                </div>

                <div className="space-y-2 pt-4 border-t">
                    <h4 className="font-semibold">Recette & Coût de revient</h4>
                    {formData.recipe.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <select
                                value={item.ingredient_id}
                                onChange={e => handleRecipeChange(index, 'ingredient_id', e.target.value)}
                                className="ui-select flex-grow"
                            >
                                <option value="" disabled>Choisir ingrédient</option>
                                {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.nom_ingredient} ({ing.unite})</option>)}
                            </select>
                            <input
                                type="number"
                                placeholder="Quantité"
                                value={item.qte_utilisee}
                                onChange={e => handleRecipeChange(index, 'qte_utilisee', e.target.value)}
                                className="ui-input w-28"
                            />
                            <button type="button" onClick={() => removeRecipeItem(index)} className="ui-btn-danger p-2"><Trash2 size={16} /></button>
                        </div>
                    ))}
                    <button type="button" onClick={addRecipeItem} className="ui-btn-secondary text-sm">Ajouter ingrédient</button>
                    <div className="pt-2 text-sm font-medium text-gray-700">
                        Coût de revient estimé: {formatCurrencyCOP(recipeCost)}
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                        Marge: {formatCurrencyCOP(marginValue)} ({marginPercentage.toFixed(2)}%)
                    </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                    <h4 className="font-semibold">Paramètres Best Seller</h4>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_best_seller_toggle"
                            checked={formData.is_best_seller}
                            onChange={e => handleBestSellerToggle(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                        />
                        <label htmlFor="is_best_seller_toggle" className="text-sm font-medium text-gray-900">Marquer comme Best Seller</label>
                    </div>
                    {formData.is_best_seller && (
                        <select
                            value={formData.best_seller_rank ?? ''}
                            onChange={handleBestSellerRankChange}
                            className="ui-select"
                        >
                            <option value="" disabled>Choisir un rang</option>
                            {availableRanks.map(rank => (
                                <option key={rank} value={rank}>Rang #{rank}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={onClose} className="ui-btn-secondary">Annuler</button>
                    <button type="submit" className="ui-btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                </div>
            </form>
        </Modal>
    );
});

const ManageCategoriesModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void; categories: Category[]; }> = ({ isOpen, onClose, onSuccess, categories }) => {
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isSubmitting, setSubmitting] = useState(false);

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        setSubmitting(true);
        try {
            await api.createCategory({ nom: newCategoryName });
            setNewCategoryName('');
            onSuccess();
        } catch (error) {
            console.error('Failed to add category', error);
            alert('Error adding category');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) return;
        try {
            await api.deleteEntity('categories', id);
            onSuccess();
        } catch (error) {
            console.error('Failed to delete category', error);
            alert('Error deleting category');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gérer les Catégories">
            <div className="space-y-4">
                <div>
                    <h4 className="font-medium mb-2">Catégories existantes</h4>
                    <ul className="space-y-2">
                        {categories.map(cat => (
                            <li key={cat.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                <span>{cat.nom}</span>
                                <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Ajouter une catégorie</h4>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Nom de la nouvelle catégorie"
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            className="ui-input flex-grow"
                        />
                        <button onClick={handleAddCategory} className="ui-btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Ajout...' : 'Ajouter'}
                        </button>
                    </div>
                </div>
                <div className="flex justify-end pt-4">
                    <button type="button" onClick={onClose} className="ui-btn-secondary">Fermer</button>
                </div>
            </div>
        </Modal>
    );
});

const DeleteProductModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void; product: Product; }> = ({ isOpen, onClose, onSuccess, product }) => {
    const [isSubmitting, setSubmitting] = useState(false);

    const handleDelete = async () => {
        setSubmitting(true);
        try {
            await api.deleteEntity('products', product.id);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to delete product', error);
            alert('Error deleting product');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Supprimer le Produit">
            <p>Êtes-vous sûr de vouloir supprimer le produit <strong>{product.nom_produit}</strong> ? Cette action est irréversible.</p>
            <div className="flex justify-end gap-2 pt-4 mt-4">
                <button type="button" onClick={onClose} className="ui-btn-secondary">Annuler</button>
                <button onClick={handleDelete} className="ui-btn-danger" disabled={isSubmitting}>
                    {isSubmitting ? 'Suppression...' : 'Supprimer'}
                </button>
            </div>
        </Modal>
    );
});

export default Produits;
