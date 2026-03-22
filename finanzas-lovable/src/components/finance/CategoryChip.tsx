import { cn } from '@/lib/utils';

const categoryColors: Record<string, string> = {
  'Alimentación': 'bg-primary/8 text-primary',
  'Salario': 'bg-success/10 text-success',
  'Entretenimiento': 'bg-[hsl(190,58%,38%)]/10 text-[hsl(190,58%,38%)]',
  'Transporte': 'bg-warning/10 text-warning',
  'Salud': 'bg-[hsl(262,42%,48%)]/10 text-[hsl(262,42%,48%)]',
  'Ingreso extra': 'bg-success/10 text-success',
  'Servicios': 'bg-[hsl(152,52%,36%)]/10 text-[hsl(152,52%,36%)]',
  'Compras': 'bg-[hsl(340,54%,48%)]/10 text-[hsl(340,54%,48%)]',
  'Educación': 'bg-[hsl(20,60%,48%)]/10 text-[hsl(20,60%,48%)]',
};

interface CategoryChipProps {
  category: string;
  className?: string;
}

export function CategoryChip({ category, className }: CategoryChipProps) {
  const colorClasses = categoryColors[category] || 'bg-muted text-muted-foreground';
  return (
    <span className={cn(
      'inline-flex items-center rounded-[5px] px-1.5 py-[2px] text-[11px] font-medium leading-tight',
      colorClasses,
      className
    )}>
      {category}
    </span>
  );
}
