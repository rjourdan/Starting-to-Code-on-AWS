"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { X, Upload, Image as ImageIcon, Star } from "lucide-react"

export interface ProductImage {
  id: number
  url: string
  is_primary: boolean
}

export interface ImageManagerProps {
  images: ProductImage[]
  onUpload: (files: File[]) => void
  onDelete: (imageId: number) => void
  onSetPrimary: (imageId: number) => void
  onReorder?: (images: ProductImage[]) => void
  maxImages?: number
  loading?: boolean
  disabled?: boolean
  className?: string
}

export function ImageManager({
  images,
  onUpload,
  onDelete,
  onSetPrimary,
  onReorder,
  maxImages = 6,
  loading = false,
  disabled = false,
  className,
}: ImageManagerProps) {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileSelect = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      onUpload(files)
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onUpload])

  const handleDrop = React.useCallback((event: React.DragEvent) => {
    event.preventDefault()
    if (disabled || loading) return

    const files = Array.from(event.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    )
    if (files.length > 0) {
      onUpload(files)
    }
  }, [onUpload, disabled, loading])

  const handleDragOver = React.useCallback((event: React.DragEvent) => {
    event.preventDefault()
  }, [])

  const handleImageDragStart = React.useCallback((event: React.DragEvent, index: number) => {
    if (disabled || loading) return
    setDraggedIndex(index)
    event.dataTransfer.effectAllowed = 'move'
  }, [disabled, loading])

  const handleImageDragOver = React.useCallback((event: React.DragEvent, index: number) => {
    event.preventDefault()
    if (draggedIndex === null || disabled || loading) return
    setDragOverIndex(index)
  }, [draggedIndex, disabled, loading])

  const handleImageDragEnd = React.useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex && onReorder) {
      const newImages = [...images]
      const draggedImage = newImages[draggedIndex]
      newImages.splice(draggedIndex, 1)
      newImages.splice(dragOverIndex, 0, draggedImage)
      onReorder(newImages)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [draggedIndex, dragOverIndex, images, onReorder])

  const handleImageDragLeave = React.useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const canAddMore = images.length < maxImages

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      {canAddMore && (
        <div
          className={cn(
            "border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center transition-colors",
            "hover:border-muted-foreground/50 hover:bg-muted/50",
            disabled && "opacity-50 cursor-not-allowed",
            loading && "opacity-50"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            disabled={disabled || loading}
            className="hidden"
            aria-label="Upload images"
          />
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto font-medium"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || loading}
              >
                Click to upload
              </Button>
              {" or drag and drop"}
            </div>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, GIF up to 10MB ({images.length}/{maxImages} images)
            </p>
          </div>
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={cn(
                "relative group aspect-square rounded-lg overflow-hidden border-2 transition-all",
                image.is_primary ? "border-primary ring-2 ring-primary/20" : "border-border",
                draggedIndex === index && "opacity-50",
                dragOverIndex === index && "ring-2 ring-primary/50",
                onReorder && !disabled && !loading && "cursor-move"
              )}
              draggable={onReorder && !disabled && !loading}
              onDragStart={(e) => handleImageDragStart(e, index)}
              onDragOver={(e) => handleImageDragOver(e, index)}
              onDragEnd={handleImageDragEnd}
              onDragLeave={handleImageDragLeave}
            >
              <img
                src={image.url}
                alt={`Product image ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              
              {/* Primary indicator */}
              {image.is_primary && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  Primary
                </div>
              )}

              {/* Action buttons */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!image.is_primary && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => onSetPrimary(image.id)}
                    disabled={disabled || loading}
                    aria-label="Set as primary image"
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(image.id)}
                  disabled={disabled || loading}
                  aria-label="Delete image"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {images.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No images uploaded yet</p>
          <p className="text-xs">Add up to {maxImages} images to showcase your item</p>
        </div>
      )}

      {/* Help text */}
      {images.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• The first image or image marked with a star will be the main photo</p>
          {onReorder && <p>• Drag and drop images to reorder them</p>}
          <p>• Click the star to set an image as primary</p>
        </div>
      )}
    </div>
  )
}