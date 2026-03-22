import { AppHeader } from '@/components/layout/AppHeader';
import { SectionHeader } from '@/components/finance/SectionHeader';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const inputClasses = "h-8 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring/40 transition-all";
  const labelClasses = "block text-xs font-medium text-foreground mb-1.5";
  const selectClasses = "h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring/40 transition-all";

  return (
    <div>
      <AppHeader title="Configuración" />
      <main className="p-6 space-y-6 animate-reveal max-w-2xl">
        {/* Profile */}
        <section>
          <SectionHeader title="Perfil" description="Tu información personal" />
          <div className="mt-3 space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Nombre</label>
                <input type="text" defaultValue="María" className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>Apellido</label>
                <input type="text" defaultValue="Rodríguez" className={inputClasses} />
              </div>
            </div>
            <div>
              <label className={labelClasses}>Email</label>
              <input type="email" defaultValue="maria@ejemplo.com" className={inputClasses} />
            </div>
            <Button size="sm" className="h-8 text-xs">Guardar cambios</Button>
          </div>
        </section>

        {/* Preferences */}
        <section>
          <SectionHeader title="Preferencias" description="Configura tu experiencia" />
          <div className="mt-3 space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
            <div>
              <label className={labelClasses}>Moneda principal</label>
              <select className={selectClasses}>
                <option>EUR - Euro</option>
                <option>USD - Dólar estadounidense</option>
                <option>GBP - Libra esterlina</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>Idioma</label>
              <select className={selectClasses}>
                <option>Español</option>
                <option>English</option>
              </select>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <SectionHeader title="Notificaciones" description="Gestiona tus alertas" />
          <div className="mt-3 space-y-0 rounded-lg border border-border bg-card shadow-card divide-y divide-border">
            {[
              { label: 'Alertas de presupuesto', desc: 'Recibe avisos al acercarte a tu límite' },
              { label: 'Resumen semanal', desc: 'Resumen de tus finanzas cada lunes' },
              { label: 'Transacciones grandes', desc: 'Avisos para movimientos superiores a €500' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <label className="relative inline-flex cursor-pointer flex-shrink-0">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="h-[18px] w-8 rounded-full bg-muted peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:h-[14px] after:w-[14px] after:rounded-full after:bg-card after:shadow-sm after:transition-transform peer-checked:after:translate-x-[14px]" />
                </label>
              </div>
            ))}
          </div>
        </section>

        {/* Danger zone */}
        <section>
          <SectionHeader title="Zona de peligro" />
          <div className="mt-3 rounded-lg border border-destructive/20 bg-card p-4 shadow-card">
            <p className="text-xs text-muted-foreground">Eliminar tu cuenta y todos los datos asociados. Esta acción es irreversible.</p>
            <Button variant="destructive" size="sm" className="mt-3 h-8 text-xs">Eliminar cuenta</Button>
          </div>
        </section>
      </main>
    </div>
  );
}
