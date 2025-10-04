
import { CustomizationAsset, CustomizationAssetType, EditableElementKey, EditableZoneKey, ElementStyle, RichTextValue, SectionStyle, SiteContent } from "../types";
import { sanitizeFontFamilyName } from "./fonts";

export type DraftUpdater = (current: SiteContent) => SiteContent;

export const createAssetId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `asset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const guessAssetType = (file: File): CustomizationAssetType => {
  const { type, name } = file;
  if (type.startsWith("image/")) {
    return "image";
  }
  if (type.startsWith("video/")) {
    return "video";
  }
  if (type.startsWith("audio/")) {
    return "audio";
  }
  if (type.includes("font")) {
    return "font";
  }
  const extension = name.split(".").pop()?.toLowerCase();
  if (extension && ["ttf", "otf", "woff", "woff2"].includes(extension)) {
    return "font";
  }
  return "raw";
};

export const cloneSiteContent = (content: SiteContent): SiteContent => {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(content);
  }
  return JSON.parse(JSON.stringify(content)) as SiteContent;
};

export const setNestedValue = (content: SiteContent, key: EditableElementKey, value: string | null): void => {
  const segments = key.split(".");
  const last = segments.pop();
  if (!last) {
    return;
  }

  let cursor: unknown = content;
  segments.forEach((segment) => {
    if (cursor && typeof cursor === "object") {
      const target = (cursor as Record<string, unknown>)[segment];
      if (target && typeof target === "object") {
        (cursor as Record<string, unknown>)[segment] = Array.isArray(target)
          ? [...target]
          : { ...target };
      } else {
        (cursor as Record<string, unknown>)[segment] = {};
      }
      cursor = (cursor as Record<string, unknown>)[segment];
    }
  });

  if (cursor && typeof cursor === "object") {
    (cursor as Record<string, unknown>)[last] = value;
  }
};

export const applyElementStyleOverrides = (
  content: SiteContent,
  element: EditableElementKey,
  overrides: Partial<ElementStyle>,
): void => {
  const sanitized: ElementStyle = {};

  if (overrides.fontFamily && overrides.fontFamily.trim().length > 0) {
    sanitized.fontFamily = overrides.fontFamily.trim();
  }
  if (overrides.fontSize && overrides.fontSize.trim().length > 0) {
    sanitized.fontSize = overrides.fontSize.trim();
  }
  if (overrides.textColor && overrides.textColor.trim().length > 0) {
    sanitized.textColor = overrides.textColor.trim();
  }
  if (overrides.backgroundColor && overrides.backgroundColor.trim().length > 0) {
    sanitized.backgroundColor = overrides.backgroundColor.trim();
  }

  const nextStyles = { ...content.elementStyles };
  if (Object.keys(sanitized).length === 0) {
    delete nextStyles[element];
  } else {
    nextStyles[element] = sanitized;
  }
  content.elementStyles = nextStyles;
};

export const applyElementRichText = (
  content: SiteContent,
  element: EditableElementKey,
  value: RichTextValue | null,
): void => {
  const next = { ...content.elementRichText };
  if (value && value.html.trim().length > 0) {
    next[element] = value;
  } else {
    delete next[element];
  }
  content.elementRichText = next;
};

export const applySectionBackground = (
  content: SiteContent,
  element: EditableElementKey,
  background: SectionStyle["background"],
): void => {
  const zone = resolveZoneFromElement(element);
  const zoneContent = { ...content[zone] } as typeof content[EditableZoneKey];
  const style = { ...zoneContent.style, background: { ...background } };
  zoneContent.style = style;
  (content as Record<EditableZoneKey, typeof zoneContent>)[zone] = zoneContent;
};

export const appendAsset = (content: SiteContent, asset: CustomizationAsset): void => {
  const library = content.assets?.library ?? [];
  const existingIndex = library.findIndex((item) => item.url === asset.url || item.id === asset.id);
  const nextLibrary = existingIndex >= 0
    ? library.map((item, index) => (index === existingIndex ? asset : item))
    : [...library, asset];
  content.assets = { ...content.assets, library: nextLibrary };
};

export const getPlainTextValue = (content: SiteContent, key: EditableElementKey): string => {
  const segments = key.split(".");
  let cursor: unknown = content;
  for (const segment of segments) {
    if (!cursor || typeof cursor !== "object") {
      return "";
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return typeof cursor === "string" ? cursor : "";
};

export const getImageValue = (content: SiteContent, key: EditableElementKey): string | null => {
  const value = getPlainTextValue(content, key);
  return value.trim().length > 0 ? value : null;
};

export const getElementStyle = (content: SiteContent, key: EditableElementKey): ElementStyle =>
  content.elementStyles[key] ?? {};

export const getElementRichTextValue = (content: SiteContent, key: EditableElementKey): RichTextValue | null =>
  content.elementRichText[key] ?? null;

export const getSectionBackground = (content: SiteContent, key: EditableElementKey): SectionStyle["background"] => {
  const zone = resolveZoneFromElement(key);
  return content[zone].style.background;
};

export const createAssetFromFile = (file: File, url: string): CustomizationAsset => {
  const baseName = file.name.replace(/\.[^/.]+$/, "").trim() || "media";
  const type = guessAssetType(file);
  const name = type === "font" ? sanitizeFontFamilyName(baseName) : baseName;
  return {
    id: createAssetId(),
    name,
    url,
    format: file.type || "application/octet-stream",
    bytes: file.size,
    type,
    createdAt: new Date().toISOString(),
  };
};



