"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "./button";

interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}

export function ImageUpload({
  value,
  onChange,
  disabled = false,
  label = "Resim Yükle"
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Value prop'u değiştiğinde preview'i güncelle
  useEffect(() => {
    console.log('ImageUpload value değişti:', value);
    console.log('ImageUpload preview state:', preview);
    setPreview(value || null);
  }, [value]);

  // Preview state'i değiştiğinde logla
  useEffect(() => {
    console.log('ImageUpload preview state güncellendi:', preview);
  }, [preview]);

  // Handle paste events to capture clipboard images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (!blob) continue;

          const reader = new FileReader();
          reader.onload = (event) => {
            if (typeof event.target?.result === 'string') {
              setPreview(event.target.result);
              onChange(event.target.result);
            }
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    };

    // Add paste event listener to the document
    document.addEventListener('paste', handlePaste);
    
    // Add paste event listener to the container
    const container = containerRef.current;
    if (container) {
      container.addEventListener('paste', handlePaste);
    }

    return () => {
      document.removeEventListener('paste', handlePaste);
      if (container) {
        container.removeEventListener('paste', handlePaste);
      }
    };
  }, [disabled, onChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setPreview(event.target.result);
        onChange(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div ref={containerRef} className="space-y-2">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={disabled}
      />
      
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="max-h-64 rounded-md object-contain border border-border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          onClick={handleClick}
          className={`flex flex-col items-center justify-center rounded-md border border-dashed p-6 cursor-pointer hover:border-primary transition-colors ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <Upload className="h-10 w-10 text-muted-foreground mb-2" />
          <div className="text-sm text-muted-foreground text-center space-y-1">
            <p className="font-medium">{label}</p>
            <p>Resim yüklemek için tıklayın veya Ctrl+V ile yapıştırın</p>
          </div>
        </div>
      )}
    </div>
  );
}
