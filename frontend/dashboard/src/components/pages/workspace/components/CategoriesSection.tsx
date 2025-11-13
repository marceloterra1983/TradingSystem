/**
 * Categories Section - Workspace Categories Management
 *
 * CollapsibleCard wrapper for CategoriesCRUDCard
 */

import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from "../../../ui/collapsible-card";
import CategoriesCRUDCard from "../CategoriesCRUDCard";
import { Folder } from '@/icons';

export function CategoriesSection() {
  return (
    <CollapsibleCard cardId="workspace-categories">
      <CollapsibleCardHeader>
        <div>
          <CollapsibleCardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Categorias
          </CollapsibleCardTitle>
          <CollapsibleCardDescription>
            Gerenciamento de categorias do workspace
          </CollapsibleCardDescription>
        </div>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <CategoriesCRUDCard />
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
