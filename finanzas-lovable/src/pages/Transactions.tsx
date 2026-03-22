import { useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { TransactionTable } from '@/components/finance/TransactionTable';
import { transactions } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';

const categories = ['Todas', 'Alimentación', 'Transporte', 'Entretenimiento', 'Salud', 'Servicios', 'Compras', 'Educación', 'Salario', 'Ingreso extra'];

export default function Transactions() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  const filtered = transactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'Todas' || t.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div>
      <AppHeader
        title="Transacciones"
        subtitle={`${filtered.length} movimientos`}
        action={
          <Button size="sm" className="gap-1.5 h-8 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Nueva transacción
          </Button>
        }
      />
      <main className="p-6 space-y-4 animate-reveal">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar transacciones..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-card pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring/40 transition-all"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-8 rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring/40 transition-all"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          {filtered.length > 0 ? (
            <TransactionTable transactions={filtered} />
          ) : (
            <div className="py-16 text-center">
              <p className="text-xs text-muted-foreground">No se encontraron transacciones</p>
              <p className="text-[11px] text-muted-foreground mt-1">Intenta ajustar los filtros de búsqueda</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
