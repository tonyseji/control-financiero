# Workflow de Desarrollo — Sistema de Dos Agentes

> Este documento define cómo se organiza el trabajo entre los dos agentes de IA del proyecto.
> Leer antes de iniciar cualquier sesión de trabajo.

---

## El modelo de trabajo

Este proyecto usa **dos agentes con responsabilidades separadas**:

| Agente | Dónde | Rol |
|---|---|---|
| **Cowork** (Claude en desktop) | Chat de Cowork | Arquitecto, organizador, planificador |
| **Claude Code** | Terminal / Git Bash | Implementador, ejecutor |

La regla es simple: **Cowork piensa y define. Claude Code ejecuta.**

---

## Qué hace Cowork

Cowork es el experto en organización y arquitectura del proyecto. Su dominio son los archivos `.md` y las decisiones de diseño:

- **Documenta** — escribe, actualiza y reorganiza todos los `.md` del proyecto (`CLAUDE.md`, `roadmap.md`, `progress.md`, `workflow.md`, `db-schema.md`, etc.)
- **Planifica** — decide qué construir, en qué orden, y por qué
- **Diseña** — define esquemas de BD, contratos de API, estructura de componentes, flujos de usuario antes de escribir código
- **Decide** — resuelve dilemas arquitectónicos (ej: "¿tabla nueva o columna extra?", "¿Edge Function o trigger SQL?")
- **Sintetiza** — convierte conversaciones, ideas y contexto en instrucciones precisas y accionables
- **Prepara prompts para Claude Code** — cuando hay código que escribir, Cowork redacta el prompt exacto que el usuario pegará en Claude Code

**Cowork NO toca código** (`.jsx`, `.ts`, `.sql`, `.js`, `.html`). Si algo requiere editar código, Cowork define la tarea y genera el prompt para Claude Code.

---

## Qué hace Claude Code

Claude Code es el implementador. Opera en terminal desde el directorio del proyecto:

```bash
cd "C:\Users\anton\Desktop\Organizador Finanzas\finanzas-v2"
npx claude
```

Su dominio es todo lo que Cowork no toca:

- Escribe y edita código (`.jsx`, `.ts`, `.sql`, `.js`, `.html`, `.css`)
- Ejecuta comandos (`npm run dev`, `npm run build`, `git`, etc.)
- Crea y mueve archivos de código
- Refactoriza componentes y servicios
- Genera migraciones SQL siguiendo el esquema definido por Cowork
- Implementa lo que Cowork ha especificado, sin rediseñar la arquitectura por su cuenta

**Claude Code NO toma decisiones de arquitectura** por su cuenta. Si durante la implementación surge un dilema de diseño, para y lo reporta para que Cowork decida.

---

## Flujo de trabajo estándar

```
1. Tony trae una necesidad o idea a Cowork
       ↓
2. Cowork analiza, hace preguntas si necesita, y define la solución
   - Qué hay que construir
   - Qué archivos se tocan
   - Qué decisiones se toman y por qué
       ↓
3. Cowork actualiza los .md relevantes si aplica
   (roadmap, progress, db-schema, CLAUDE.md)
       ↓
4. Cowork genera el prompt para Claude Code
   (ver formato más abajo)
       ↓
5. Tony pega el prompt en Claude Code y lo ejecuta
       ↓
6. Claude Code implementa y reporta lo que hizo
       ↓
7. Tony vuelve a Cowork con el resultado para revisar, iterar o planificar lo siguiente
```

---

## Formato del prompt para Claude Code

Cuando Cowork genera una tarea para Claude Code, el prompt sigue esta estructura:

```
## Contexto
[Qué está pasando en el proyecto, por qué se hace esto ahora]

## Tarea
[Descripción concisa de qué implementar]

## Especificación
[Detalles exactos: nombres de archivos, funciones, tipos, campos, lógica esperada]

## Restricciones
[Qué NO hacer, qué no romper, qué convenciones respetar]

## Criterio de éxito
[Cómo saber que la implementación está correcta]
```

Este formato garantiza que Claude Code tenga todo lo necesario para implementar correctamente sin tener que adivinar ni tomar decisiones de diseño por su cuenta.

---

## Reglas de sesión

### Al iniciar una sesión en Cowork
1. Leer `docs/progress.md` (últimas 2 entradas) para saber dónde se quedó el proyecto
2. Si hay pendientes marcados, preguntar a Tony si quiere continuarlos o priorizar otra cosa
3. No tocar código

### Al iniciar una sesión en Claude Code
1. Leer `CLAUDE.md` completo
2. Leer las últimas 2 entradas de `docs/progress.md`
3. Si la tarea involucra BD, leer `docs/db-schema.md`
4. Implementar lo especificado sin cambiar la arquitectura definida

### Al finalizar una sesión de trabajo
- **Claude Code**: reporta exactamente qué archivos tocó y qué falta
- **Cowork**: actualiza `docs/progress.md` con lo hecho y los próximos pasos

---

## Cuándo ir a Cowork vs Claude Code

| Situación | Va a... |
|---|---|
| "¿Cómo deberíamos estructurar X?" | Cowork |
| "¿Qué columnas necesita esta tabla?" | Cowork |
| "¿Hacemos esto en una Edge Function o en el cliente?" | Cowork |
| "¿En qué fase del roadmap encaja esto?" | Cowork |
| "Actualiza el roadmap con lo que hicimos hoy" | Cowork |
| "Implementa el componente GoalsView.jsx" | Claude Code |
| "Escribe la migration 010_goals.sql" | Claude Code |
| "Refactoriza useFinancialData para incluir goals" | Claude Code |
| "Corre `npm run build` y dime si hay errores" | Claude Code |
| "Haz git commit y push de los cambios" | Claude Code |
