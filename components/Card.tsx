export default function Card({
  children,
  className = '',
  tone = 'default',
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
  padded?: boolean;
}) {
  const border = {
    default: 'border-border',
    accent: 'border-accentStroke',
    success: 'border-success',
    warning: 'border-warning',
    danger: 'border-danger',
  }[tone];

  return (
    <div className={`rounded-card border ${border} bg-cardSoft ${padded ? 'p-5' : ''} shadow-lg shadow-black/30 ${className}`}>
      {children}
    </div>
  );
}
