"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
  onConfirm: () => void
  onCancel?: () => void
  loading?: boolean
  disabled?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  loading = false,
  disabled = false,
}: ConfirmDialogProps) {
  const handleConfirm = React.useCallback(() => {
    if (!loading && !disabled) {
      onConfirm()
    }
  }, [onConfirm, loading, disabled])

  const handleCancel = React.useCallback(() => {
    if (!loading) {
      onCancel?.()
      onOpenChange?.(false)
    }
  }, [onCancel, onOpenChange, loading])

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (!loading) {
      onOpenChange?.(newOpen)
      if (!newOpen) {
        onCancel?.()
      }
    }
  }, [onOpenChange, onCancel, loading])

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={handleCancel}
            disabled={loading}
            aria-label={`${cancelText} - Close dialog without performing action`}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading || disabled}
            className={cn(
              variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
            aria-label={`${confirmText} - Perform the requested action`}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div 
                  className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
                <span>Loading...</span>
              </div>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}