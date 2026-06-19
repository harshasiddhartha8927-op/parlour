import { useEffect, useState, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Info, Maximize2 } from "lucide-react";
import { fetchServiceReferences, getThumbnailUrl } from "../utils/galleryStorage";

export default function StyleGalleryModal({ isOpen, onClose, service }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(null); // Lightbox index, null = grid view
  
  // Touch coordinates for swipe gestures
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  useEffect(() => {
    if (!isOpen || !service) return;

    setLoading(true);
    setImages([]);
    setActiveImageIndex(null);

    const loadImages = async () => {
      try {
        const urls = await fetchServiceReferences(service.id);
        setImages(urls);
      } catch (err) {
        console.error("Failed to load reference images:", err);
      } finally {
        setLoading(false);
      }
    };

    loadImages();
  }, [isOpen, service]);

  if (!isOpen || !service) return null;

  // Slideshow Navigation
  const handlePrev = () => {
    if (images.length === 0) return;
    setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (images.length === 0) return;
    setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // Mobile Swipe Handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      handleNext(); // Swiped left -> next
    } else if (diff < -50) {
      handlePrev(); // Swiped right -> prev
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Close lightbox on escape press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (activeImageIndex !== null) {
          setActiveImageIndex(null);
        } else {
          onClose();
        }
      } else if (e.key === "ArrowLeft" && activeImageIndex !== null) {
        handlePrev();
      } else if (e.key === "ArrowRight" && activeImageIndex !== null) {
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImageIndex, onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all duration-300">
      
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl animate-fade-in border border-rose/10 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-rose/10 pb-4 mb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose">Style Inspiration Gallery</span>
            <h2 className="font-display text-2xl font-bold text-plum mt-0.5">{service.name} References</h2>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="rounded-full p-2 text-plum/60 hover:bg-rose/10 hover:text-rose transition-colors duration-200"
            aria-label="Close Gallery"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-rose/20 border-t-rose rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-plum/60 animate-pulse">Loading gallery images...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-16 text-sm text-plum/50 italic">
              No reference images uploaded for this service yet.
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Image Grid Layout */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {images.map((imgUrl, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className="group relative cursor-pointer overflow-hidden rounded-xl border border-rose/10 bg-petal/10 aspect-square shadow-sm transition hover:shadow-md"
                  >
                    <img 
                      src={getThumbnailUrl(imgUrl)} 
                      alt={`${service.name} reference ${idx + 1}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <span className="bg-white/90 text-plum text-xs font-bold rounded-lg px-2.5 py-1.5 flex items-center gap-1 shadow-sm">
                        <Maximize2 size={12} className="text-rose" />
                        Preview
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              <div className="rounded-xl bg-petal/30 p-3.5 border border-rose/5 flex items-start gap-2.5 text-xs text-plum/75 leading-relaxed font-medium">
                <Info size={16} className="text-rose shrink-0 mt-0.5" />
                <p>
                  <strong>Disclaimer:</strong> Images are for reference purposes only. Actual results may vary based on hair type, skin type, texture, length and individual conditions.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Fullscreen Slideshow Overlay */}
      {activeImageIndex !== null && (
        <div 
          className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Lightbox Header Controls */}
          <div className="absolute top-4 right-4 flex items-center gap-3 z-[120]">
            <span className="text-white/80 font-mono text-sm">
              {activeImageIndex + 1} / {images.length}
            </span>
            <button 
              type="button"
              onClick={() => setActiveImageIndex(null)}
              className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
              aria-label="Close Lightbox"
            >
              <X size={22} />
            </button>
          </div>

          {/* Lightbox Image Container */}
          <div className="relative flex items-center justify-center max-w-4xl w-full h-[70vh]">
            
            {/* Previous Button */}
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-0 md:left-4 z-[120] rounded-full bg-black/45 p-3 text-white border border-white/10 hover:bg-black/60 transition-colors"
              aria-label="Previous Image"
            >
              <ChevronLeft size={24} />
            </button>

            {/* Main Fullscreen Image */}
            <img 
              src={images[activeImageIndex]} 
              alt={`${service.name} fullscreen reference`}
              className="max-h-full max-w-full object-contain rounded-lg animate-fade-in shadow-2xl select-none"
            />

            {/* Next Button */}
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-0 md:right-4 z-[120] rounded-full bg-black/45 p-3 text-white border border-white/10 hover:bg-black/60 transition-colors"
              aria-label="Next Image"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Thumbnail Strip beneath Large Image */}
          <div className="mt-6 flex gap-2 overflow-x-auto max-w-full p-2 scrollbar-thin">
            {images.map((imgUrl, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all duration-200 ${
                  activeImageIndex === idx ? "border-rose scale-105" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img 
                  src={getThumbnailUrl(imgUrl)} 
                  alt="strip preview"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          {/* Bottom Swipe hint & disclaimer */}
          <p className="text-white/50 text-[10px] uppercase font-bold tracking-widest mt-4 animate-pulse md:hidden">
            ← Swipe to navigate →
          </p>
        </div>
      )}
    </div>
  );
}
