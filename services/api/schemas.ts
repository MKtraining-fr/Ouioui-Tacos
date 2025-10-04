
import { z } from "zod";
import { DashboardPeriod, EditableElementKey, EditableZoneKey } from "../../types";

// Basic types
const UuidSchema = z.string().uuid();
const TimestampSchema = z.string().datetime();
const NullableStringSchema = z.string().nullable();
const NullableNumberSchema = z.number().nullable();
const NullableBooleanSchema = z.boolean().nullable();

// Supabase base response schema
const SupabaseResponseSchema = z.object({
  data: z.any().nullable(),
  error: z.object({
    message: z.string(),
    code: z.string().nullable(),
    details: z.string().nullable(),
    hint: z.string().nullable(),
  }).nullable(),
  status: z.number().nullable(),
  statusText: z.string().nullable(),
});

// Role Schemas
export const SupabasePermissionsSchema = z.record(z.boolean());

export const SupabaseRoleRowSchema = z.object({
  id: UuidSchema,
  created_at: TimestampSchema,
  name: z.string(),
  permissions: SupabasePermissionsSchema,
  pin: NullableStringSchema,
});

export const RoleSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  permissions: SupabasePermissionsSchema,
  pin: NullableStringSchema,
  homePage: NullableStringSchema,
});

// Table Schemas
export const SupabaseTableRowSchema = z.object({
  id: UuidSchema,
  created_at: TimestampSchema,
  nom: z.string(),
  capacite: z.number().int().positive(),
  statut: z.enum(["Libre", "Occupée", "Réservée"]),
  commande_id: NullableStringSchema,
  couverts: z.number().int().min(0),
});

export const TableSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  capacity: z.number().int().positive(),
  status: z.enum(["Libre", "Occupée", "Réservée"]),
  orderId: NullableStringSchema,
  covers: z.number().int().min(0),
  kitchenStatus: z.enum(["En attente", "En préparation", "Prête à servir", "Servie"]).nullable(),
});

export const TablePayloadSchema = z.object({
  nom: z.string(),
  capacite: z.number().int().positive(),
});

export const TableUpdatePayloadSchema = z.object({
  nom: z.string().optional(),
  capacite: z.number().int().positive().optional(),
  statut: z.enum(["Libre", "Occupée", "Réservée"]).optional(),
  commande_id: NullableStringSchema.optional(),
  couverts: z.number().int().min(0).optional(),
});

// Ingredient Schemas
export const SupabaseIngredientRowSchema = z.object({
  id: UuidSchema,
  created_at: TimestampSchema,
  nom: z.string(),
  unite: z.enum(["g", "ml", "unité"]),
  stock_minimum: z.number().min(0),
  stock_actuel: z.number().min(0),
  prix_unitaire: z.number().min(0),
});

export const IngredientSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  unit: z.enum(["g", "ml", "unité"]),
  minStock: z.number().min(0),
  currentStock: z.number().min(0),
  unitPrice: z.number().min(0),
});

// Category Schemas
export const SupabaseCategoryRowSchema = z.object({
  id: UuidSchema,
  created_at: TimestampSchema,
  nom: z.string(),
});

export const CategorySchema = z.object({
  id: UuidSchema,
  name: z.string(),
});

// Product Schemas
export const SupabaseProductRecipeRowSchema = z.object({
  id: UuidSchema,
  created_at: TimestampSchema,
  product_id: UuidSchema,
  ingredient_id: UuidSchema,
  quantite: z.number().min(0),
});

export const RecipeItemSchema = z.object({
  ingredientId: UuidSchema,
  quantity: z.number().min(0),
});

export const ProductSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  description: z.string(),
  price: z.number().min(0),
  categoryId: UuidSchema,
  image: z.string().url().nullable(),
  recipe: z.array(RecipeItemSchema),
  cost: z.number().min(0),
});

// Order Schemas
export const SupabaseOrderItemRowSchema = z.object({
  id: UuidSchema,
  created_at: TimestampSchema,
  order_id: UuidSchema,
  produit_id: UuidSchema,
  nom_produit: z.string(),
  prix_unitaire: z.number().min(0),
  quantite: z.number().int().positive(),
  excluded_ingredients: z.array(z.string()).nullable(),
  commentaire: NullableStringSchema,
  estado: z.enum(["En attente", "En préparation", "Prêt", "Servi", "Annulé"]),
});

export const OrderItemSchema = z.object({
  id: UuidSchema,
  productId: UuidSchema,
  productName: z.string(),
  unitPrice: z.number().min(0),
  quantity: z.number().int().positive(),
  excludedIngredients: z.array(z.string()).nullable(),
  comment: NullableStringSchema,
  status: z.enum(["En attente", "En préparation", "Prêt", "Servi", "Annulé"]),
});

export const SupabaseOrderRowSchema = z.object({
  id: UuidSchema,
  created_at: TimestampSchema,
  table_id: NullableStringSchema,
  client_nom: NullableStringSchema,
  client_telephone: NullableStringSchema,
  client_adresse: NullableStringSchema,
  total: z.number().min(0),
  profit: z.number(),
  statut: z.enum(["En attente", "En cours", "Terminée", "Annulée"]),
  payment_status: z.enum(["En attente", "Payée", "Remboursée"]),
  payment_method: NullableStringSchema,
  payment_receipt_url: NullableStringSchema,
  estado_cocina: z.enum(["En attente", "En préparation", "Prête à servir", "Servie"]).nullable(),
  date_creation: TimestampSchema,
  date_envoi_cuisine: NullableStringSchema,
  date_listo_cuisine: NullableStringSchema,
  date_servido: NullableStringSchema,
  date_paiement: NullableStringSchema,
});

export const OrderSchema = z.object({
  id: UuidSchema,
  tableId: NullableStringSchema,
  clientInfo: z.object({
    name: NullableStringSchema,
    phone: NullableStringSchema,
    address: NullableStringSchema,
  }).nullable(),
  total: z.number().min(0),
  profit: z.number(),
  status: z.enum(["En attente", "En cours", "Terminée", "Annulée"]),
  paymentStatus: z.enum(["En attente", "Payée", "Remboursée"]),
  paymentMethod: NullableStringSchema,
  paymentReceiptUrl: NullableStringSchema,
  kitchenStatus: z.enum(["En attente", "En préparation", "Prête à servir", "Servie"]).nullable(),
  createdAt: TimestampSchema,
  sentToKitchenAt: NullableStringSchema,
  readyAt: NullableStringSchema,
  servedAt: NullableStringSchema,
  paidAt: NullableStringSchema,
  items: z.array(OrderItemSchema),
  table_nom: NullableStringSchema.optional(), // Added for join
});

// Sale Schemas
export const SupabaseSaleRowSchema = z.object({
  id: UuidSchema,
  created_at: TimestampSchema,
  product_id: UuidSchema,
  product_name: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().min(0),
  cost: z.number().min(0),
  sale_date: TimestampSchema,
});

export const SaleSchema = z.object({
  id: UuidSchema,
  productId: UuidSchema,
  productName: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().min(0),
  cost: z.number().min(0),
  saleDate: TimestampSchema,
});

export const SoldProductSchema = z.object({
  productId: UuidSchema,
  productName: z.string(),
  quantity: z.number().int().positive(),
  totalRevenue: z.number().min(0),
  totalProfit: z.number(),
});

// DailyReport Schemas
export const DailyReportSchema = z.object({
  date: z.string(),
  totalRevenue: z.number().min(0),
  totalProfit: z.number(),
  totalOrders: z.number().int().min(0),
  averageOrderValue: z.number().min(0),
  topProducts: z.array(SoldProductSchema),
});

// Dashboard Stats Schemas
export const DashboardStatsSchema = z.object({
  totalRevenue: z.number().min(0),
  totalProfit: z.number(),
  totalOrders: z.number().int().min(0),
  averageOrderValue: z.number().min(0),
  topSellingProducts: z.array(SoldProductSchema),
  salesByPeriod: z.array(z.object({
    period: z.string(),
    revenue: z.number().min(0),
    profit: z.number(),
  })),
});

// Notification Counts Schemas
export const NotificationCountsSchema = z.object({
  pendingOrders: z.number().int().min(0),
  kitchenOrders: z.number().int().min(0),
  lowStockIngredients: z.number().int().min(0),
});

// Site Content Schemas
export const RichTextValueSchema = z.object({
  html: z.string(),
  text: z.string(),
});

export const ElementStyleSchema = z.object({
  fontFamily: NullableStringSchema,
  fontSize: NullableStringSchema,
  textColor: NullableStringSchema,
  backgroundColor: NullableStringSchema,
});

export const SectionBackgroundSchema = z.object({
  type: z.enum(["color", "image"]),
  value: NullableStringSchema,
});

export const SiteContentSchema = z.object({
  header: z.object({
    logo: NullableStringSchema,
    title: z.string(),
    description: NullableStringSchema,
    style: SectionBackgroundSchema,
  }),
  hero: z.object({
    title: z.string(),
    subtitle: NullableStringSchema,
    buttonText: NullableStringSchema,
    buttonLink: NullableStringSchema,
    image: NullableStringSchema,
    style: SectionBackgroundSchema,
  }),
  about: z.object({
    title: z.string(),
    description: RichTextValueSchema,
    image: NullableStringSchema,
    style: SectionBackgroundSchema,
  }),
  menu: z.object({
    title: z.string(),
    description: NullableStringSchema,
    style: SectionBackgroundSchema,
  }),
  testimonials: z.object({
    title: z.string(),
    description: NullableStringSchema,
    style: SectionBackgroundSchema,
  }),
  contact: z.object({
    title: z.string(),
    description: NullableStringSchema,
    email: NullableStringSchema,
    phone: NullableStringSchema,
    address: NullableStringSchema,
    style: SectionBackgroundSchema,
  }),
  footer: z.object({
    text: NullableStringSchema,
    socialLinks: z.record(NullableStringSchema).optional(),
    style: SectionBackgroundSchema,
  }),
  elementStyles: z.record(z.nativeEnum(EditableElementKey), ElementStyleSchema).optional(),
  elementRichText: z.record(z.nativeEnum(EditableElementKey), RichTextValueSchema).optional(),
  assets: z.object({
    library: z.array(z.object({
      id: UuidSchema,
      name: z.string(),
      url: z.string().url(),
      format: z.string(),
      bytes: z.number().int().min(0),
      type: z.nativeEnum(CustomizationAssetType),
      createdAt: TimestampSchema,
    })).optional(),
  }).optional(),
});

export const SupabaseSiteContentRowSchema = z.object({
  id: z.string(),
  created_at: TimestampSchema,
  content: SiteContentSchema,
});

// Utility for unwrapping Supabase responses with Zod validation
export const unwrapValidated = <T extends z.ZodTypeAny>(schema: T) => (response: SupabaseResponse<z.infer<T>>): z.infer<T> => {
  if (response.error) {
    throw new Error(response.error.message);
  }
  return schema.parse(response.data);
};

export const unwrapMaybeValidated = <T extends z.ZodTypeAny>(schema: T) => (response: SupabaseResponse<z.infer<T> | null>): z.infer<T> | null => {
  if (response.error && response.status !== 406) { // 406 means no rows found for .single()
    throw new Error(response.error.message);
  }
  if (response.data === null) {
    return null;
  }
  return schema.parse(response.data);
};

export const SalesPeriodSchema = z.object({
  start: z.date().optional(),
  end: z.date().optional(),
});

