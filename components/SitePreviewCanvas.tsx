import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SiteContent, Zone } from '../types';
import { getElementTextStyle, getElementBodyTextStyle, getZoneStyle } from '../utils/siteStyleHelpers';
import { useCustomFonts } from '../hooks/useCustomFonts';
import { EditableElement } from './EditorPopover';
import { resolveZoneFromElement } from '../utils/siteCustomization';

interface SitePreviewCanvasProps {
  siteContent: SiteContent;
  onEdit: (id: string, type: 'text' | 'image' | 'link' | 'color' | 'font' | 'zone' | 'globalStyle') => void;
  selectedElement: string | null;
  globalStyle: any;
}

const SitePreviewCanvas: React.FC<SitePreviewCanvasProps> = ({
  siteContent,
  onEdit,
  selectedElement,
  globalStyle,
}) => {
  useCustomFonts(siteContent.assets.library);

  const zoneStyleMap = useMemo(() => {
    const map = new Map<string, React.CSSProperties>();
    siteContent.zones.forEach(zone => {
      map.set(zone.id, getZoneStyle(zone, siteContent.assets.library));
    });
    return map;
  }, [siteContent.zones, siteContent.assets.library]);

  const elementStyles = useMemo(() => {
    const styles: { [key: string]: React.CSSProperties } = {};
    siteContent.elements.forEach(el => {
      styles[el.id] = getElementTextStyle(el.id, globalStyle);
    });
    return styles;
  }, [siteContent.elements, globalStyle]);

  const elementRichText = useMemo(() => {
    const richText: { [key: string]: string } = {};
    siteContent.elements.forEach(el => {
      richText[el.id] = el.richText || '';
    });
    return richText;
  }, [siteContent.elements]);

  const renderZoneContent = useCallback((zone: Zone) => {
    switch (zone.type) {
      case 'header':
        return (
          <header
            className={`relative w-full ${selectedElement === zone.id ? 'border-2 border-blue-500' : ''}`}
            style={zoneStyleMap.get(zone.id)}
            onClick={() => onEdit(zone.id, 'zone')}
          >
            <div className="container mx-auto flex justify-between items-center p-4">
              <EditableElement
                id="navigation.brand"
                label="Modifier le nom de la marque"
                onEdit={onEdit}
                as="span"
                className="login-brand__name"
                style={getElementTextStyle('navigation.brand', globalStyle)}
              >
                {siteContent.navigation.brand}
              </EditableElement>
              <nav>
                <ul className="flex space-x-4">
                  <li>
                    <EditableElement
                      id="navigation.links.home"
                      label="Modifier le lien Accueil"
                      onEdit={onEdit}
                      as="span"
                      className="inline-flex"
                      style={getElementTextStyle('navigation.links.home', globalStyle)}
                    >
                      {siteContent.navigation.links.home.text}
                    </EditableElement>
                  </li>
                  <li>
                    <EditableElement
                      id="navigation.links.menu"
                      label="Modifier le lien Menu"
                      onEdit={onEdit}
                      as="span"
                      className="inline-flex"
                      style={getElementTextStyle('navigation.links.menu', globalStyle)}
                    >
                      {siteContent.navigation.links.menu.text}
                    </EditableElement>
                  </li>
                  <li>
                    <EditableElement
                      id="navigation.links.contact"
                      label="Modifier le lien Contact"
                      onEdit={onEdit}
                      as="span"
                      className="inline-flex"
                      style={getElementTextStyle('navigation.links.contact', globalStyle)}
                    >
                      {siteContent.navigation.links.contact.text}
                    </EditableElement>
                  </li>
                </ul>
              </nav>
            </div>
          </header>
        );
      case 'hero':
        return (
          <section
            className={`relative h-screen flex items-center justify-center text-white ${selectedElement === zone.id ? 'border-2 border-blue-500' : ''}`}
            style={zoneStyleMap.get(zone.id)}
            onClick={() => onEdit(zone.id, 'zone')}
          >
            <img
              src={siteContent.hero.backgroundImage}
              alt="Hero Background"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50"></div>
            <div className="relative z-10 text-center p-4">
              <EditableElement
                id="hero.title"
                label="Modifier le titre du Hero"
                onEdit={onEdit}
                as="h1"
                className="text-5xl font-bold mb-4"
                style={getElementTextStyle('hero.title', globalStyle)}
              >
                {siteContent.hero.title}
              </EditableElement>
              <EditableElement
                id="hero.subtitle"
                label="Modifier le sous-titre du Hero"
                onEdit={onEdit}
                as="p"
                className="text-xl mb-8"
                style={getElementTextStyle('hero.subtitle', globalStyle)}
              >
                {siteContent.hero.subtitle}
              </EditableElement>
              <EditableElement
                id="hero.ctaButtonText"
                label="Modifier le texte du bouton CTA"
                onEdit={onEdit}
                as="button"
                className="bg-brand-primary hover:bg-brand-secondary text-white font-bold py-3 px-8 rounded-full text-lg"
                style={getElementTextStyle('hero.ctaButtonText', globalStyle)}
              >
                {siteContent.hero.ctaButtonText}
              </EditableElement>
            </div>
          </section>
        );
      case 'about':
        return (
          <section
            className={`py-16 ${selectedElement === zone.id ? 'border-2 border-blue-500' : ''}`}
            style={zoneStyleMap.get(zone.id)}
            onClick={() => onEdit(zone.id, 'zone')}
          >
            <div className="container mx-auto px-4 text-center">
              <EditableElement
                id="about.title"
                label="Modifier le titre À Propos"
                onEdit={onEdit}
                as="h2"
                className="text-4xl font-bold mb-8"
                style={getElementTextStyle('about.title', globalStyle)}
              >
                {siteContent.about.title}
              </EditableElement>
              <EditableElement
                id="about.description"
                label="Modifier la description À Propos"
                onEdit={onEdit}
                as="p"
                className="text-lg leading-relaxed max-w-3xl mx-auto"
                style={getElementBodyTextStyle('about.description', globalStyle)}
              >
                {siteContent.about.description}
              </EditableElement>
            </div>
          </section>
        );
      case 'menu':
        return (
          <section
            className={`py-16 ${selectedElement === zone.id ? 'border-2 border-blue-500' : ''}`}
            style={zoneStyleMap.get(zone.id)}
            onClick={() => onEdit(zone.id, 'zone')}
          >
            <div className="container mx-auto px-4 text-center">
              <EditableElement
                id="menu.title"
                label="Modifier le titre du Menu"
                onEdit={onEdit}
                as="h2"
                className="text-4xl font-bold mb-8"
                style={getElementTextStyle('menu.title', globalStyle)}
              >
                {siteContent.menu.title}
              </EditableElement>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
                {siteContent.menu.items.map((item, index) => (
                  <div key={index} className="bg-white p-6 rounded-lg shadow-lg">
                    <img src={item.image} alt={item.name} className="w-full h-48 object-cover rounded-md mb-4" />
                    <EditableElement
                      id={`menu.items.${index}.name`}
                      label={`Modifier le nom de l'élément de menu ${index + 1}`}
                      onEdit={onEdit}
                      as="h3"
                      className="text-2xl font-bold mb-2"
                      style={getElementTextStyle(`menu.items.${index}.name`, globalStyle)}
                    >
                      {item.name}
                    </EditableElement>
                    <EditableElement
                      id={`menu.items.${index}.description`}
                      label={`Modifier la description de l'élément de menu ${index + 1}`}
                      onEdit={onEdit}
                      as="p"
                      className="text-gray-600 mb-4"
                      style={getElementBodyTextStyle(`menu.items.${index}.description`, globalStyle)}
                    >
                      {item.description}
                    </EditableElement>
                    <EditableElement
                      id={`menu.items.${index}.price`}
                      label={`Modifier le prix de l'élément de menu ${index + 1}`}
                      onEdit={onEdit}
                      as="span"
                      className="text-xl font-semibold text-brand-primary"
                      style={getElementTextStyle(`menu.items.${index}.price`, globalStyle)}
                    >
                      {item.price}
                    </EditableElement>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      case 'testimonials':
        return (
          <section
            className={`py-16 bg-gray-100 ${selectedElement === zone.id ? 'border-2 border-blue-500' : ''}`}
            style={zoneStyleMap.get(zone.id)}
            onClick={() => onEdit(zone.id, 'zone')}
          >
            <div className="container mx-auto px-4 text-center">
              <EditableElement
                id="testimonials.title"
                label="Modifier le titre des Témoignages"
                onEdit={onEdit}
                as="h2"
                className="text-4xl font-bold mb-8"
                style={getElementTextStyle('testimonials.title', globalStyle)}
              >
                {siteContent.testimonials.title}
              </EditableElement>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                {siteContent.testimonials.items.map((testimonial, index) => (
                  <div key={index} className="bg-white p-6 rounded-lg shadow-lg">
                    <EditableElement
                      id={`testimonials.items.${index}.quote`}
                      label={`Modifier la citation du témoignage ${index + 1}`}
                      onEdit={onEdit}
                      as="p"
                      className="text-lg italic mb-4"
                      style={getElementBodyTextStyle(`testimonials.items.${index}.quote`, globalStyle)}
                    >
                      {testimonial.quote}
                    </EditableElement>
                    <EditableElement
                      id={`testimonials.items.${index}.author`}
                      label={`Modifier l'auteur du témoignage ${index + 1}`}
                      onEdit={onEdit}
                      as="p"
                      className="font-bold text-brand-primary"
                      style={getElementTextStyle(`testimonials.items.${index}.author`, globalStyle)}
                    >
                      - {testimonial.author}
                    </EditableElement>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      case 'gallery':
        return (
          <section
            className={`py-16 ${selectedElement === zone.id ? 'border-2 border-blue-500' : ''}`}
            style={zoneStyleMap.get(zone.id)}
            onClick={() => onEdit(zone.id, 'zone')}
          >
            <div className="container mx-auto px-4 text-center">
              <EditableElement
                id="gallery.title"
                label="Modifier le titre de la Galerie"
                onEdit={onEdit}
                as="h2"
                className="text-4xl font-bold mb-8"
                style={getElementTextStyle('gallery.title', globalStyle)}
              >
                {siteContent.gallery.title}
              </EditableElement>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                {siteContent.gallery.images.map((image, index) => (
                  <div key={index} className="overflow-hidden rounded-lg shadow-lg">
                    <img src={image.src} alt={image.alt} className="w-full h-64 object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      case 'contact':
        return (
          <section
            className={`py-16 bg-gray-100 ${selectedElement === zone.id ? 'border-2 border-blue-500' : ''}`}
            style={zoneStyleMap.get(zone.id)}
            onClick={() => onEdit(zone.id, 'zone')}
          >
            <div className="container mx-auto px-4 text-center">
              <EditableElement
                id="contact.title"
                label="Modifier le titre Contact"
                onEdit={onEdit}
                as="h2"
                className="text-4xl font-bold mb-8"
                style={getElementTextStyle('contact.title', globalStyle)}
              >
                {siteContent.contact.title}
              </EditableElement>
              <div className="max-w-xl mx-auto text-lg space-y-4">
                <EditableElement
                  id="contact.address"
                  label="Modifier l'adresse"
                  onEdit={onEdit}
                  as="p"
                  style={getElementBodyTextStyle('contact.address', globalStyle)}
                >
                  {siteContent.contact.address}
                </EditableElement>
                <EditableElement
                  id="contact.phone"
                  label="Modifier le numéro de téléphone"
                  onEdit={onEdit}
                  as="p"
                  style={getElementBodyTextStyle('contact.phone', globalStyle)}
                >
                  {siteContent.contact.phone}
                </EditableElement>
                <EditableElement
                  id="contact.email"
                  label="Modifier l'email"
                  onEdit={onEdit}
                  as="p"
                  style={getElementBodyTextStyle('contact.email', globalStyle)}
                >
                  {siteContent.contact.email}
                </EditableElement>
                <EditableElement
                  id="contact.hours"
                  label="Modifier les heures d'ouverture"
                  onEdit={onEdit}
                  as="p"
                  style={getElementBodyTextStyle('contact.hours', globalStyle)}
                >
                  {siteContent.contact.hours}
                </EditableElement>
              </div>
              <div className="mt-8">
                <EditableElement
                  id="contact.mapLinkText"
                  label="Modifier le texte du lien de la carte"
                  onEdit={onEdit}
                  as="a"
                  href={siteContent.contact.findUsMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-primary hover:underline"
                  style={getElementTextStyle('contact.mapLinkText', globalStyle)}
                >
                  {siteContent.contact.mapLinkText}
                </EditableElement>
              </div>
            </div>
          </section>
        );
      case 'footer':
        return (
          <footer
            className={`py-8 bg-gray-800 text-white text-center ${selectedElement === zone.id ? 'border-2 border-blue-500' : ''}`}
            style={zoneStyleMap.get(zone.id)}
            onClick={() => onEdit(zone.id, 'zone')}
          >
            <div className="container mx-auto px-4">
              <EditableElement
                id="footer.copyright"
                label="Modifier le texte de copyright"
                onEdit={onEdit}
                as="p"
                className="text-sm"
                style={getElementBodyTextStyle('footer.copyright', globalStyle)}
              >
                {siteContent.footer.copyright}
              </EditableElement>
            </div>
          </footer>
        );
      default:
        return null;
    }
  }, [siteContent, onEdit, selectedElement, zoneStyleMap, elementStyles, elementRichText, globalStyle]);

  return (
    <div className="relative min-h-screen bg-gray-50 font-sans">
      {siteContent.zones.map(zone => (
        <React.Fragment key={zone.id}>
          {renderZoneContent(zone)}
        </React.Fragment>
      ))}
    </div>
  );
};

export default SitePreviewCanvas;

