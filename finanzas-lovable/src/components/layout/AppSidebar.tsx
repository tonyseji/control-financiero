import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  Landmark,
  Target,
  PieChart,
  Settings,
  LogOut,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Transacciones', path: '/transacciones', icon: ArrowLeftRight },
  { label: 'Análisis', path: '/analisis', icon: BarChart3 },
  { label: 'Cuentas', path: '/cuentas', icon: Landmark },
  { label: 'Objetivos', path: '/objetivos', icon: Target },
  { label: 'Presupuestos', path: '/presupuestos', icon: PieChart },
];

const bottomItems = [
  { label: 'Configuración', path: '/configuracion', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-[232px] flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-[56px] items-center gap-2.5 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <span className="text-xs font-bold text-primary-foreground">F</span>
        </div>
        <span className="text-sm font-semibold text-foreground tracking-tight">Finanza</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll px-3 pt-2 pb-3">
        <p className="mb-2 px-3 text-overline uppercase text-muted-foreground">Menú</p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(
                    'group flex items-center gap-2.5 rounded-md px-3 py-[7px] text-[13px] font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary/[0.08] text-primary shadow-inner-soft'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <item.icon className={cn(
                    'h-4 w-4 flex-shrink-0 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-sidebar-border px-3 py-2">
        {bottomItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'group flex items-center gap-2.5 rounded-md px-3 py-[7px] text-[13px] font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary/[0.08] text-primary shadow-inner-soft'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className={cn(
                'h-4 w-4 flex-shrink-0 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
              )} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* User */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
            MR
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-foreground truncate leading-tight">María Rodríguez</p>
            <p className="text-[11px] text-muted-foreground truncate leading-tight">Plan Personal</p>
          </div>
          <button className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
