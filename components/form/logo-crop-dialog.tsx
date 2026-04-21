"use client";

import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { X, Check, ZoomIn, ZoomOut } from "lucide-react";

type Props = {
  src: string;
  onConfirm: (croppedBase64: string) => void;
  onCancel: () => void;
};

function centerAspectCrop(width: number, height: number) {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 80 }, width / height, width, height),
    width,
    height
  );
}

async function getCroppedImage(image: HTMLImageElement, crop: PixelCrop): Promise<string> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvas.toDataURL("image/png");
}

export function LogoCropDialog({ src, onConfirm, onCancel }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height));
  }, []);

  async function handleConfirm() {
    if (!imgRef.current || !completedCrop) {
      // Pokud uživatel neořezal, použij originál
      onConfirm(src);
      return;
    }
    const cropped = await getCroppedImage(imgRef.current, completedCrop);
    onConfirm(cropped);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">Oříznout logo</p>
            <p className="text-xs text-muted-foreground mt-0.5">Táhni za rohy pro výběr oblasti. Volný výběr bez omezení poměru stran.</p>
          </div>
          <button onClick={onCancel} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Crop area */}
        <div className="p-5 flex items-center justify-center bg-muted/30 min-h-[300px]">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            ruleOfThirds
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt="Logo k ořezu"
              onLoad={onImageLoad}
              style={{ maxHeight: "400px", maxWidth: "100%" }}
            />
          </ReactCrop>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ZoomIn className="h-3.5 w-3.5" />
            Výběr bez omezení — lze oříznout libovolnou část
          </p>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors"
            >
              Zrušit
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" />
              Použít
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
