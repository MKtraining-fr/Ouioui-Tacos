
import { Role, Table, Order, Product, Category, Ingredient, OrderItem, RecipeItem, SiteContent } from '../../types';
import { ROLE_HOME_PAGE_META_KEY, ROLES, SITE_CUSTOMIZER_PERMISSION_KEY } from '../../constants';
import { resolveSiteContent } from '../../utils/siteContent';
import { resolveZoneFromElement } from '../../components/SitePreviewCanvas';
import { SupabaseRoleRow, SupabaseIngredientRow, SupabaseCategoryRow, SupabaseRecipeRow, SupabaseProductRow, SupabaseOrderItemRow, SupabaseOrderRow, SupabaseSaleRow, SupabaseSiteContentRow, SupabaseTableRow, SupabaseOrderMetaRow, SupabasePermissions } from './supabaseTypes';
import { toNumber, toTimestamp, calculateCost } from './utils';

const extractPermissions = (
  permissions: SupabaseRoleRow["permissions"],
): { permissions: Role["permissions"]; homePage?: string } => {
  if (!permissions) {
    return { permissions: {}, homePage: undefined };
  }

  const { [ROLE_HOME_PAGE_META_KEY]: homePage, ...permissionLevels } = permissions;

  return {
    permissions: permissionLevels as Role["permissions"],
    homePage: typeof homePage === "string" ? homePage : undefined,
  };
};

const mergeHomePageIntoPermissions = (
  permissions: Role["permissions"],
  homePage?: string,
): SupabasePermissions => {
  const payload: SupabasePermissions = { ...permissions };

  if (homePage) {
    payload[ROLE_HOME_PAGE_META_KEY] = homePage;
  } else {
    delete payload[ROLE_HOME_PAGE_META_KEY];
  }

  return payload;
};

const isAdminRoleName = (name?: string | null): boolean => {
  if (!name) {
    return false;
  }

  const normalized = name.trim().toLowerCase();
  return normalized === ROLES.ADMIN || normalized === "administrateur";
};

const withSiteCustomizerPermission = (
  permissions: Role["permissions"],
  roleName?: string | null,
): Role["permissions"] => {
  const normalized: Role["permissions"] = { ...permissions };
  if (!(SITE_CUSTOMIZER_PERMISSION_KEY in normalized)) {
    normalized[SITE_CUSTOMIZER_PERMISSION_KEY] = isAdminRoleName(roleName) ? "editor" : "none";
  }

  return normalized;
};

export const mapRoleRow = (row: SupabaseRoleRow, includePin: boolean): Role => {
  const { permissions, homePage } = extractPermissions(row.permissions);
  const normalizedPermissions = withSiteCustomizerPermission(permissions, row.name);
  const role: Role = {
    id: row.id,
    name: row.name,
    homePage,
    permissions: normalizedPermissions,
  };

  if (includePin && row.pin) {
    role.pin = row.pin;
  }

  return role;
};

export const mapSiteContentRow = (row: SupabaseSiteContentRow | null): SiteContent | null => {
  if (!row?.content) {
    return null;
  }

  return resolveSiteContent(row.content);
};

export const mapIngredientRow = (row: SupabaseIngredientRow): Ingredient => ({
  id: row.id,
  nom: row.nom,
  unite: row.unite,
  stock_minimum: row.stock_minimum,
  stock_actuel: row.stock_actuel,
  prix_unitaire: row.prix_unitaire,
});

export const mapCategoryRow = (row: SupabaseCategoryRow): Category => ({
  id: row.id,
  nom: row.nom,
});

export const mapRecipeRow = (row: SupabaseRecipeRow): RecipeItem => ({
  ingredient_id: row.ingredient_id,
  qte_utilisee: row.qte_utilisee,
});

export const mapProductRow = (row: SupabaseProductRow, ingredientMap?: Map<string, Ingredient>): Product => {
  const recipe = (row.product_recipes ?? []).map(mapRecipeRow);
  const product: Product = {
    id: row.id,
    nom_produit: row.nom_produit,
    description: row.description ?? undefined,
    prix_vente: row.prix_vente,
    categoria_id: row.categoria_id,
    estado: row.estado,
    image: row.image,
    recipe,
    is_best_seller: row.is_best_seller ?? false,
    best_seller_rank: row.best_seller_rank ?? null,
  };

  if (ingredientMap) {
    product.cout_revient = calculateCost(recipe, ingredientMap);
  }

  return product;
};

export const mapOrderItemRow = (row: SupabaseOrderItemRow): OrderItem => ({
  id: row.id,
  produitRef: row.produit_id,
  nom_produit: row.nom_produit,
  prix_unitaire: toNumber(row.prix_unitaire) ?? 0,
  quantite: row.quantite,
  excluded_ingredients: row.excluded_ingredients ?? [],
  commentaire: row.commentaire ?? "",
  estado: row.estado,
  date_envoi: toTimestamp(row.date_envoi),
});

const resolveTableStatut = (
  row: SupabaseTableRow,
  meta?: { estado_cocina?: Order["estado_cocina"] },
): Table["statut"] => {
  if (!row.commande_id) {
    return "Libre";
  }

  if (meta?.estado_cocina === "En attente" || meta?.estado_cocina === "En préparation") {
    return "Occupée - En attente";
  }

  return "Occupée - Servie";
};

export const mapTableRow = (row: SupabaseTableRow, orderMeta?: SupabaseOrderMetaRow): Table => ({
  id: row.id,
  nom: row.nom,
  capacite: row.capacite,
  statut: resolveTableStatut(row, orderMeta),
  commande_id: row.commande_id ?? undefined,
  couverts: row.couverts ?? 0,
});

export const mapDailyReportRow = (row: any): any => ({
  date: row.date,
  totalSales: row.total_sales,
  totalProfit: row.total_profit,
  productsSold: row.products_sold.map((p: any) => ({
    productId: p.product_id,
    productName: p.product_name,
    quantity: p.quantity,
    totalPrice: p.total_price,
  })),
});

export const mapNotificationCountsRow = (row: any): any => ({
  pendingOrders: row.pending_orders,
  kitchenOrders: row.kitchen_orders,
  readyOrders: row.ready_orders,
});

export const mapDashboardStatsRow = (row: any): any => ({
  totalSales: row.total_sales,
  totalProfit: row.total_profit,
  averageOrderValue: row.average_order_value,
  totalOrders: row.total_orders,
  bestSeller: row.best_seller ? { name: row.best_seller.name, sales: row.best_seller.sales } : undefined,
  salesByPaymentMethod: row.sales_by_payment_method || {},
});

export const mapOrderRow = (row: SupabaseOrderRow): Order => {
  const items = (row.order_items ?? []).map(mapOrderItemRow);
  const total = toNumber(row.total);
  const profit = toNumber(row.profit);
  const order: Order = {
    id: row.id,
    type: row.type,
    table_id: row.table_id ?? undefined,
    table_nom: row.table_nom ?? undefined,
    couverts: row.couverts ?? 0,
    statut: row.statut,
    estado_cocina: row.estado_cocina,
    date_creation: toTimestamp(row.date_creation) ?? Date.now(),
    date_envoi_cuisine: toTimestamp(row.date_envoi_cuisine),
    date_listo_cuisine: toTimestamp(row.date_listo_cuisine),
    date_servido: toTimestamp(row.date_servido),
    payment_status: row.payment_status,
    items,
    total: total ?? items.reduce((sum, item) => sum + item.prix_unitaire * item.quantite, 0),
    profit: profit,
    payment_method: row.payment_method ?? undefined,
    payment_receipt_url: row.payment_receipt_url ?? undefined,
    receipt_url: row.receipt_url ?? undefined,
  };

  if (row.client_nom || row.client_telephone || row.client_adresse) {
    order.clientInfo = {
      nom: row.client_nom ?? "",
      telephone: row.client_telephone ?? "",
      adresse: row.client_adresse ?? undefined,
    };
  }

  return order;
};

export const mapSaleRow = (row: SupabaseSaleRow): any => ({
  id: row.id,
  orderId: row.order_id,
  productId: row.product_id,
  productName: row.product_name,
  categoryId: row.category_id,
  categoryName: row.category_name,
  quantity: row.quantity,
  unitPrice: row.unit_price,
  totalPrice: row.total_price,
  unitCost: row.unit_cost,
  totalCost: row.total_cost,
  profit: row.profit,
  paymentMethod: row.payment_method ?? undefined,
  saleDate: toTimestamp(row.sale_date) ?? Date.now(),
});

export { mergeHomePageIntoPermissions };

