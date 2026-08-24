# Gestor Estrategico de Tareas - Proyecto Integrador M4

Autor: Raul Alejandro Carmona Cuellar

SPA de gestion de tareas para el Proyecto Integrador del Modulo 4. Implementa autenticacion, rutas protegidas, CRUD persistente por usuario en Cloud Firestore, resumen por email mediante AWS SES y Vercel Functions, testing con Vitest + React Testing Library y extras de filtros, prioridad, vencimiento y drag & drop.

El trabajo fue realizado por Raul Alejandro Carmona Cuellar. La IA se utilizo como apoyo tecnico y de revision, no como autora del proyecto.

## Stack

- React + TypeScript + Vite.
- React Router.
- Firebase Authentication + Cloud Firestore.
- Vercel Functions en `/api`.
- AWS SES con AWS SDK v3.
- Vitest + React Testing Library.
- dnd-kit para reordenamiento.

## Arquitectura

La aplicacion separa responsabilidades por capas:

```text
React UI -> Hooks -> Services -> Firebase Auth / Firestore
React UI -> emailService -> /api/send-task-summary -> AWS SES
```

Estructura principal:

```text
src/
  components/       UI reusable, feedback y layout
  config/           configuracion de Firebase desde env
  features/auth/    provider y formulario de autenticacion
  features/tasks/   formulario, lista, item, filtros y drag & drop
  hooks/            conexion React con Firestore
  pages/            vistas login, register, tasks y 404
  routes/           rutas publicas/protegidas
  services/         Firebase, Auth, Firestore y email API
  types/            contratos compartidos
  utils/            validaciones, filtros y ordenamiento
api/                Vercel Functions
docs/               matriz de rubrica
tests/              unit/component tests
```

## Instalacion

```bash
npm install
npm run dev
```

Scripts utiles:

```bash
npm run typecheck
npm run test
npm run build
npm run preview
npm run audit
```

En Windows PowerShell puede ser necesario usar `npm.cmd` si la politica local bloquea `npm.ps1`.

## Variables de entorno

Crear `.env` local y mantener `.env.example` sin secretos:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SES_FROM_EMAIL=
```

Las variables `VITE_FIREBASE_*` son usadas por el frontend. Las variables `AWS_*` son solo server-side y se leen en `api/send-task-summary.ts`.

## Firebase

1. En Firebase Console, crear un proyecto.
2. Agregar una app Web.
3. Copiar la configuracion de la app Web a `.env` usando las claves `VITE_FIREBASE_*`.
4. Activar Authentication con Email/Password. Google es opcional, pero la UI ya lo soporta si activas el provider.
5. Crear Cloud Firestore.
6. Publicar las reglas de `firestore.rules`.

Modelo elegido:

```text
users/{userId}/tasks/{taskId}
```

Se eligio esta estructura porque el path contiene el `userId`, las reglas son faciles de auditar y cada query queda naturalmente acotada al usuario autenticado.

## AWS SES

1. En AWS Console, abrir SES.
2. Elegir region y guardarla como `AWS_REGION`.
3. Verificar el email remitente o dominio.
4. Guardar ese remitente en `AWS_SES_FROM_EMAIL`.
5. Crear credenciales IAM con minimo privilegio para `ses:SendEmail`.
6. Guardar `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` solo en `.env` local o variables de Vercel.

Si SES esta en sandbox, tambien debes verificar el email destinatario antes de enviar.

## Vercel

1. Subir el repositorio a GitHub.
2. Importarlo en Vercel.
3. Configurar todas las variables de entorno.
4. Deploy.
5. Probar `/login`, `/register`, `/tasks` y `/api/send-task-summary`.

`vercel.json` aplica un rewrite SPA general para cualquier ruta de React Router (incluye rutas con trailing slash como `/login/`), excluyendo `/api` y archivos estaticos.

## Testing

Los tests cubren:

- Validaciones y filtros de tareas.
- Estados y callbacks de `TaskForm`.
- Estados vacios, toggle y delete en `TaskList`.
- Mapper de errores de Firebase.
- Servicio de email con `fetch` mockeado para exito, 400 y error de red.
- AuthProvider (onAuthStateChanged y acciones principales).
- Rutas protegidas/publicas y fallback de Not Found.
- Hook `useTasks` con mocks de Firestore (loading, success, error y rollback optimista).
- API `/api/send-task-summary` (405, 400, 500, 502 y exito).

## Seguridad

- `.env` y `.env.*` estan ignorados; `.env.example` si se versiona.
- AWS SES nunca se importa desde `src`.
- Firestore Rules impiden acceso cross-user.
- La funcion serverless valida metodo HTTP, email, cantidad de tareas y estructura del payload.
- Los errores tecnicos se registran en servidor y la UI muestra mensajes seguros.

## Extras implementados

- Filtros: todas, pendientes y completadas.
- Prioridad: baja, media y alta.
- Fecha de vencimiento y deteccion visual de tareas vencidas.
- Orden manual persistente con dnd-kit.
- Orden alternativo por prioridad o vencimiento.

## Uso de IA

Prompt utilizado: el Prompt Maestro del Proyecto Integrador M4, pidiendo actuar como senior full stack, arquitecto, reviewer de seguridad y QA.

La IA se uso para:

- Auditar el proyecto de clase antes de crear este proyecto.
- Diseñar la estructura por capas.
- Comparar alternativas de modelo Firestore.
- Implementar componentes, servicios, hooks y tests.
- Revisar seguridad de variables de entorno y serverless.
- Documentar pasos externos y matriz de rubrica.

Decisiones tomadas con criterio del estudiante:

- Usar `users/{userId}/tasks/{taskId}` para facilitar reglas de seguridad.
- Usar `Timestamp` en Firestore y mapear a strings ISO dentro del dominio React.
- Activar drag & drop solo con filtro `Todas` y orden `Manual`, evitando conflictos con orden automatico.
- Mockear `fetch` en tests de email en vez de llamar AWS real.

## Checklist manual final

- Registrar Usuario A.
- Crear, editar, completar, filtrar, reordenar y eliminar tareas.
- Recargar y verificar persistencia.
- Registrar Usuario B y confirmar aislamiento de tareas.
- Enviar resumen por email con SES configurado.
- Cerrar sesion e intentar entrar a `/tasks` sin sesion.
- Confirmar redireccion a `/login`.
- Ejecutar `npm run typecheck`, `npm run test`, `npm run build`.
- Verificar que `.env` no aparece en Git.

## URL de produccion

Pendiente: agregar URL publica de Vercel despues del deploy.
