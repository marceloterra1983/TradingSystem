import type { DragEvent, ReactNode } from 'react';
import { ChevronsUpDown } from 'lucide-react';

type DragHandler = (event: DragEvent<HTMLElement>) => void;

function classNames(
  ...values: Array<string | undefined | false | null>
) {
  return values.filter(Boolean).join(' ');
}

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

export function CollapsibleCard({
  title,
  icon,
  description,
  actions,
  collapsed,
  onToggle,
  children,
  draggable,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onDragLeave,
}: CollapsibleCardProps) {
  return (
    <section
      className={classNames(
        'ts-card',
        isDragging && 'ts-card--dragging',
        isDragOver && 'ts-card--drop-target',
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
    >
      <div className="ts-card__header">
        <button
          type="button"
          className="ts-card__handle"
          draggable={draggable}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          aria-label="Mover seção"
        >
          <span aria-hidden="true" />
        </button>
        <div className="ts-card__header-main">
          <div className="ts-card__title-group">
            {icon}
            <div>
              <h2>{title}</h2>
              {description && <p className="muted">{description}</p>}
            </div>
          </div>
          <div className="header-actions">
            {actions}
            <button
              type="button"
              className="ghost ts-card__collapse"
              onClick={onToggle}
              aria-expanded={!collapsed}
              aria-label={
                collapsed ? 'Expandir seção' : 'Recolher seção'
              }
            >
              <ChevronsUpDown
                size={18}
                className={collapsed ? 'chevron rotated' : 'chevron'}
              />
            </button>
          </div>
        </div>
      </div>
      <div
        className={classNames('ts-card__body', collapsed && 'collapsed')}
        aria-hidden={collapsed}
      >
        {children}
      </div>
    </section>
  );
}
