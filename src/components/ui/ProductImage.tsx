"use client";
import React, { useState } from "react";
import { ImageIcon } from "lucide-react";
import { Product } from "@/types";

interface ProductImageProps {
  product: Product;
  className?: string;
  alt?: string;
}

export function ProductImage({ product, className, alt }: ProductImageProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [hasAttemptedExternal, setHasAttemptedExternal] = useState(false);
  const [hasAttemptedInternal, setHasAttemptedInternal] = useState(false);

  const placeholder = "/images/placeholder.png";

  // Determine the starting image
  React.useEffect(() => {
    if (product.externalImageUrl) {
      setImgSrc(product.externalImageUrl);
      setHasAttemptedExternal(true);
    } else if (product.images && product.images.length > 0) {
      setImgSrc(product.images[0]);
      setHasAttemptedInternal(true);
    } else {
      setImgSrc(placeholder);
    }
  }, [product.externalImageUrl, product.images]);

  const handleError = () => {
    if (!hasAttemptedExternal && product.externalImageUrl) {
      setImgSrc(product.externalImageUrl);
      setHasAttemptedExternal(true);
    } else if (!hasAttemptedInternal && product.images && product.images.length > 0) {
      setImgSrc(product.images[0]);
      setHasAttemptedInternal(true);
    } else {
      setImgSrc(placeholder);
    }
  };

  // Special case: if the effect set the initial src, we still need to track that
  // but the useEffect above already sets the flags.

  return (
    <img
      src={imgSrc || placeholder}
      alt={alt || product.name}
      onError={handleError}
      className={className}
    />
  );
}
