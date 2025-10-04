import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  useId,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Loader2, Upload, X } from 'lucide-react';
import SitePreviewCanvas from '../components/SitePreviewCanvas';
import useSiteContent from '../hooks/useSiteContent';
import RichTextEditor from '../components/RichTextEditor';
import {
  CustomizationAsset,
  CustomizationAssetType,
  EditableElementKey,
  ElementStyle,
  Product,
  RichTextValue,
  SectionStyle,
  SiteContent,
  STYLE_EDITABLE_ELEMENT_KEYS,
} from '../types/types';
import { api } from '../services/api';
import { normalizeCloudinaryImageUrl, uploadCustomizationAsset } from '../services/cloudinary';
import {
  FONT_FAMILY_SUGGESTIONS,
  FONT_SIZE_SUGGESTIONS,
  COLOR_SUGGESTIONS,
  TEXT_ELEMENT_KEYS,
  BACKGROUND_ELEMENT_KEYS,
  IMAGE_ELEMENT_KEYS,
  ELEMENT_LABELS,
  TABS,
  TabId,
} from '../constants/siteCustomization';
import {
  DraftUpdater,
  createAssetId,
  guessAssetType,
  cloneSiteContent,
  setNestedValue,
  applyElementStyleOverrides,
  applyElementRichText,
  applySectionBackground,
  appendAsset,
  getPlainTextValue,
  getImageValue,
  getElementStyle,
  getElementRichTextValue,
  getSectionBackground,
  createAssetFromFile,
  cloneAnchorRect,
} from '../utils/siteCustomization';
import EditorPopover from '../components/EditorPopover';

type AnchorRect = Pick<DOMRectReadOnly, 'x' | 'y' | 'top' | 'left' | 'bottom' | 'right' | 'width' | 'height'>;

const SiteCustomization: React.FC = () => {
  const { siteContent, updateSiteContent, isSaving, isError, isSuccess } = useSiteContent();
  const [activeTab, setActiveTab] = useState<TabId>('preview');
  const [draftContent, setDraftContent] = useState<SiteContent | null>(null);
  const [activeElement, setActiveElement] = useState<EditableElementKey | null>(null);
  const [activeElementAnchor, setActiveElementAnchor] = useState<AnchorRect | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    api.getProducts().then(setProducts);
  }, []);

  useEffect(() => {
    if (siteContent) {
      setDraftContent(cloneSiteContent(siteContent));
    }
  }, [siteContent]);

  const updateDraft = useCallback((updater: DraftUpdater) => {
    setDraftContent(current => {
      if (!current) {
        return null;
      }
      const next = cloneSiteContent(current);
      updater(next);
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    if (draftContent) {
      updateSiteContent(draftContent);
    }
  }, [draftContent, updateSiteContent]);

  const handleReset = useCallback(() => {
    if (siteContent) {
      setDraftContent(cloneSiteContent(siteContent));
    }
  }, [siteContent]);

  const handleElementClick = useCallback((elementKey: EditableElementKey, rect: DOMRect) => {
    setActiveElement(elementKey);
    setActiveElementAnchor(cloneAnchorRect(rect));
  }, []);

  const handleCloseEditor = useCallback(() => {
    setActiveElement(null);
    setActiveElementAnchor(null);
  }, []);

  const handleTextChange = useCallback(
    (elementKey: EditableElementKey, value: string) => {
      updateDraft(content => setNestedValue(content, elementKey, value));
    },
    [updateDraft],
  );

  const handleStyleChange = useCallback(
    (elementKey: EditableElementKey, style: Partial<ElementStyle>) => {
      updateDraft(content => applyElementStyleOverrides(content, elementKey, style));
    },
    [updateDraft],
  );

  const handleRichTextChange = useCallback(
    (elementKey: EditableElementKey, value: RichTextValue | null) => {
      updateDraft(content => applyElementRichText(content, elementKey, value));
    },
    [updateDraft],
  );

  const handleBackgroundChange = useCallback(
    (elementKey: EditableElementKey, background: SectionStyle['background']) => {
      updateDraft(content => applySectionBackground(content, elementKey, background));
    },
    [updateDraft],
  );

  const handleImageUpload = useCallback(
    async (elementKey: EditableElementKey, file: File) => {
      try {
        const uploadedAsset = await uploadCustomizationAsset(file);
        const asset = createAssetFromFile(file, uploadedAsset.url);
        updateDraft(content => {
          appendAsset(content, asset);
          setNestedValue(content, elementKey, normalizeCloudinaryImageUrl(uploadedAsset.url));
        });
      } catch (error) {
        notificationService.showError("Error uploading image:", error);
      }
    },
    [updateDraft],
  );

  const handleImageRemove = useCallback(
    (elementKey: EditableElementKey) => {
      updateDraft(content => setNestedValue(content, elementKey, null));
    },
    [updateDraft],
  );

  const handleGlobalStyleChange = useCallback(
    (key: 'primaryColor' | 'secondaryColor' | 'fontFamily' | 'fontSize', value: string) => {
      updateDraft(content => {
        if (!content.globalStyle) {
          content.globalStyle = {};
        }
        content.globalStyle[key] = value;
      });
    },
    [updateDraft],
  );

  const renderTextEditor = useCallback(
    (elementKey: EditableElementKey) => {
      if (!draftContent) {
        return null;
      }
      const value = getPlainTextValue(draftContent, elementKey);
      return (
        <input
          type="text"
          value={value}
          onChange={e => handleTextChange(elementKey, e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      );
    },
    [draftContent, handleTextChange],
  );

  const renderRichTextEditor = useCallback(
    (elementKey: EditableElementKey) => {
      if (!draftContent) {
        return null;
      }
      const value = getElementRichTextValue(draftContent, elementKey);
      return (
        <RichTextEditor
          value={value}
          onChange={val => handleRichTextChange(elementKey, val)}
        />
      );
    },
    [draftContent, handleRichTextChange],
  );

  const renderStyleEditor = useCallback(
    (elementKey: EditableElementKey) => {
      if (!draftContent) {
        return null;
      }
      const currentStyle = getElementStyle(draftContent, elementKey);
      return (
        <div className="space-y-3">
          <div>
            <label htmlFor={`${elementKey}-font-family`} className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Police de caractères
            </label>
            <select
              id={`${elementKey}-font-family`}
              value={currentStyle.fontFamily ?? ''}
              onChange={e => handleStyleChange(elementKey, { fontFamily: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-orange-500 focus:outline-none focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
            >
              <option value="">Défaut</option>
              {FONT_FAMILY_SUGGESTIONS.map(font => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${elementKey}-font-size`} className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Taille de police
            </label>
            <select
              id={`${elementKey}-font-size`}
              value={currentStyle.fontSize ?? ''}
              onChange={e => handleStyleChange(elementKey, { fontSize: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-orange-500 focus:outline-none focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
            >
              <option value="">Défaut</option>
              {FONT_SIZE_SUGGESTIONS.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${elementKey}-text-color`} className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Couleur du texte
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <input
                type="color"
                id={`${elementKey}-text-color-picker`}
                value={currentStyle.textColor ?? '#000000'}
                onChange={e => handleStyleChange(elementKey, { textColor: e.target.value })}
                className="absolute inset-y-0 left-0 w-8 h-full opacity-0 cursor-pointer"
              />
              <input
                type="text"
                id={`${elementKey}-text-color`}
                value={currentStyle.textColor ?? ''}
                onChange={e => handleStyleChange(elementKey, { textColor: e.target.value })}
                className="block w-full rounded-md border-gray-300 pl-10 focus:border-orange-500 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                placeholder="#RRGGBB ou nom de couleur"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span
                  className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: currentStyle.textColor ?? 'transparent' }}
                />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLOR_SUGGESTIONS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleStyleChange(elementKey, { textColor: color })}
                  className="h-6 w-6 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 dark:border-gray-600"
                  style={{ backgroundColor: color }}
                  aria-label={`Set text color to ${color}`}
                />
              ))}
            </div>
          </div>
          <div>
            <label htmlFor={`${elementKey}-background-color`} className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Couleur de fond
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <input
                type="color"
                id={`${elementKey}-background-color-picker`}
                value={currentStyle.backgroundColor ?? '#000000'}
                onChange={e => handleStyleChange(elementKey, { backgroundColor: e.target.value })}
                className="absolute inset-y-0 left-0 w-8 h-full opacity-0 cursor-pointer"
              />
              <input
                type="text"
                id={`${elementKey}-background-color`}
                value={currentStyle.backgroundColor ?? ''}
                onChange={e => handleStyleChange(elementKey, { backgroundColor: e.target.value })}
                className="block w-full rounded-md border-gray-300 pl-10 focus:border-orange-500 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                placeholder="#RRGGBB ou nom de couleur"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span
                  className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: currentStyle.backgroundColor ?? 'transparent' }}
                />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLOR_SUGGESTIONS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleStyleChange(elementKey, { backgroundColor: color })}
                  className="h-6 w-6 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 dark:border-gray-600"
                  style={{ backgroundColor: color }}
                  aria-label={`Set background color to ${color}`}
                />
              ))}
            </div>
          </div>
        </div>
      );
    },
    [draftContent, handleStyleChange],
  );

  const renderBackgroundEditor = useCallback(
    (elementKey: EditableElementKey) => {
      if (!draftContent) {
        return null;
      }
      const currentBackground = getSectionBackground(draftContent, elementKey);
      const imageUrl = currentBackground.type === 'image' ? currentBackground.value : null;

      return (
        <div className="space-y-3">
          <div>
            <label htmlFor={`${elementKey}-background-type`} className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Type de fond
            </label>
            <select
              id={`${elementKey}-background-type`}
              value={currentBackground.type}
              onChange={e => handleBackgroundChange(elementKey, { type: e.target.value as 'color' | 'image' })}
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-orange-500 focus:outline-none focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
            >
              <option value="color">Couleur</option>
              <option value="image">Image</option>
            </select>
          </div>

          {currentBackground.type === 'color' && (
            <div>
              <label htmlFor={`${elementKey}-background-color`} className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Couleur de fond
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <input
                  type="color"
                  id={`${elementKey}-background-color-picker`}
                  value={currentBackground.value ?? '#000000'}
                  onChange={e => handleBackgroundChange(elementKey, { type: 'color', value: e.target.value })}
                  className="absolute inset-y-0 left-0 w-8 h-full opacity-0 cursor-pointer"
                />
                <input
                  type="text"
                  id={`${elementKey}-background-color`}
                  value={currentBackground.value ?? ''}
                  onChange={e => handleBackgroundChange(elementKey, { type: 'color', value: e.target.value })}
                  className="block w-full rounded-md border-gray-300 pl-10 focus:border-orange-500 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="#RRGGBB ou nom de couleur"
                />
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span
                    className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: currentBackground.value ?? 'transparent' }}
                  />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {COLOR_SUGGESTIONS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleBackgroundChange(elementKey, { type: 'color', value: color })}
                    className="h-6 w-6 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 dark:border-gray-600"
                    style={{ backgroundColor: color }}
                    aria-label={`Set background color to ${color}`}
                  />
                ))}
              </div>
            </div>
          )}

          {currentBackground.type === 'image' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Image de fond</label>
              {imageUrl ? (
                <div className="relative mt-1">
                  <img src={imageUrl} alt="Background" className="h-32 w-full object-cover rounded-md" />
                  <button
                    type="button"
                    onClick={() => handleBackgroundChange(elementKey, { type: 'image', value: null })}
                    className="absolute top-2 right-2 rounded-full bg-white p-1 shadow-md text-gray-600 hover:text-gray-900"
                    aria-label="Supprimer l'image de fond"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6 dark:border-gray-600">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                      <label
                        htmlFor={`file-upload-${elementKey}`}
                        className="relative cursor-pointer rounded-md bg-white font-medium text-orange-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-orange-500 focus-within:ring-offset-2 hover:text-orange-500 dark:bg-gray-800"
                      >
                        <span>Télécharger un fichier</span>
                        <input
                          id={`file-upload-${elementKey}`}
                          name={`file-upload-${elementKey}`}
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              handleImageUpload(elementKey, e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                      <p className="pl-1">ou glisser-déposer</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF jusqu'à 10MB</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    },
    [draftContent, handleBackgroundChange, handleImageUpload],
  );

  const renderImageEditor = useCallback(
    (elementKey: EditableElementKey) => {
      if (!draftContent) {
        return null;
      }
      const imageUrl = getImageValue(draftContent, elementKey);

      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Image</label>
          {imageUrl ? (
            <div className="relative mt-1">
              <img src={imageUrl} alt="Custom" className="h-32 w-full object-cover rounded-md" />
              <button
                type="button"
                onClick={() => handleImageRemove(elementKey)}
                className="absolute top-2 right-2 rounded-full bg-white p-1 shadow-md text-gray-600 hover:text-gray-900"
                aria-label="Supprimer l'image"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6 dark:border-gray-600">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                  <label
                    htmlFor={`file-upload-${elementKey}`}
                    className="relative cursor-pointer rounded-md bg-white font-medium text-orange-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-orange-500 focus-within:ring-offset-2 hover:text-orange-500 dark:bg-gray-800"
                  >
                    <span>Télécharger un fichier</span>
                    <input
                      id={`file-upload-${elementKey}`}
                      name={`file-upload-${elementKey}`}
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageUpload(elementKey, e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                  <p className="pl-1">ou glisser-déposer</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF jusqu'à 10MB</p>
              </div>
            </div>
          )}
        </div>
      );
    },
    [draftContent, handleImageRemove, handleImageUpload],
  );

  const renderGlobalThemeEditor = useCallback(() => {
    if (!draftContent) {
      return null;
    }
    const globalStyle = draftContent.globalStyle || {};

    return (
      <div className="space-y-4 p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Couleurs globales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="primary-color" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Couleur primaire
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <input
                type="color"
                id="primary-color-picker"
                value={globalStyle.primaryColor ?? '#f97316'}
                onChange={e => handleGlobalStyleChange('primaryColor', e.target.value)}
                className="absolute inset-y-0 left-0 w-8 h-full opacity-0 cursor-pointer"
              />
              <input
                type="text"
                id="primary-color"
                value={globalStyle.primaryColor ?? ''}
                onChange={e => handleGlobalStyleChange('primaryColor', e.target.value)}
                className="block w-full rounded-md border-gray-300 pl-10 focus:border-orange-500 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                placeholder="#RRGGBB ou nom de couleur"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span
                  className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: globalStyle.primaryColor ?? 'transparent' }}
                />
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="secondary-color" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Couleur secondaire
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <input
                type="color"
                id="secondary-color-picker"
                value={globalStyle.secondaryColor ?? '#f97316'}
                onChange={e => handleGlobalStyleChange('secondaryColor', e.target.value)}
                className="absolute inset-y-0 left-0 w-8 h-full opacity-0 cursor-pointer"
              />
              <input
                type="text"
                id="secondary-color"
                value={globalStyle.secondaryColor ?? ''}
                onChange={e => handleGlobalStyleChange('secondaryColor', e.target.value)}
                className="block w-full rounded-md border-gray-300 pl-10 focus:border-orange-500 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                placeholder="#RRGGBB ou nom de couleur"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span
                  className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: globalStyle.secondaryColor ?? 'transparent' }}
                />
              </div>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6">Typographie globale</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="global-font-family" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Police de caractères principale
            </label>
            <select
              id="global-font-family"
              value={globalStyle.fontFamily ?? ''}
              onChange={e => handleGlobalStyleChange('fontFamily', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-orange-500 focus:outline-none focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
            >
              <option value="">Défaut</option>
              {FONT_FAMILY_SUGGESTIONS.map(font => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="global-font-size" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Taille de police de base
            </label>
            <select
              id="global-font-size"
              value={globalStyle.fontSize ?? ''}
              onChange={e => handleGlobalStyleChange('fontSize', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-orange-500 focus:outline-none focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
            >
              <option value="">Défaut</option>
              {FONT_SIZE_SUGGESTIONS.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }, [draftContent, handleGlobalStyleChange]);

  const renderEditorContent = useMemo(() => {
    if (!draftContent) {
      return null;
    }

    if (activeTab === 'preview') {
      return (
        <SitePreviewCanvas
          siteContent={draftContent}
          products={products}
          onElementClick={handleElementClick}
        />
      );
    }

    if (activeTab === 'theme') {
      return renderGlobalThemeEditor();
    }

    const editableElements = STYLE_EDITABLE_ELEMENT_KEYS.filter(key => {
      if (activeTab === 'content') {
        return TEXT_ELEMENT_KEYS.has(key) || IMAGE_ELEMENT_KEYS.has(key);
      }
      if (activeTab === 'style') {
        return TEXT_ELEMENT_KEYS.has(key) || BACKGROUND_ELEMENT_KEYS.has(key);
      }
      return false;
    });

    return (
      <div className="p-4 space-y-4">
        {editableElements.map(elementKey => (
          <div key={elementKey} className="ui-card p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {ELEMENT_LABELS[elementKey] || elementKey}
            </h3>
            {(TEXT_ELEMENT_KEYS.has(elementKey) && activeTab === 'content') && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Texte</label>
                {elementKey === 'about.description' ? renderRichTextEditor(elementKey) : renderTextEditor(elementKey)}
              </div>
            )}
            {(IMAGE_ELEMENT_KEYS.has(elementKey) && activeTab === 'content') && (
              <div className="mb-3">
                {renderImageEditor(elementKey)}
              </div>
            )}
            {(TEXT_ELEMENT_KEYS.has(elementKey) && activeTab === 'style') && (
              <div className="mb-3">
                {renderStyleEditor(elementKey)}
              </div>
            )}
            {(BACKGROUND_ELEMENT_KEYS.has(elementKey) && activeTab === 'style') && (
              <div className="mb-3">
                {renderBackgroundEditor(elementKey)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }, [draftContent, products, activeTab, handleElementClick, renderGlobalThemeEditor, renderTextEditor, renderRichTextEditor, renderImageEditor, renderStyleEditor, renderBackgroundEditor]);

  const popoverContent = useMemo(() => {
    if (!activeElement || !draftContent) {
      return null;
    }

    const isText = TEXT_ELEMENT_KEYS.has(activeElement);
    const isBackground = BACKGROUND_ELEMENT_KEYS.has(activeElement);
    const isImage = IMAGE_ELEMENT_KEYS.has(activeElement);

    return (
      <div className="p-4 space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {ELEMENT_LABELS[activeElement] || activeElement}
        </h3>
        {isText && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Texte</label>
              {activeElement === 'about.description' ? renderRichTextEditor(activeElement) : renderTextEditor(activeElement)}
            </div>
            {renderStyleEditor(activeElement)}
          </div>
        )}
        {isBackground && renderBackgroundEditor(activeElement)}
        {isImage && renderImageEditor(activeElement)}
      </div>
    );
  }, [activeElement, draftContent, renderTextEditor, renderRichTextEditor, renderStyleEditor, renderBackgroundEditor, renderImageEditor]);

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="flex w-full flex-col lg:w-1/3 lg:border-r lg:border-gray-200 dark:lg:border-gray-700">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Personnalisation du site</h2>
          <div className="flex items-center space-x-2">
            {isSaving && <Loader2 className="h-5 w-5 animate-spin text-orange-500" />}
            {isSuccess && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {isError && <AlertTriangle className="h-5 w-5 text-red-500" />}
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700"
            >
              Enregistrer
            </button>
          </div>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                handleCloseEditor();
              }}
              className={`flex-1 px-4 py-2 text-center text-sm font-medium ${activeTab === tab.id
                ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {renderEditorContent}
        </div>
      </div>

      <div className="relative flex-1 bg-gray-100 dark:bg-gray-800">
        {activeTab === 'preview' && draftContent && (
          <SitePreviewCanvas
            siteContent={draftContent}
            products={products}
            onElementClick={handleElementClick}
            globalStyle={draftContent.globalStyle}
          />
        )}
        {activeElement && activeElementAnchor && createPortal(
          <EditorPopover
            anchorRect={activeElementAnchor}
            onClose={handleCloseEditor}
          >
            {popoverContent}
          </EditorPopover>,
          document.body,
        )}
      </div>
    </div>
  );
};

export default SiteCustomization;

