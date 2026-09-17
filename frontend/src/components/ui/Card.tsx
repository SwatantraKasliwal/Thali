interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Liquid-glass panel instead of the solid surface — used by charts and meals. */
  glass?: boolean;
}

export default function Card({ children, className = '', glass = false }: CardProps) {
  return (
    <div
      className={`rounded-2xl shadow-sm ${
        glass ? 'glass' : 'bg-surface border border-line'
      } ${className}`}
    >
      {children}
    </div>
  );
}
