# Nova Store — Backend API

Sistema de gestión de compras, inventario, pedidos y ventas para tienda de ropa.  
**Stack:** Node.js · TypeScript · Express v5 · TypeORM · Oracle 21c

---

## Requisitos previos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 18 LTS |
| Oracle Database | 21c (XE o full) |
| Oracle Instant Client | 21.x |

---

## Configuración inicial

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd Nova-Store-Backend
npm install
```

### 2. Variables de entorno

Copia `.env` y ajusta según tu entorno:

```env
PORT=3000

# Oracle
DB_USER=AS_II
DB_PASSWORD=1234
DB_SERVICE=orclpdb
DB_PORT=1521
DB_HOST=localhost

# JWT — usa un secreto aleatorio de al menos 32 caracteres en producción
JWT_SECRET=cambia_este_secreto_por_uno_seguro_de_32_chars
JWT_EXPIRES_IN=8h

# Frontend (CORS)
FRONTEND_SERVICE=http://localhost:5173
```

### 3. Crear el esquema de base de datos

Ejecuta el DDL en SQL Developer o SQL*Plus como `AS_II`:

```bash
# Desde SQL*Plus
sqlplus AS_II/1234@localhost:1521/orclpdb @database/ddl.sql
```

> Si no tienes el DDL, importa el esquema desde SQL Developer o pídelo al equipo.

### 4. Poblar datos iniciales (seed)

```bash
sqlplus AS_II/1234@localhost:1521/orclpdb @database/seed.sql
```

Este script es **idempotente**: puede ejecutarse múltiples veces sin duplicar datos.

#### Credenciales de prueba

| Rol | Email | Contraseña |
|---|---|---|
| ADMINISTRADOR | admin@novastore.com | Admin1234! |
| OPERADOR | operador@novastore.com | Operador1234! |
| SUPERVISOR | supervisor@novastore.com | Supervisor1234! |

---

## Ejecución

```bash
# Desarrollo (con watch)
npm run dev

# Producción
npm start
```

El servidor levanta en `http://localhost:3000`.

---

## Endpoints principales

### Autenticación (pública)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | Login → devuelve JWT + menú |
| POST | `/auth/register` | Registro de nuevo usuario |
| GET | `/auth/roles` | Lista de roles disponibles |
| GET | `/auth/me` | Perfil del usuario autenticado |

### Módulos protegidos (requieren `Authorization: Bearer <token>`)

| Permiso requerido | Rutas |
|---|---|
| `USUARIOS_GESTIONAR` | `/nova-usuario` |
| `ROLES_GESTIONAR` | `/nova-rol`, `/nova-permiso` |
| `CLIENTES_GESTIONAR` | `/nova-cliente` |
| `PRODUCTOS_VER` o `PRODUCTOS_GESTIONAR` | `/nova-marca`, `/nova-categoria`, `/nova-producto`, `/nova-variante`, `/nova-proveedor`, `/nova-compra`, `/nova-inventario` |
| `PEDIDOS_APROBAR` | `PUT /pedidos/:id/aprobar` |
| Autenticado | `/pedidos`, `/nova-pedido`, `/ventas` |
| Autenticado (Reportes) | `/reportes/kpis`, `/reportes/ventas`, `/reportes/top-productos`, `/reportes/stock-bajo`, `/reportes/pedidos`, `/reportes/compras`, `/reportes/metodos-pago` |
| Rol `ADMINISTRADOR` | `/auditoria`, `/auditoria/resumen` (soporta filtros `?tabla=&accion=&usuario_id=&desde=&hasta=&page=&limit=`) |

---

## Permisos del sistema

| Código | Descripción |
|---|---|
| `USUARIOS_GESTIONAR` | Crear, editar y desactivar usuarios |
| `ROLES_GESTIONAR` | Gestionar roles y asignar permisos |
| `CLIENTES_GESTIONAR` | Crear, editar y consultar clientes |
| `PRODUCTOS_GESTIONAR` | Crear/editar productos, compras e inventario |
| `PRODUCTOS_VER` | Consultar productos, inventario y variantes |
| `PEDIDOS_APROBAR` | Aprobar o autorizar pedidos con descuento especial |

---

## Regenerar hash de contraseña

```bash
node -e "require('bcryptjs').hash('NuevaPassword123!', 10).then(console.log)"
```

---

## Rama de trabajo

| Rama | Propósito |
|---|---|
| `main` | Producción estable |
| `qa` | Integración y pruebas |
| `develop` | Desarrollo activo |
