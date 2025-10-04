
import { Role, Table, Order, Product, Category, Ingredient, OrderItem, RecipeItem, DashboardStats, DashboardPeriod, SalesDataPoint, NotificationCounts, DailyReport, SoldProduct, Sale, RoleLogin, SiteContent } from '../../types';
import { ROLE_HOME_PAGE_META_KEY } from '../../constants';

export type SupabasePermissions = Role['permissions'] & {
  [key in typeof ROLE_HOME_PAGE_META_KEY]?: string;
};

export type SupabaseRoleRow = {
  id: string;
  name: string;
  pin?: string | null;
  permissions: SupabasePermissions | null;
};

export type SupabaseTableRow = {
  id: string;
  nom: string;
  capacite: number;
  statut: Table['statut'];
  commande_id: string | null;
  couverts: number | null;
};

export type SupabaseOrderMetaRow = {
  id: string;
  estado_cocina: Order['estado_cocina'];
  date_envoi_cuisine: string | null;
};

export type SupabaseRecipeRow = {
  ingredient_id: string;
  qte_utilisee: number;
};

export type SupabaseProductRow = {
  id: string;
  nom_produit: string;
  description: string | null;
  prix_vente: number;
  categoria_id: string;
  estado: Product['estado'];
  image: string | null;
  is_best_seller: boolean | null | undefined;
  best_seller_rank: number | null | undefined;
  product_recipes: SupabaseRecipeRow[] | null;
};

export type SupabaseIngredientRow = {
  id: string;
  nom: string;
  unite: Ingredient['unite'];
  stock_minimum: number;
  stock_actuel: number;
  prix_unitaire: number;
};

export type SupabaseCategoryRow = {
  id: string;
  nom: string;
};

export type SupabaseOrderItemRow = {
  id: string;
  order_id: string;
  produit_id: string;
  nom_produit: string;
  prix_unitaire: number;
  quantite: number;
  excluded_ingredients: string[] | null;
  commentaire: string | null;
  estado: OrderItem['estado'];
  date_envoi: string | null;
};

export type SupabaseOrderRow = {
  id: string;
  type: Order['type'];
  table_id: string | null;
  table_nom: string | null;
  couverts: number | null;
  statut: Order['statut'];
  estado_cocina: Order['estado_cocina'];
  date_creation: string;
  date_envoi_cuisine: string | null;
  date_listo_cuisine: string | null;
  date_servido: string | null;
  payment_status: Order['payment_status'];
  total: number | null;
  profit: number | null;
  payment_method: Order['payment_method'] | null;
  payment_receipt_url: string | null;
  client_nom: string | null;
  client_telephone: string | null;
  client_adresse: string | null;
  receipt_url: string | null;
  order_items: SupabaseOrderItemRow[] | null;
};

export type SupabaseSaleRow = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  category_id: string;
  category_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit_cost: number;
  total_cost: number;
  profit: number;
  payment_method: Order['payment_method'] | null;
  sale_date: string;
};

export type SupabaseSiteContentRow = {
  id: string;
  content: Partial<SiteContent> | null;
  updated_at: string | null;
};

export type SalesPeriod = {
  start?: Date | string;
  end?: Date | string;
};

export type SupabaseResponse<T> = {
  data: T;
  error: { message: string } | null;
  status?: number;
};

export type TablePayload = {
  nom: string;
  capacite: number;
  couverts?: number | null;
};

export type TableUpdatePayload = Partial<TablePayload>;

export type EventCallback = () => void;

