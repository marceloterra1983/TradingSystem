import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';

export interface LogoProps {
  /** Variante do logo */
  variant?: 'icon' | 'compact' | 'full';
  /** Tamanho do logo */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Classes CSS adicionais */
  className?: string;
  /** Mostrar apenas o ícone mesmo em variante compact/full */
  iconOnly?: boolean;
  /** Callback ao clicar no logo */
  onClick?: () => void;
}

const sizeClasses = {
  icon: {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  },
  compact: {
    xs: 'h-6',
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
    xl: 'h-16',
  },
  full: {
    xs: 'h-6',
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
    xl: 'h-16',
  },
};

/**
 * Logo Component
 * 
 * Componente reutilizável para exibir o logo do TradingSystem
 * com suporte automático para dark/light mode
 * 
 * @example
 * // Logo ícone pequeno
 * <Logo variant="icon" size="sm" />
 * 
 * @example
 * // Logo completo com texto
 * <Logo variant="compact" size="md" />
 * 
 * @example
 * // Logo clicável
 * <Logo variant="icon" onClick={() => navigate('/')} />
 */
/**
 * Logo Component
 * @component
 */
export function Logo({
  variant = 'compact',
  size = 'md',
  className,
  iconOnly = false,
  onClick,
}: LogoProps) {
  const { resolvedTheme } = useTheme();

  // Determinar qual arquivo usar
  const getLogoSrc = () => {
    if (variant === 'icon' || iconOnly) {
      return '/assets/branding/logo-icon.svg';
    }

    if (variant === 'full') {
      return '/assets/branding/logo-full.svg';
    }

    // variant === 'compact'
    return resolvedTheme === 'dark'
      ? '/assets/branding/logo-compact-dark.svg'
      : '/assets/branding/logo-compact.svg';
  };

  const logoSrc = getLogoSrc();
  const sizeClass = sizeClasses[iconOnly ? 'icon' : variant][size];

  return (
    <img
      src={logoSrc}
      alt="TradingSystem"
      className={cn(
        'w-auto object-contain transition-all duration-300',
        sizeClass,
        onClick && 'cursor-pointer hover:scale-110 hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]',
        className
      )}
      onClick={onClick}
      onError={(e) => {
        console.error('Logo failed to load:', logoSrc);
        // Fallback para emoji se falhar
        const target = e.currentTarget as HTMLImageElement;
        target.style.display = 'none';
        const parent = target.parentElement;
        if (parent && !parent.querySelector('.logo-fallback')) {
          const fallback = document.createElement('span');
          fallback.className = 'logo-fallback text-2xl';
          fallback.textContent = '📊';
          parent.appendChild(fallback);
        }
      }}
    />
  );
}

export default Logo;

