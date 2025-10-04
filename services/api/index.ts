
import { supabase } from "../supabaseClient";
import { normalizeCloudinaryImageUrl, resolveProductImageUrl } from "../cloudinary";
import { clearRoleLoginsBefore, fetchRoleLoginsSince, logRoleLogin } from "../roleLogins";

import {
  Role,
  Table,
  Order,
  KitchenTicket,
  Product,
  Category,
  Ingredient,
  OrderItem,
  RecipeItem,
  DashboardStats,
  DashboardPeriod,
  SalesDataPoint,
  NotificationCounts,
  DailyReport,
  SoldProduct,
  Sale,
  RoleLogin,
  SiteContent,
} from "../../types";
import { ROLES, SITE_CUSTOMIZER_PERMISSION_KEY } from "../../constants";
import { sanitizeSiteContentInput } from "../../utils/siteContent";
import { notificationService } from "../notificationService";
import {
  SupabasePermissions,
  SupabaseRoleRow,
  SupabaseOrderMetaRow,
  SupabaseProductRow,
  SupabaseIngredientRow,
  SupabaseCategoryRow,
  SupabaseOrderItemRow,
  SupabaseOrderRow,
  SupabaseSaleRow,
  SupabaseSiteContentRow,
  SalesPeriod,
  SupabaseResponse,
  TablePayload,
  TableUpdatePayload,
  EventCallback,
} from "./supabaseTypes";
import {
  mapRoleRow,
  mapSiteContentRow,
  mapIngredientRow,
  mapCategoryRow,
  mapRecipeRow,
  mapProductRow,
  mapOrderItemRow,
  mapTableRow,
  mapDailyReportRow,
  mapNotificationCountsRow,
  mapDashboardStatsRow,
  mapOrderRow,
  mapSaleRow,
  mergeHomePageIntoPermissions,
} from "./mappers";
import { toTimestamp, isUuid, toNumber } from "./utils";
import {
  SupabaseRoleRowSchema,
  RoleSchema,
  SupabaseTableRowSchema,
  TableSchema,
  TablePayloadSchema,
  TableUpdatePayloadSchema,
  SupabaseIngredientRowSchema,
  IngredientSchema,
  SupabaseCategoryRowSchema,
  CategorySchema,
  SupabaseProductRecipeRowSchema,
  ProductSchema,
  SupabaseOrderItemRowSchema,
  OrderItemSchema,
  SupabaseOrderRowSchema,
  OrderSchema,
  SupabaseSaleRowSchema,
  SaleSchema,
  DailyReportSchema,
  DashboardStatsSchema,
  NotificationCountsSchema,
  SiteContentSchema,
  SupabaseSiteContentRowSchema,
  unwrapValidated,
  unwrapMaybeValidated,
} from "./schemas";

const eventListeners: Record<string, EventCallback[]> = {};

const publishEvent = (event: string) => {
  if (eventListeners[event]) {
    eventListeners[event].forEach((callback) => callback());
  }
};

let ordersRealtimeChannel: ReturnType<typeof supabase.channel> | null = null;

const SITE_CONTENT_TABLE = "site_content";
const SITE_CONTENT_SINGLETON_ID = "default";

const ensureOrdersRealtimeSubscription = () => {
  if (ordersRealtimeChannel || typeof (supabase as { channel?: unknown }).channel !== "function") {
    return;
  }

  try {
    ordersRealtimeChannel = supabase
      .channel("orders-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () =>
        publishEvent("orders_updated"),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => publishEvent("orders_updated"),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurant_tables" },
        () => publishEvent("orders_updated"),
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "CLOSED" || status === "TIMED_OUT") {
          ordersRealtimeChannel = null;
        }
      });
  } catch (error) {
    console.warn("Failed to subscribe to real-time order updates", error);
  }
};





export const api = {
  onOrdersUpdate: (callback: EventCallback) => {
    ensureOrdersRealtimeSubscription();
    eventListeners.orders_updated = [...(eventListeners.orders_updated || []), callback];

    return () => {
      eventListeners.orders_updated = (eventListeners.orders_updated || []).filter((cb) => cb !== callback);
    };
  },

  getRoles: async (): Promise<Role[]> => {
    const response = await supabase.from("roles").select("*");
    const data = unwrapValidated(z.array(SupabaseRoleRowSchema))(response);
    return data.map((row) => mapRoleRow(row, false));
  },

  getRoleById: async (id: string): Promise<Role | null> => {
    const response = await supabase.from("roles").select("*").eq("id", id).single();
    const data = unwrapMaybeValidated(SupabaseRoleRowSchema)(response);
    return data ? mapRoleRow(data, true) : null;
  },

  createRole: async (name: string, permissions: Role["permissions"], pin?: string): Promise<Role> => {
    const payload: Partial<SupabaseRoleRow> = { name, permissions: mergeHomePageIntoPermissions(permissions) };
    if (pin) {
      payload.pin = pin;
    }
    const response = await supabase.from("roles").insert([payload]).select().single();
    const data = unwrapValidated(SupabaseRoleRowSchema)(response);
    return mapRoleRow(data, true);
  },

  updateRole: async (id: string, name: string, permissions: Role["permissions"], pin?: string): Promise<Role> => {
    const payload: Partial<SupabaseRoleRow> = { name, permissions: mergeHomePageIntoPermissions(permissions) };
    if (pin) {
      payload.pin = pin;
    } else {
      payload.pin = null;
    }
    const response = await supabase.from("roles").update(payload).eq("id", id).select().single();
    const data = unwrapValidated(SupabaseRoleRowSchema)(response);
    return mapRoleRow(data, true);
  },

  deleteRole: async (id: string): Promise<void> => {
    const { error } = await supabase.from("roles").delete().eq("id", id);
    if (error) {
      notificationService.showError("Error deleting role:", error);
      throw error;
    }
  },

  getTables: async (page: number = 0, limit: number = 100): Promise<Table[]> => {
    const start = page * limit;
    const end = start + limit - 1;
    const response = await supabase
      .from("restaurant_tables")
      .select("*, orders!left(estado_cocina)")
      .order("nom")
      .range(start, end);
    const data = unwrapValidated(z.array(SupabaseTableRowSchema.extend({ orders: z.array(z.object({ estado_cocina: z.string() })).optional() })))(response);
    return data.map((row) => mapTableRow(row, row.orders?.[0]));
  },

  getTableById: async (id: string): Promise<Table | null> => {
    const response = await supabase
      .from("restaurant_tables")
      .select("*, orders!left(estado_cocina)")
      .eq("id", id)
      .single();
    const data = unwrapMaybeValidated(SupabaseTableRowSchema.extend({ orders: z.array(z.object({ estado_cocina: z.string() })).optional() }))(response);
    return data ? mapTableRow(data, data.orders?.[0]) : null;
  },

  createTable: async (payload: TablePayload): Promise<Table> => {
    const response = await supabase.from("restaurant_tables").insert([payload]).select().single();
    const data = unwrapValidated(SupabaseTableRowSchema)(response);
    return mapTableRow(data);
  },

  updateTable: async (id: string, payload: TableUpdatePayload): Promise<Table> => {
    const response = await supabase.from("restaurant_tables").update(payload).eq("id", id).select().single();
    const data = unwrapValidated(SupabaseTableRowSchema)(response);
    return mapTableRow(data);
  },

  deleteTable: async (id: string): Promise<void> => {
    const { error } = await supabase.from("restaurant_tables").delete().eq("id", id);
    if (error) {
      notificationService.showError("Error deleting table:", error);
      throw error;
    }
  },

  getIngredients: async (): Promise<Ingredient[]> => {
    const response = await supabase.from("ingredients").select("*").order("nom");
    const data = unwrapValidated(z.array(SupabaseIngredientRowSchema))(response);
    return data.map(mapIngredientRow);
  },

  getIngredientById: async (id: string): Promise<Ingredient | null> => {
    const response = await supabase.from("ingredients").select("*").eq("id", id).single();
    const data = unwrapMaybeValidated(SupabaseIngredientRowSchema)(response);
    return data ? mapIngredientRow(data) : null;
  },

  createIngredient: async (
    nom: string,
    unite: Ingredient["unite"],
    stock_minimum: number,
    prix_unitaire: number,
  ): Promise<Ingredient> => {
    const response = await supabase
      .from("ingredients")
      .insert([{ nom, unite, stock_minimum, prix_unitaire }])
      .select()
      .single();
    const data = unwrapValidated(SupabaseIngredientRowSchema)(response);
    return mapIngredientRow(data);
  },

  updateIngredient: async (
    id: string,
    nom: string,
    unite: Ingredient["unite"],
    stock_minimum: number,
    stock_actuel: number,
    prix_unitaire: number,
  ): Promise<Ingredient> => {
    const response = await supabase
      .from("ingredients")
      .update({ nom, unite, stock_minimum, stock_actuel, prix_unitaire })
      .eq("id", id)
      .select()
      .single();
    const data = unwrapValidated(SupabaseIngredientRowSchema)(response);
    return mapIngredientRow(data);
  },

  deleteIngredient: async (id: string): Promise<void> => {
    const { error } = await supabase.from("ingredients").delete().eq("id", id);
    if (error) {
      notificationService.showError("Error deleting ingredient:", error);
      throw error;
    }
  },

  getCategories: async (): Promise<Category[]> => {
    const response = await supabase.from("categories").select("*").order("nom");
    const data = unwrapValidated(z.array(SupabaseCategoryRowSchema))(response);
    return data.map(mapCategoryRow);
  },

  getCategoryById: async (id: string): Promise<Category | null> => {
    const response = await supabase.from("categories").select("*").eq("id", id).single();
    const data = unwrapMaybeValidated(SupabaseCategoryRowSchema)(response);
    return data ? mapCategoryRow(data) : null;
  },

  createCategory: async (nom: string): Promise<Category> => {
    const response = await supabase.from("categories").insert([{ nom }]).select().single();
    const data = unwrapValidated(SupabaseCategoryRowSchema)(response);
    return mapCategoryRow(data);
  },

  updateCategory: async (id: string, nom: string): Promise<Category> => {
    const response = await supabase.from("categories").update({ nom }).eq("id", id).select().single();
    const data = unwrapValidated(SupabaseCategoryRowSchema)(response);
    return mapCategoryRow(data);
  },

  deleteCategory: async (id: string): Promise<void> => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      notificationService.showError("Error deleting category:", error);
      throw error;
    }
  },

  getProducts: async (): Promise<Product[]> => {
    const { data: ingredientsData, error: ingredientsError } = await supabase.from("ingredients").select("*");
    if (ingredientsError) {
      notificationService.showError("Error fetching ingredients for products:", ingredientsError);
      throw ingredientsError;
    }
    const ingredientMap = new Map(ingredientsData.map((i) => [i.id, mapIngredientRow(i)]));

    const response = await supabase
      .from("products")
      .select("*, product_recipes(*)")
      .order("nom_produit");
    const data = unwrapValidated(z.array(SupabaseProductRowSchema.extend({ product_recipes: z.array(SupabaseProductRecipeRowSchema) })))(response);
    return data.map((row) => mapProductRow(row, ingredientMap));
  },

  getProductById: async (id: string): Promise<Product | null> => {
    const { data: ingredientsData, error: ingredientsError } = await supabase.from("ingredients").select("*");
    if (ingredientsError) {
      notificationService.showError("Error fetching ingredients for product:", ingredientsError);
      throw ingredientsError;
    }
    const ingredientMap = new Map(ingredientsData.map((i) => [i.id, mapIngredientRow(i)]));

    const response = await supabase
      .from("products")
      .select("*, product_recipes(*)")
      .eq("id", id)
      .single();
    const data = unwrapMaybeValidated(SupabaseProductRowSchema.extend({ product_recipes: z.array(SupabaseProductRecipeRowSchema) }))(response);
    return data ? mapProductRow(data, ingredientMap) : null;
  },

  createProduct: async (
    nom_produit: string,
    description: string,
    prix_vente: number,
    categoria_id: string,
    image: string,
    recipe: RecipeItem[],
  ): Promise<Product> => {
    const response = await supabase
      .from("products")
      .insert([{ nom_produit, description, prix_vente, categoria_id, image }])
      .select()
      .single();
    const data = unwrapValidated(SupabaseProductRowSchema)(response);

    if (recipe && recipe.length > 0) {
      const product_id = data.id;
      const recipePayload = recipe.map((item) => ({ ...item, product_id }));
      const { error: recipeError } = await supabase.from("product_recipes").insert(recipePayload);
      if (recipeError) {
        notificationService.showError("Error creating product recipe:", recipeError);
        throw recipeError;
      }
    }

    return api.getProductById(data.id) as Promise<Product>;
  },

  updateProduct: async (
    id: string,
    nom_produit: string,
    description: string,
    prix_vente: number,
    categoria_id: string,
    image: string,
    recipe: RecipeItem[],
  ): Promise<Product> => {
    const response = await supabase
      .from("products")
      .update({ nom_produit, description, prix_vente, categoria_id, image })
      .eq("id", id)
      .select()
      .single();
    const data = unwrapValidated(SupabaseProductRowSchema)(response);

    const { error: deleteRecipeError } = await supabase.from("product_recipes").delete().eq("product_id", id);
    if (deleteRecipeError) {
      notificationService.showError("Error deleting old product recipe:", deleteRecipeError);
      throw deleteRecipeError;
    }

    if (recipe && recipe.length > 0) {
      const recipePayload = recipe.map((item) => ({ ...item, product_id: id }));
      const { error: recipeError } = await supabase.from("product_recipes").insert(recipePayload);
      if (recipeError) {
        notificationService.showError("Error updating product recipe:", recipeError);
        throw recipeError;
      }
    }

    return api.getProductById(data.id) as Promise<Product>;
  },

  deleteProduct: async (id: string): Promise<void> => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      notificationService.showError("Error deleting product:", error);
      throw error;
    }
  },

  getOrders: async (): Promise<Order[]> => {
    const response = await supabase
      .from("orders")
      .select("*, order_items(*), restaurant_tables(nom)")
      .order("date_creation", { ascending: false });
    const data = unwrapValidated(z.array(SupabaseOrderRowSchema.extend({ order_items: z.array(SupabaseOrderItemRowSchema), restaurant_tables: z.object({ nom: z.string() }).nullable() })))(response);
    return data.map((row) => ({ ...mapOrderRow(row), table_nom: row.restaurant_tables?.nom ?? undefined }));
  },

  getOrderById: async (id: string): Promise<Order | null> => {
    const response = await supabase
      .from("orders")
      .select("*, order_items(*), restaurant_tables(nom)")
      .eq("id", id)
      .single();
    const data = unwrapMaybeValidated(SupabaseOrderRowSchema.extend({ order_items: z.array(SupabaseOrderItemRowSchema), restaurant_tables: z.object({ nom: z.string() }).nullable() }))(response);
    return data ? { ...mapOrderRow(data), table_nom: data.restaurant_tables?.nom ?? undefined } : null;
  },

  createOrder: async (order: Partial<Order>): Promise<Order> => {
    const { items, table_nom, clientInfo, ...orderPayload } = order;

    const response = await supabase
      .from("orders")
      .insert([
        {
          ...orderPayload,
          table_id: isUuid(orderPayload.table_id) ? orderPayload.table_id : null,
          client_nom: clientInfo?.nom,
          client_telephone: clientInfo?.telephone,
          client_adresse: clientInfo?.adresse,
        },
      ])
      .select()
      .single();
    const data = unwrapValidated(SupabaseOrderRowSchema)(response);

    if (items && items.length > 0) {
      const order_id = data.id;
      const itemsPayload = items.map((item) => ({
        order_id,
        produit_id: item.produitRef,
        nom_produit: item.nom_produit,
        prix_unitaire: item.prix_unitaire,
        quantite: item.quantite,
        excluded_ingredients: item.excluded_ingredients,
        commentaire: item.commentaire,
        estado: item.estado,
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(itemsPayload);
      if (itemsError) {
        notificationService.showError("Error creating order items:", itemsError);
        throw itemsError;
      }
    }

    return api.getOrderById(data.id) as Promise<Order>;
  },

  updateOrder: async (id: string, order: Partial<Order>): Promise<Order> => {
    const { items, table_nom, clientInfo, ...orderPayload } = order;

    const response = await supabase
      .from("orders")
      .update({
        ...orderPayload,
        table_id: isUuid(orderPayload.table_id) ? orderPayload.table_id : null,
        client_nom: clientInfo?.nom,
        client_telephone: clientInfo?.telephone,
        client_adresse: clientInfo?.adresse,
      })
      .eq("id", id)
      .select()
      .single();
    const data = unwrapValidated(SupabaseOrderRowSchema)(response);

    if (items) {
      const { error: deleteItemsError } = await supabase.from("order_items").delete().eq("order_id", id);
      if (deleteItemsError) {
        notificationService.showError("Error deleting old order items:", deleteItemsError);
        throw deleteItemsError;
      }

      if (items.length > 0) {
        const itemsPayload = items.map((item) => ({
          order_id: id,
          produit_id: item.produitRef,
          nom_produit: item.nom_produit,
          prix_unitaire: item.prix_unitaire,
          quantite: item.quantite,
          excluded_ingredients: item.excluded_ingredients,
          commentaire: item.commentaire,
          estado: item.estado,
        }));
        const { error: newItemsError } = await supabase.from("order_items").insert(itemsPayload);
        if (newItemsError) {
          notificationService.showError("Error creating order items:", newItemsError);
          throw newItemsError;
        }
      }
    }

    return api.getOrderById(data.id) as Promise<Order>;
  },

  deleteOrder: async (id: string): Promise<void> => {
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) {
      notificationService.showError("Error deleting order:", error);
      throw error;
    }
  },

  updateOrderItemStatus: async (orderItemId: string, status: OrderItem["estado"]): Promise<void> => {
    const { error } = await supabase.from("order_items").update({ estado: status }).eq("id", orderItemId);
    if (error) {
      notificationService.showError("Error updating order item status:", error);
      throw error;
    }
  },

  updateOrderKitchenStatus: async (orderId: string, status: Order["estado_cocina"]): Promise<void> => {
    const payload: Partial<SupabaseOrderRow> = { estado_cocina: status };
    if (status === "En préparation") {
      payload.date_envoi_cuisine = new Date().toISOString();
    } else if (status === "Prête à servir") {
      payload.date_listo_cuisine = new Date().toISOString();
    }

    const { error } = await supabase.from("orders").update(payload).eq("id", orderId);
    if (error) {
      notificationService.showError("Error updating order kitchen status:", error);
      throw error;
    }
  },

  updateOrderStatus: async (orderId: string, status: Order["statut"]): Promise<void> => {
    const payload: Partial<SupabaseOrderRow> = { statut: status };
    if (status === "Servie") {
      payload.date_servido = new Date().toISOString();
    }
    const { error } = await supabase.from("orders").update(payload).eq("id", orderId);
    if (error) {
      notificationService.showError("Error updating order status:", error);
      throw error;
    }
  },

  updateOrderPaymentStatus: async (
    orderId: string,
    status: Order["payment_status"],
    paymentMethod?: Order["payment_method"],
    paymentReceiptUrl?: string,
  ): Promise<void> => {
    const payload: Partial<SupabaseOrderRow> = { payment_status: status };
    if (paymentMethod) {
      payload.payment_method = paymentMethod;
    }
    if (paymentReceiptUrl) {
      payload.payment_receipt_url = paymentReceiptUrl;
    }
    const { error } = await supabase.from("orders").update(payload).eq("id", orderId);
    if (error) {
      notificationService.showError("Error updating order payment status:", error);
      throw error;
    }
  },

  updateOrderTotal: async (orderId: string, total: number, profit: number): Promise<void> => {
    const { error } = await supabase.from("orders").update({ total, profit }).eq("id", orderId);
    if (error) {
      notificationService.showError("Error updating order total and profit:", error);
      throw error;
    }
  },

  linkOrderToTable: async (orderId: string, tableId: string): Promise<void> => {
    const { error } = await supabase.from("restaurant_tables").update({ commande_id: orderId }).eq("id", tableId);
    if (error) {
      notificationService.showError("Error linking order to table:", error);
      throw error;
    }
  },

  unlinkOrderFromTable: async (tableId: string): Promise<void> => {
    const { error } = await supabase.from("restaurant_tables").update({ commande_id: null, couverts: 0 }).eq("id", tableId);
    if (error) {
      notificationService.showError("Error unlinking order from table:", error);
      throw error;
    }
  },

  getSales: async (period?: SalesPeriod): Promise<Sale[]> => {
    let query = supabase.from("sales").select("*");

    if (period?.start) {
      query = query.gte("sale_date", new Date(period.start).toISOString());
    }
    if (period?.end) {
      query = query.lte("sale_date", new Date(period.end).toISOString());
    }

    const response = await query.order("sale_date", { ascending: false });
    const data = unwrapValidated(z.array(SupabaseSaleRowSchema))(response);
    return data.map(mapSaleRow);
  },

  getDailyReports: async (period?: SalesPeriod): Promise<DailyReport[]> => {
    let query = supabase.rpc("get_daily_sales_report", { _start_date: null, _end_date: null });

    if (period?.start) {
      query = supabase.rpc("get_daily_sales_report", {
        _start_date: new Date(period.start).toISOString(),
        _end_date: period.end ? new Date(period.end).toISOString() : null,
      });
    }

    const response = await query;
    const data = unwrapValidated(z.array(DailyReportSchema))(response);
    return data.map(mapDailyReportRow);
  },

  getDashboardStats: async (period?: SalesPeriod): Promise<DashboardStats> => {
    const response = await supabase
      .rpc("get_dashboard_stats", {
        _start_date: period?.start ? new Date(period.start).toISOString() : null,
        _end_date: period?.end ? new Date(period.end).toISOString() : null,
      })
      .single();

    const data = unwrapValidated(DashboardStatsSchema)(response);
    return mapDashboardStatsRow(data);
  },

  getNotificationCounts: async (): Promise<NotificationCounts> => {
    const response = await supabase.rpc("get_notification_counts").single();
    const data = unwrapValidated(NotificationCountsSchema)(response);
    return mapNotificationCountsRow(data);
  },

  getSiteContent: async (): Promise<SiteContent | null> => {
    const response = await supabase
      .from(SITE_CONTENT_TABLE)
      .select("*")
      .eq("id", SITE_CONTENT_SINGLETON_ID)
      .single();

    const data = unwrapMaybeValidated(SupabaseSiteContentRowSchema)(response);
    return mapSiteContentRow(data);
  },

  updateSiteContent: async (content: Partial<SiteContent>): Promise<SiteContent> => {
    const sanitizedContent = sanitizeSiteContentInput(content);
    const response = await supabase
      .from(SITE_CONTENT_TABLE)
      .upsert({ id: SITE_CONTENT_SINGLETON_ID, content: sanitizedContent }, { onConflict: "id" })
      .select()
      .single();

    const data = unwrapValidated(SupabaseSiteContentRowSchema)(response);
    return mapSiteContentRow(data) as SiteContent;
  },

  logRoleLogin: async (roleId: string, ipAddress: string, userAgent: string) => {
    return logRoleLogin(roleId, ipAddress, userAgent);
  },

  fetchRoleLoginsSince: async (since: Date) => {
    return fetchRoleLoginsSince(since);
  },

  clearRoleLoginsBefore: async (before: Date) => {
    return clearRoleLoginsBefore(before);
  },
};

export type { SalesPeriod };





