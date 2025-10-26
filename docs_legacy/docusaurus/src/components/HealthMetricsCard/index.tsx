import type { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

type TrendDirection = 'up' | 'down' | 'stable';
type StatusType = 'excellent' | 'good' | 'warning' | 'critical';

interface HealthMetricsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: TrendDirection;
  trendValue?: string;
  status?: StatusType;
  icon?: ReactNode;
  onClick?: () => void;
}

const TREND_ARROWS = {
  up: '↑',
  down: '↓',
  stable: '→',
};

const TREND_COLORS = {
  up: 'var(--ifm-color-success)',
  down: 'var(--ifm-color-danger)',
  stable: 'var(--ifm-color-emphasis-600)',
};

const STATUS_COLORS = {
  excellent: 'var(--ifm-color-success)',
  good: 'var(--ifm-color-primary)',
  warning: 'var(--ifm-color-warning)',
  critical: 'var(--ifm-color-danger)',
};

export default function HealthMetricsCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  status = 'good',
  icon,
  onClick,
}: HealthMetricsCardProps): ReactNode {
  const cardClass = clsx(styles.healthCard, {
    [styles.clickable]: !!onClick,
    [styles[`status-${status}`]]: status,
  });

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <article
      className={cardClass}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${title}: ${value}`}
    >
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{title}</h3>
        {icon && <div className={styles.cardIcon}>{icon}</div>}
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardValue}>{value}</div>

        {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}

        {trend && trendValue && (
          <div
            className={styles.trendIndicator}
            style={{ color: TREND_COLORS[trend] }}
            aria-label={`Trend: ${trend} ${trendValue}`}
          >
            <span className={styles.trendArrow}>{TREND_ARROWS[trend]}</span>
            <span className={styles.trendValue}>{trendValue}</span>
          </div>
        )}
      </div>

      {status && (
        <div
          className={styles.statusBar}
          style={{ backgroundColor: STATUS_COLORS[status] }}
          aria-label={`Status: ${status}`}
        />
      )}
    </article>
  );
}
