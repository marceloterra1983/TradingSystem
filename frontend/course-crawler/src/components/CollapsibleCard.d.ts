import type { DragEvent, ReactNode } from 'react';
type DragHandler = (event: DragEvent<HTMLElement>) => void;
interface CollapsibleCardProps {
    cardId: string;
    title: string;
    icon?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    collapsed: boolean;
    onToggle: () => void;
    children: ReactNode;
    draggable?: boolean;
    isDragging?: boolean;
    isDragOver?: boolean;
    onDragStart?: DragHandler;
    onDragEnd?: () => void;
    onDragOver?: DragHandler;
    onDrop?: DragHandler;
    onDragLeave?: () => void;
}
export declare function CollapsibleCard({ title, icon, description, actions, collapsed, onToggle, children, draggable, isDragging, isDragOver, onDragStart, onDragEnd, onDragOver, onDrop, onDragLeave, }: CollapsibleCardProps): import("react/jsx-runtime").JSX.Element;
export {};
