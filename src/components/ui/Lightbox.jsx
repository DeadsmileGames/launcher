import { useLanguage } from "../../context/LanguageContext";import { useEffect, useRef } from 'react';
import { X, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { trapFocus } from '../../utils/dom';
import { safeImageUrl } from '../../utils/urls';

export function Lightbox({ images, selectedIndex, onClose, onPrev, onNext }) {const { t } = useLanguage();
  const closeRef = useRef(null);
  const panelRef = useRef(null);
  const callbacks = useRef({ onClose, onPrev, onNext });
  callbacks.current = { onClose, onPrev, onNext };
  const open = selectedIndex !== null && images.length > 0;

  useEffect(() => {
    if (!open) return undefined;
    const release = trapFocus(panelRef.current, () => callbacks.current.onClose(), closeRef.current);
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); callbacks.current.onPrev(); }
      if (event.key === 'ArrowRight') { event.preventDefault(); callbacks.current.onNext(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { release(); window.removeEventListener('keydown', handleKeyDown); };
  }, [open]);

  if (!open) return null;
  const image = safeImageUrl(images[selectedIndex]);
  if (!image) return null;

  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true" aria-label={t("Image viewer")}>
      <div className="lightbox__chrome" ref={panelRef} tabIndex={-1} onClick={(event) => event.stopPropagation()}>
        <button ref={closeRef} type="button" className="lightbox__close" onClick={onClose} aria-label={t("Close image viewer")}>
          <X weight="bold" size={24} />
        </button>
        <div className="lightbox__stage">
          <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={onPrev} aria-label={t("Previous image")}>
            <CaretLeft weight="bold" size={28} />
          </button>
          <div className="lightbox__image-wrap">
            <img src={image} alt={t("Image {0}", { "0": selectedIndex + 1 })} className="lightbox__image" />
          </div>
          <button type="button" className="lightbox__nav lightbox__nav--next" onClick={onNext} aria-label={t("Next image")}>
            <CaretRight weight="bold" size={28} />
          </button>
        </div>
        <div className="lightbox__footer">
          <span>{t("Screenshot")}</span>
          <strong>{selectedIndex + 1} / {images.length}</strong>
        </div>
      </div>
    </div>);

}
