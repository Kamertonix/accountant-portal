export default function Card({
  children,
  className = '',
  tone = 'default',
  padded = true,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
  padded?: boolean;
  onClick?: () => void;
}) {
  const border = {
    default: 'border-border',
    accent: 'border-accentStroke',
    success: 'border-success',
    warning: 'border-warning',
    danger: 'border-danger',
  }[tone];

  return (
    <div onClick={onClick} className={`rounded-card border ${border} bg-cardSoft ${padded ? 'p-5' : ''} shadow-lg shadow-black/30 ${className}`}>
      {children}
    </div>
  );
}
