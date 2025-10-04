
import { EditableElementKey } from "../types";

export const FONT_FAMILY_SUGGESTIONS = [
  "Inter",
  "Poppins",
  "Roboto",
  "Montserrat",
  "Playfair Display",
  "Lora",
  "Open Sans",
  "Georgia, serif",
  "Arial, sans-serif",
] as const;

export const FONT_SIZE_SUGGESTIONS = [
  "14px",
  "16px",
  "18px",
  "20px",
  "24px",
  "clamp(1rem, 2vw, 1.5rem)",
] as const;

export const COLOR_SUGGESTIONS = [
  "#0f172a",
  "#111827",
  "#f8fafc",
  "#ffffff",
  "#e2e8f0",
  "#f97316",
  "transparent",
  "currentColor",
] as const;

export const TEXT_ELEMENT_KEYS = new Set<EditableElementKey>([
  "navigation.brand",
  "navigation.links.home",
  "navigation.links.about",
  "navigation.links.menu",
  "navigation.links.contact",
  "navigation.links.loginCta",
  "hero.title",
  "hero.subtitle",
  "hero.ctaLabel",
  "hero.historyTitle",
  "hero.reorderCtaLabel",
  "about.title",
  "menu.title",
  "menu.ctaLabel",
  "menu.loadingLabel",
  "instagramReviews.title",
  "instagramReviews.subtitle",
  "findUs.title",
  "findUs.addressLabel",
  "findUs.address",
  "findUs.cityLabel",
  "findUs.city",
  "findUs.hoursLabel",
  "findUs.hours",
  "findUs.mapLabel",
  "footer.text",
]);

export const BACKGROUND_ELEMENT_KEYS = new Set<EditableElementKey>([
  "navigation.style.background",
  "hero.style.background",
  "about.style.background",
  "menu.style.background",
  "instagramReviews.style.background",
  "findUs.style.background",
  "footer.style.background",
]);

export const IMAGE_ELEMENT_KEYS = new Set<EditableElementKey>([
  "hero.backgroundImage",
  "about.image",
  "menu.image",
  "instagramReviews.image",
  "navigation.brandLogo",
  "navigation.staffLogo",
]);

export const ELEMENT_LABELS: Partial<Record<EditableElementKey, string>> = {
  "navigation.brand": "Nom de la marque",
  "navigation.brandLogo": "Logo principal",
  "navigation.staffLogo": "Logo d'accès équipe",
  "navigation.links.home": "Lien Accueil",
  "navigation.links.about": "Lien À propos",
  "navigation.links.menu": "Lien Menu",
  "navigation.links.contact": "Lien Contact",
  "navigation.links.loginCta": "Bouton d'accès staff",
  "navigation.style.background": "Fond de la navigation",
  "hero.title": "Titre du hero",
  "hero.subtitle": "Sous-titre du hero",
  "hero.ctaLabel": "Bouton principal du hero",
  "hero.historyTitle": "Titre de l'historique",
  "hero.reorderCtaLabel": "Bouton de réassort",
  "hero.backgroundImage": "Image du hero",
  "hero.style.background": "Fond du hero",
  "about.title": "Titre À propos",
  "about.description": "Texte À propos",
  "about.image": "Image À propos",
  "about.style.background": "Fond À propos",
  "menu.title": "Titre du menu",
  "menu.ctaLabel": "Bouton du menu",
  "menu.loadingLabel": "Texte de chargement du menu",
  "menu.image": "Image du menu",
  "menu.style.background": "Fond du menu",
  "instagramReviews.title": "Titre Avis Instagram",
  "instagramReviews.subtitle": "Sous-titre Avis Instagram",
  "instagramReviews.image": "Image Avis Instagram",
  "instagramReviews.style.background": "Fond Avis Instagram",
  "findUs.title": "Titre Encuéntranos",
  "findUs.addressLabel": "Libellé de l'adresse (Encuéntranos)",
  "findUs.address": "Adresse (Encuéntranos)",
  "findUs.cityLabel": "Libellé de contact",
  "findUs.city": "Email (Encuéntranos)",
  "findUs.hoursLabel": "Libellé des horaires",
  "findUs.hours": "Horaires",
  "findUs.mapLabel": "Libellé du lien carte",
  "findUs.style.background": "Fond Encuéntranos",
  "footer.text": "Texte du pied de page",
  "footer.style.background": "Fond du pied de page",
};

export const TABS = [
  { id: "preview", label: "Aperçu" },
  { id: "content", label: "Contenu" },
  { id: "style", label: "Style" },
  { id: "theme", label: "Thème global" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

