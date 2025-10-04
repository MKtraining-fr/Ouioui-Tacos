
import { RecipeItem, Ingredient, OrderItem } from "../../types";

export const toTimestamp = (value?: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }
  return new Date(value).getTime();
};

export const toNumber = (value: number | string | null | undefined): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const toIsoString = (value: number | undefined | null): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return new Date(value).toISOString();
};

export const calculateCost = (recipe: RecipeItem[], ingredientMap: Map<string, Ingredient>): number => {
  return recipe.reduce((total, item) => {
    const ingredient = ingredientMap.get(item.ingredient_id);
    if (!ingredient) {
      return total;
    }

    let unitPrice = ingredient.prix_unitaire;
    if (ingredient.unite === "kg" || ingredient.unite === "L") {
      unitPrice = unitPrice / 1000;
    }

    return total + unitPrice * item.qte_utilisee;
  }, 0);
};

export const isUuid = (value?: string | null): value is string =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const areArraysEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((value, index) => value === b[index]);
};

export const areOrderItemsEquivalent = (a: OrderItem, b: OrderItem): boolean => {
  if (
    a.produitRef !== b.produitRef ||
    a.nom_produit !== b.nom_produit ||
    a.prix_unitaire !== b.prix_unitaire ||
    a.quantite !== b.quantite ||
    a.commentaire !== b.commentaire ||
    a.estado !== b.estado
  ) {
    return false;
  }

  const excludedIngredientsA = [...a.excluded_ingredients].sort();
  const excludedIngredientsB = [...b.excluded_ingredients].sort();

  return areArraysEqual(excludedIngredientsA, excludedIngredientsB);
};

export const reorderOrderItems = (referenceItems: OrderItem[], itemsToReorder: OrderItem[]): OrderItem[] => {
  const remaining = [...itemsToReorder];
  const ordered: OrderItem[] = [];

  referenceItems.forEach(referenceItem => {
    const matchIndex = remaining.findIndex(item => areOrderItemsEquivalent(item, referenceItem));
    if (matchIndex !== -1) {
      ordered.push(remaining.splice(matchIndex, 1)[0]);
    }
  });

  return [...ordered, ...remaining];
};



export const getBusinessDayStart = (date: Date): Date => {
  const start = new Date(date);
  start.setHours(6, 0, 0, 0); // Start of business day at 6 AM
  return start;
};
