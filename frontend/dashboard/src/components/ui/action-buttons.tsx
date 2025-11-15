import { Button } from "./button";
import { Eye, Edit2, Trash2, Check, X, Plus } from "@/icons";
import { cn } from "../../lib/utils";

/**
 * Standardized Action Button Components
 * Provides consistent icon buttons for common CRUD operations across the application
 *
 * Design Standards:
 * - Size: h-10 w-10 (40x40px)
 * - Icon: h-5 w-5 (20x20px)
 * - Padding: p-0 (no padding, icon centered)
 * - Style: ghost variant with hover effects
 * - ALL ADD BUTTONS: Use only "+" icon, NO TEXT (site-wide standard)
 *
 * Usage:
 * 1. ActionButtons - Group component for multiple actions in table rows
 * 2. Individual buttons (AddButton, ViewButton, etc) - For standalone use
 * 3. Add buttons: Always icon-only with descriptive title attribute for accessibility
 */

interface ActionButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCheck?: () => void;
  onUncheck?: () => void;
  viewTooltip?: string;
  editTooltip?: string;
  deleteTooltip?: string;
  checkTooltip?: string;
  uncheckTooltip?: string;
  editDisabled?: boolean;
  deleteDisabled?: boolean;
  className?: string;
}

export function ActionButtons({
  onView,
  onEdit,
  onDelete,
  onCheck,
  onUncheck,
  viewTooltip = "Visualizar",
  editTooltip = "Editar",
  deleteTooltip = "Deletar",
  checkTooltip = "Verificar",
  uncheckTooltip = "Desmarcar",
  editDisabled = false,
  deleteDisabled = false,
  className,
}: ActionButtonsProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {onView && (
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={onView}
          title={viewTooltip}
        >
          <Eye className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </Button>
      )}

      {onEdit && (
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={onEdit}
          disabled={editDisabled}
          title={editTooltip}
        >
          <Edit2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </Button>
      )}

      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 hover:text-red-700"
          onClick={onDelete}
          disabled={deleteDisabled}
          title={deleteTooltip}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      )}

      {onCheck && (
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 hover:bg-green-50 dark:hover:bg-green-950 text-green-600 hover:text-green-700"
          onClick={onCheck}
          title={checkTooltip}
        >
          <Check className="h-5 w-5" />
        </Button>
      )}

      {onUncheck && (
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600"
          onClick={onUncheck}
          title={uncheckTooltip}
        >
          <X className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}

/**
 * Individual Action Button Components for more flexibility
 */

interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
  className?: string;
}

export function ViewButton({
  onClick,
  disabled,
  tooltip = "Visualizar",
  className,
}: ActionButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800",
        className,
      )}
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
    >
      <Eye className="h-5 w-5 text-gray-600 dark:text-gray-400" />
    </Button>
  );
}

export function EditButton({
  onClick,
  disabled,
  tooltip = "Editar",
  className,
}: ActionButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800",
        className,
      )}
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
    >
      <Edit2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
    </Button>
  );
}

export function DeleteButton({
  onClick,
  disabled,
  tooltip = "Deletar",
  className,
}: ActionButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-10 w-10 p-0 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 hover:text-red-700",
        className,
      )}
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
    >
      <Trash2 className="h-5 w-5" />
    </Button>
  );
}

export function CheckButton({
  onClick,
  disabled,
  tooltip = "Verificar",
  className,
}: ActionButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-10 w-10 p-0 hover:bg-green-50 dark:hover:bg-green-950 text-green-600 hover:text-green-700",
        className,
      )}
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
    >
      <Check className="h-5 w-5" />
    </Button>
  );
}

export function UncheckButton({
  onClick,
  disabled,
  tooltip = "Desmarcar",
  className,
}: ActionButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600",
        className,
      )}
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
    >
      <X className="h-5 w-5" />
    </Button>
  );
}

export function AddButton({
  onClick,
  disabled,
  tooltip = "Adicionar",
  className,
}: ActionButtonProps) {
  return (
    <Button
      variant="default"
      size="sm"
      className={cn("h-10 w-10 p-0", className)}
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
    >
      <Plus className="h-5 w-5" />
    </Button>
  );
}
