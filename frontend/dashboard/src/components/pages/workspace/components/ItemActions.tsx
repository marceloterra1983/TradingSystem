import { useState } from 'react';
import { ActionButtons } from '../../../ui/action-buttons';
import { ViewItemDialog } from './ViewItemDialog';
import { EditItemDialog } from './EditItemDialog';
import { DeleteItemDialog } from './DeleteItemDialog';
import type { Item } from '../types/workspace.types';

interface ItemActionsProps {
  item: Item;
  usingFallbackData?: boolean;
}

export function ItemActions({ item, usingFallbackData }: ItemActionsProps) {
  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  return (
    <>
      <ActionButtons
        onView={() => setShowView(true)}
        onEdit={() => setShowEdit(true)}
        onDelete={() => setShowDelete(true)}
        editDisabled={usingFallbackData}
        deleteDisabled={usingFallbackData}
      />

      {showView && (
        <ViewItemDialog
          item={item}
          open={showView}
          onOpenChange={setShowView}
        />
      )}
      {showEdit && (
        <EditItemDialog
          item={item}
          usingFallbackData={usingFallbackData}
          open={showEdit}
          onOpenChange={setShowEdit}
        />
      )}
      {showDelete && (
        <DeleteItemDialog
          item={item}
          usingFallbackData={usingFallbackData}
          open={showDelete}
          onOpenChange={setShowDelete}
        />
      )}
    </>
  );
}
