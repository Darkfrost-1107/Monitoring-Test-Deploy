import type { ReactNode } from 'react';
import { Card } from '@shared/ui/card';


interface StatCardProps {
  title: string;
  icon: ReactNode;
  value: string | number;
  trendText?: string;
  trendType?: 'success' | 'warning' | 'danger' | 'neutral';
  progressValue?: number; // Para la barrita de progreso (0 a 100)
  variant?: 'default' | 'solidDestructive' | 'solidPrimary';
  bottomAccent?: 'primary' | 'success' | 'destructive';
  /** Clase para el tamaño del valor. Por defecto text-3xl (ideal para números);
   *  usa uno menor cuando el valor es texto largo, p. ej. nombres completos. */
  valueClassName?: string;
}

export const StatCard = ({
  title,
  icon,
  value,
  trendText,
  trendType = 'neutral',
  progressValue,
  variant = 'default',
  bottomAccent,
  valueClassName = 'text-3xl',
}: StatCardProps) => {
  const trendColors = {
    success: 'text-green-600 bg-green-500/10',
    warning: 'text-amber-600 bg-amber-500/10',
    danger: 'text-destructive bg-destructive/10',
    neutral: 'text-text-muted bg-muted',
  };

  const isSolid = variant !== 'default';

  const cardClasses = {
    default: 'bg-card text-card-foreground border-border',
    solidDestructive: 'bg-destructive text-destructive-foreground border-transparent',
    solidPrimary: 'bg-primary text-primary-foreground border-transparent',
  };

  const titleClasses = isSolid ? 'text-current opacity-80' : 'text-text-muted';
  const iconClasses = isSolid ? 'text-current opacity-80' : 'text-text-muted';
  const valueClasses = isSolid ? 'text-current' : 'text-text';

  const accentClasses = {
    primary: 'border-b-[6px] border-b-primary',
    success: 'border-b-[6px] border-b-green-500',
    destructive: 'border-b-[6px] border-b-destructive',
  };
  const finalCardClass = `p-4 shadow-xs flex flex-col justify-between h-full border ${cardClasses[variant]} ${bottomAccent ? accentClasses[bottomAccent] : ''}`;

  return (
    <Card className={finalCardClass}>
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className={`text-xs font-bold uppercase tracking-wider ${titleClasses}`}>
            {title}
          </span>
          <div className={iconClasses}>{icon}</div>
        </div>
        <div className={`${valueClassName} font-extrabold tracking-tight ${valueClasses}`}>{value}</div>
      </div>

      <div className="mt-2">
        {progressValue !== undefined ? (
          <div>
            <div className={`h-2 w-full rounded-full overflow-hidden ${isSolid ? 'bg-black/20' : 'bg-muted'}`}>
              <div
                className={`h-full rounded-full transition-all ${isSolid ? 'bg-white' : 'bg-green-500'}`}
                style={{ width: `${progressValue}%` }}
              />
            </div>
            {trendText && (
              <span className={`block mt-2 text-xs font-medium ${isSolid ? 'text-current opacity-80' : 'text-text-muted'}`}>{trendText}</span>
            )}
          </div>
        ) : (
          trendText && (
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${isSolid ? 'bg-black/20 text-current' : trendColors[trendType]
                }`}
            >
              {trendText}
            </span>
          )
        )}
      </div>
    </Card>
  );
};
