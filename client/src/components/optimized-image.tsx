import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  placeholder?: string;
  fallbackSrc?: string;
  aspectRatio?: string;
}

interface ImageVariant {
  width: number;
  format: string;
  url: string;
}

// Check if browser supports a format
const supportsFormat = (format: string): boolean => {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  switch (format) {
    case 'avif':
      return canvas.toDataURL('image/avif').indexOf('image/avif') === 5;
    case 'webp':
      return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
    default:
      return true;
  }
};

// Get the best format supported by the browser
const getBestFormat = (): string => {
  if (supportsFormat('avif')) return 'avif';
  if (supportsFormat('webp')) return 'webp';
  return 'jpeg';
};

// Generate responsive image URLs based on the base URL
const generateImageVariants = (baseUrl: string): ImageVariant[] => {
  const variants: ImageVariant[] = [];
  const sizes = [160, 320, 640, 1280, 1920];
  const formats = ['avif', 'webp', 'jpeg'];
  
  // Check if this is an optimized image path (has the processed structure)
  const isOptimized = baseUrl.includes('/competitions/') || baseUrl.includes('/teams/') || baseUrl.includes('/catches/');
  
  if (!isOptimized) {
    // Return original URL for non-optimized images
    return [{ width: 1280, format: 'jpeg', url: baseUrl }];
  }
  
  // Generate variants for optimized images
  for (const width of sizes) {
    for (const format of formats) {
      const url = baseUrl.replace(/\.[^.]*$/, `-${width}w.${format}`);
      variants.push({ width, format, url });
    }
  }
  
  return variants;
};

export default function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  sizes = "(min-width: 1024px) 320px, (min-width: 768px) 280px, (min-width: 640px) 240px, 200px",
  priority = false,
  placeholder,
  fallbackSrc,
  aspectRatio,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' }
    );
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => observer.disconnect();
  }, [priority, isInView]);
  
  const variants = generateImageVariants(src);
  const bestFormat = getBestFormat();
  
  // Get srcSet for the best supported format
  const getSrcSet = (format: string) => {
    return variants
      .filter(v => v.format === format)
      .map(v => `${v.url} ${v.width}w`)
      .join(', ');
  };
  
  // Get fallback src (smallest JPEG variant or original)
  const fallbackUrl = variants.find(v => v.format === 'jpeg')?.url || fallbackSrc || src;
  
  const handleLoad = () => {
    setIsLoaded(true);
  };
  
  const handleError = () => {
    setError(true);
    setIsLoaded(true);
  };
  
  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      style={{
        aspectRatio: aspectRatio || (width && height ? `${width}/${height}` : undefined),
      }}
    >
      {/* Placeholder while loading */}
      {placeholder && !isLoaded && (
        <img
          src={placeholder}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110 transition-opacity duration-300"
          aria-hidden="true"
        />
      )}
      
      {/* Main image */}
      {isInView && (
        <picture className="block w-full h-full">
          {/* AVIF sources */}
          {variants.some(v => v.format === 'avif') && (
            <source
              type="image/avif"
              srcSet={getSrcSet('avif')}
              sizes={sizes}
            />
          )}
          
          {/* WebP sources */}
          {variants.some(v => v.format === 'webp') && (
            <source
              type="image/webp"
              srcSet={getSrcSet('webp')}
              sizes={sizes}
            />
          )}
          
          {/* JPEG fallback */}
          <img
            ref={imgRef}
            src={error ? (fallbackSrc || src) : fallbackUrl}
            srcSet={!error ? getSrcSet('jpeg') : undefined}
            sizes={sizes}
            alt={alt}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            width={width}
            height={height}
            onLoad={handleLoad}
            onError={handleError}
            data-testid={`optimized-image-${alt.replace(/\s+/g, '-').toLowerCase()}`}
          />
        </picture>
      )}
      
      {/* Loading state */}
      {!isLoaded && !placeholder && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
    </div>
  );
}