"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"
import { Edit, Trash2, CheckCircle, XCircle, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface Product {
  id: number
  title: string
  is_sold: boolean
}

export interface ListingActionsProps {
  listing: Product
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onToggleSold: (id: number, sold: boolean) => void
  loading?: boolean
  disabled?: boolean
  variant?: "default" | "compact" | "dropdown"
  className?: string
}

export function ListingActions({
  listing,
  onEdit,
  onDelete,
  onToggleSold,
  loading = false,
  disabled = false,
  variant = "default",
  className,
}: ListingActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [soldDialogOpen, setSoldDialogOpen] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)

  const handleEdit = React.useCallback(() => {
    if (!loading && !disabled) {
      onEdit(listing.id)
    }
  }, [onEdit, listing.id, loading, disabled])

  const handleDelete = React.useCallback(async () => {
    if (!loading && !disabled) {
      setActionLoading('delete')
      try {
        await onDelete(listing.id)
        setDeleteDialogOpen(false)
      } finally {
        setActionLoading(null)
      }
    }
  }, [onDelete, listing.id, loading, disabled])

  const handleToggleSold = React.useCallback(async () => {
    if (!loading && !disabled) {
      setActionLoading('sold')
      try {
        await onToggleSold(listing.id, !listing.is_sold)
        setSoldDialogOpen(false)
      } finally {
        setActionLoading(null)
      }
    }
  }, [onToggleSold, listing.id, listing.is_sold, loading, disabled])

  const isLoading = loading || actionLoading !== null
  const isDisabled = disabled || isLoading

  if (variant === "dropdown") {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 w-8 p-0", className)}
              disabled={isDisabled}
              aria-label={`Actions for ${listing.title}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEdit} disabled={isDisabled}>
              <Edit className="mr-2 h-4 w-4" />
              Edit listing
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setSoldDialogOpen(true)} 
              disabled={isDisabled}
            >
              {listing.is_sold ? (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Mark as available
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as sold
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setDeleteDialogOpen(true)} 
              disabled={isDisabled}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete listing
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete listing"
          description={`Are you sure you want to delete "${listing.title}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
          onConfirm={handleDelete}
          loading={actionLoading === 'delete'}
        />

        <ConfirmDialog
          open={soldDialogOpen}
          onOpenChange={setSoldDialogOpen}
          title={listing.is_sold ? "Mark as available" : "Mark as sold"}
          description={
            listing.is_sold
              ? `Mark "${listing.title}" as available for sale again?`
              : `Mark "${listing.title}" as sold? This will hide it from public listings.`
          }
          confirmText={listing.is_sold ? "Mark available" : "Mark sold"}
          cancelText="Cancel"
          onConfirm={handleToggleSold}
          loading={actionLoading === 'sold'}
        />
      </>
    )
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEdit}
          disabled={isDisabled}
          aria-label={`Edit ${listing.title}`}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSoldDialogOpen(true)}
          disabled={isDisabled}
          aria-label={listing.is_sold ? `Mark ${listing.title} as available` : `Mark ${listing.title} as sold`}
        >
          {listing.is_sold ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={isDisabled}
          aria-label={`Delete ${listing.title}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>

        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete listing"
          description={`Are you sure you want to delete "${listing.title}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
          onConfirm={handleDelete}
          loading={actionLoading === 'delete'}
        />

        <ConfirmDialog
          open={soldDialogOpen}
          onOpenChange={setSoldDialogOpen}
          title={listing.is_sold ? "Mark as available" : "Mark as sold"}
          description={
            listing.is_sold
              ? `Mark "${listing.title}" as available for sale again?`
              : `Mark "${listing.title}" as sold? This will hide it from public listings.`
          }
          confirmText={listing.is_sold ? "Mark available" : "Mark sold"}
          cancelText="Cancel"
          onConfirm={handleToggleSold}
          loading={actionLoading === 'sold'}
        />
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleEdit}
        disabled={isDisabled}
        aria-label={`Edit ${listing.title}`}
      >
        <Edit className="mr-2 h-4 w-4" />
        Edit
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setSoldDialogOpen(true)}
        disabled={isDisabled}
        aria-label={listing.is_sold ? `Mark ${listing.title} as available` : `Mark ${listing.title} as sold`}
      >
        {listing.is_sold ? (
          <>
            <XCircle className="mr-2 h-4 w-4" />
            Mark Available
          </>
        ) : (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark Sold
          </>
        )}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDeleteDialogOpen(true)}
        disabled={isDisabled}
        aria-label={`Delete ${listing.title}`}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete listing"
        description={`Are you sure you want to delete "${listing.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDelete}
        loading={actionLoading === 'delete'}
      />

      <ConfirmDialog
        open={soldDialogOpen}
        onOpenChange={setSoldDialogOpen}
        title={listing.is_sold ? "Mark as available" : "Mark as sold"}
        description={
          listing.is_sold
            ? `Mark "${listing.title}" as available for sale again?`
            : `Mark "${listing.title}" as sold? This will hide it from public listings.`
        }
        confirmText={listing.is_sold ? "Mark available" : "Mark sold"}
        cancelText="Cancel"
        onConfirm={handleToggleSold}
        loading={actionLoading === 'sold'}
      />
    </div>
  )
}