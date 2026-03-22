import { Search, Bell } from 'lucide-react';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function AppHeader({ title, subtitle, action }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card/90 backdrop-blur-md px-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-sm font-semibold text-foreground">{title}</h1>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            className="h-8 w-52 rounded-md border border-border bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring/40 transition-all"
          />
        </div>

        {/* Notifications */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
        </button>

        {/* Avatar */}
        <button className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground transition-transform active:scale-95">
          MR
        </button>

        {action}
      </div>
    </header>
  );
}
