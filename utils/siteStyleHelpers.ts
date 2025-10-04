import { CSSProperties } from 'react';
import { ElementStyle, SectionStyle } from '../types';

export const formatFontFamily = (fontFamily?: string | null): string | undefined => {
  if (!fontFamily) {
    return fontFamily ?? undefined;
  }

  const trimmed = fontFamily.trim();

  if (trimmed.length === 0 || trimmed.includes(',')) {
    return trimmed.length === 0 ? undefined : trimmed;
  }

  const isQuoted = /^(['"]).*\1$/.test(trimmed);
  if (isQuoted) {
    return trimmed;
  }

  const needsQuoting = /[^a-zA-Z0-9-]/.test(trimmed);
  if (!needsQuoting) {
    return trimmed;
  }

  const escaped = trimmed.replace(/'/g, "\\'");
  return `'${escaped}'`;
};

export const createBackgroundStyle = (style: SectionStyle): CSSProperties => {
  if (style.background.type === 'image' && style.background.image) {
    return {
      backgroundImage: `url('${style.background.image}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundColor: style.background.color,
    };
  }

  return { backgroundColor: style.background.color };
};

export const createHeroBackgroundStyle = (
  style: SectionStyle,
  fallbackImage: string | null,
): CSSProperties => {
  const base = createBackgroundStyle(style);

  if (style.background.type === 'image') {
    const image = style.background.image ?? fallbackImage;
    if (image) {
      return {
        ...base,
        backgroundImage: `url('${image}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
    return base;
  }

  if (fallbackImage) {
    return {
      ...base,
      backgroundImage: `url('${fallbackImage}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }

  return base;
};

export const getElementTextStyle = (style: SectionStyle, globalStyle?: SiteContent["globalStyle"]): CSSProperties => ({
  color: style.textColor ?? globalStyle?.primaryColor,
  fontFamily: formatFontFamily(style.fontFamily ?? globalStyle?.fontFamily),
});

export const getElementBodyTextStyle = (style: SectionStyle, globalStyle?: SiteContent["globalStyle"]): CSSProperties => ({
  ...getElementTextStyle(style, globalStyle),
  fontSize: style.fontSize ?? globalStyle?.fontSize,
});

export const createElementTextStyle = (
  sectionStyle: SectionStyle,
  elementStyle?: ElementStyle | null,
): CSSProperties => {
  const style: CSSProperties = {
    color: elementStyle?.textColor ?? sectionStyle.textColor,
    fontFamily: formatFontFamily(elementStyle?.fontFamily ?? sectionStyle.fontFamily),
  };

  if (elementStyle?.backgroundColor && elementStyle.backgroundColor.trim().length > 0) {
    style.backgroundColor = elementStyle.backgroundColor;
  }

  return style;
};

export const createElementBodyTextStyle = (
  sectionStyle: SectionStyle,
  elementStyle?: ElementStyle | null,
): CSSProperties => ({
  ...createElementTextStyle(sectionStyle, elementStyle),
  fontSize: elementStyle?.fontSize ?? sectionStyle.fontSize,
});

export const createElementBackgroundStyle = (
  _sectionStyle: SectionStyle,
  elementStyle?: ElementStyle | null,
): CSSProperties => {
  if (elementStyle?.backgroundColor) {
    return { backgroundColor: elementStyle.backgroundColor };
  }
  return {};
};


export const getZoneStyle = (zone: Zone, assets: CustomizationAsset[]): CSSProperties => {
  const style: CSSProperties = {};

  // Logic to determine background style based on zone type and assets
  // This is a placeholder, actual implementation will depend on how zones are structured
  if (zone.type === 'hero' && zone.backgroundImage) {
    style.backgroundImage = `url(${zone.backgroundImage})`;
    style.backgroundSize = 'cover';
    style.backgroundPosition = 'center';
  } else if (zone.type === 'menu' && zone.image) {
    style.backgroundImage = `url(${zone.image})`;
    style.backgroundSize = 'cover';
    style.backgroundPosition = 'center';
  }

  // Add other styles from the zone if available
  if (zone.style?.backgroundColor) {
    style.backgroundColor = zone.style.backgroundColor;
  }
  if (zone.style?.textColor) {
    style.color = zone.style.textColor;
  }
  if (zone.style?.fontFamily) {
    style.fontFamily = zone.style.fontFamily;
  }
  if (zone.style?.fontSize) {
    style.fontSize = zone.style.fontSize;
  }

  return style;
};

