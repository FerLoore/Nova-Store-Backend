-- =============================================================================
-- NOVA STORE — Script de Datos Iniciales (SEED)
-- Base de datos: Oracle 21c
-- Esquema: AS_II
-- Ejecutar como: AS_II o con privilegios suficientes
-- IDEMPOTENTE: usa MERGE, puede ejecutarse varias veces sin duplicar datos
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PERMISOS del sistema
-- -----------------------------------------------------------------------------
MERGE INTO NOVA_PERMISO p
USING (SELECT 1 AS id, 'USUARIOS_GESTIONAR'  AS codigo, 'Crear, editar y desactivar usuarios'          AS descripcion FROM DUAL) src
ON (p.PERM_PERMISO = src.id)
WHEN MATCHED THEN UPDATE SET p.PERM_CODIGO = src.codigo, p.PERM_DESCRIPCION = src.descripcion
WHEN NOT MATCHED THEN INSERT (PERM_PERMISO, PERM_CODIGO, PERM_DESCRIPCION) VALUES (src.id, src.codigo, src.descripcion);

MERGE INTO NOVA_PERMISO p
USING (SELECT 2 AS id, 'ROLES_GESTIONAR'     AS codigo, 'Gestionar roles y asignar permisos'           AS descripcion FROM DUAL) src
ON (p.PERM_PERMISO = src.id)
WHEN MATCHED THEN UPDATE SET p.PERM_CODIGO = src.codigo, p.PERM_DESCRIPCION = src.descripcion
WHEN NOT MATCHED THEN INSERT (PERM_PERMISO, PERM_CODIGO, PERM_DESCRIPCION) VALUES (src.id, src.codigo, src.descripcion);

MERGE INTO NOVA_PERMISO p
USING (SELECT 3 AS id, 'CLIENTES_GESTIONAR'  AS codigo, 'Crear, editar y consultar clientes'           AS descripcion FROM DUAL) src
ON (p.PERM_PERMISO = src.id)
WHEN MATCHED THEN UPDATE SET p.PERM_CODIGO = src.codigo, p.PERM_DESCRIPCION = src.descripcion
WHEN NOT MATCHED THEN INSERT (PERM_PERMISO, PERM_CODIGO, PERM_DESCRIPCION) VALUES (src.id, src.codigo, src.descripcion);

MERGE INTO NOVA_PERMISO p
USING (SELECT 4 AS id, 'PRODUCTOS_GESTIONAR' AS codigo, 'Crear/editar productos, compras e inventario'  AS descripcion FROM DUAL) src
ON (p.PERM_PERMISO = src.id)
WHEN MATCHED THEN UPDATE SET p.PERM_CODIGO = src.codigo, p.PERM_DESCRIPCION = src.descripcion
WHEN NOT MATCHED THEN INSERT (PERM_PERMISO, PERM_CODIGO, PERM_DESCRIPCION) VALUES (src.id, src.codigo, src.descripcion);

MERGE INTO NOVA_PERMISO p
USING (SELECT 5 AS id, 'PRODUCTOS_VER'       AS codigo, 'Consultar productos, inventario y variantes'   AS descripcion FROM DUAL) src
ON (p.PERM_PERMISO = src.id)
WHEN MATCHED THEN UPDATE SET p.PERM_CODIGO = src.codigo, p.PERM_DESCRIPCION = src.descripcion
WHEN NOT MATCHED THEN INSERT (PERM_PERMISO, PERM_CODIGO, PERM_DESCRIPCION) VALUES (src.id, src.codigo, src.descripcion);

MERGE INTO NOVA_PERMISO p
USING (SELECT 6 AS id, 'PEDIDOS_APROBAR'     AS codigo, 'Aprobar pedidos con descuento'                AS descripcion FROM DUAL) src
ON (p.PERM_PERMISO = src.id)
WHEN MATCHED THEN UPDATE SET p.PERM_CODIGO = src.codigo, p.PERM_DESCRIPCION = src.descripcion
WHEN NOT MATCHED THEN INSERT (PERM_PERMISO, PERM_CODIGO, PERM_DESCRIPCION) VALUES (src.id, src.codigo, src.descripcion);

COMMIT;

-- -----------------------------------------------------------------------------
-- 2. ROLES del sistema
-- -----------------------------------------------------------------------------
MERGE INTO NOVA_ROL r
USING (SELECT 1 AS id, 'ADMINISTRADOR' AS nombre, 'Acceso total al sistema' AS desc1 FROM DUAL) src
ON (r.ROL_ROL = src.id)
WHEN MATCHED THEN UPDATE SET r.ROL_NOMBRE = src.nombre, r.ROL_DESCRIPCION = src.desc1, r.ROL_ACTIVO = 1
WHEN NOT MATCHED THEN INSERT (ROL_ROL, ROL_NOMBRE, ROL_DESCRIPCION, ROL_ACTIVO) VALUES (src.id, src.nombre, src.desc1, 1);

MERGE INTO NOVA_ROL r
USING (SELECT 2 AS id, 'OPERADOR' AS nombre, 'Gestion de clientes, ventas y pedidos' AS desc1 FROM DUAL) src
ON (r.ROL_ROL = src.id)
WHEN MATCHED THEN UPDATE SET r.ROL_NOMBRE = src.nombre, r.ROL_DESCRIPCION = src.desc1, r.ROL_ACTIVO = 1
WHEN NOT MATCHED THEN INSERT (ROL_ROL, ROL_NOMBRE, ROL_DESCRIPCION, ROL_ACTIVO) VALUES (src.id, src.nombre, src.desc1, 1);

MERGE INTO NOVA_ROL r
USING (SELECT 3 AS id, 'SUPERVISOR' AS nombre, 'Consulta de productos e inventario y aprobacion de pedidos' AS desc1 FROM DUAL) src
ON (r.ROL_ROL = src.id)
WHEN MATCHED THEN UPDATE SET r.ROL_NOMBRE = src.nombre, r.ROL_DESCRIPCION = src.desc1, r.ROL_ACTIVO = 1
WHEN NOT MATCHED THEN INSERT (ROL_ROL, ROL_NOMBRE, ROL_DESCRIPCION, ROL_ACTIVO) VALUES (src.id, src.nombre, src.desc1, 1);

COMMIT;

-- -----------------------------------------------------------------------------
-- 3. ASIGNACION DE PERMISOS POR ROL (tabla NOVA_ROL_PERMISO)
--    ADMINISTRADOR  -> todos los permisos (1-6)
--    OPERADOR       -> CLIENTES_GESTIONAR (3), PRODUCTOS_GESTIONAR (4), PRODUCTOS_VER (5)
--    SUPERVISOR     -> PRODUCTOS_VER (5), PEDIDOS_APROBAR (6)
-- -----------------------------------------------------------------------------
-- Limpia asignaciones previas para re-insertar (idempotente)
DELETE FROM NOVA_ROL_PERMISO WHERE ROL_ROL IN (1, 2, 3);

INSERT INTO NOVA_ROL_PERMISO (ROL_ROL, PERM_PERMISO) VALUES (1, 1); -- ADMIN -> USUARIOS_GESTIONAR
INSERT INTO NOVA_ROL_PERMISO (ROL_ROL, PERM_PERMISO) VALUES (1, 2); -- ADMIN -> ROLES_GESTIONAR
INSERT INTO NOVA_ROL_PERMISO (ROL_ROL, PERM_PERMISO) VALUES (1, 3); -- ADMIN -> CLIENTES_GESTIONAR
INSERT INTO NOVA_ROL_PERMISO (ROL_ROL, PERM_PERMISO) VALUES (1, 4); -- ADMIN -> PRODUCTOS_GESTIONAR
INSERT INTO NOVA_ROL_PERMISO (ROL_ROL, PERM_PERMISO) VALUES (1, 5); -- ADMIN -> PRODUCTOS_VER
INSERT INTO NOVA_ROL_PERMISO (ROL_ROL, PERM_PERMISO) VALUES (1, 6); -- ADMIN -> PEDIDOS_APROBAR

INSERT INTO NOVA_ROL_PERMISO (ROL_ROL, PERM_PERMISO) VALUES (2, 3); -- OPERADOR -> CLIENTES_GESTIONAR
INSERT INTO NOVA_ROL_PERMISO (ROL_ROL, PERM_PERMISO) VALUES (2, 4); -- OPERADOR -> PRODUCTOS_GESTIONAR
INSERT INTO NOVA_ROL_PERMISO (ROL_ROL, PERM_PERMISO) VALUES (2, 5); -- OPERADOR -> PRODUCTOS_VER

INSERT INTO NOVA_ROL_PERMISO (ROL_ROL, PERM_PERMISO) VALUES (3, 5); -- SUPERVISOR -> PRODUCTOS_VER
INSERT INTO NOVA_ROL_PERMISO (ROL_ROL, PERM_PERMISO) VALUES (3, 6); -- SUPERVISOR -> PEDIDOS_APROBAR

COMMIT;

-- -----------------------------------------------------------------------------
-- 4. USUARIOS INICIALES (contrasenas hasheadas con bcrypt, 10 rounds)
--    admin@novastore.com      -> Admin1234!
--    operador@novastore.com   -> Operador1234!
--    supervisor@novastore.com -> Supervisor1234!
--
--    Para regenerar un hash:
--    node -e "require('bcryptjs').hash('NuevaPassword', 10).then(console.log)"
-- -----------------------------------------------------------------------------
MERGE INTO NOVA_USUARIO u
USING (SELECT 1 AS id FROM DUAL) src
ON (u.USU_USUARIO = src.id)
WHEN MATCHED THEN UPDATE SET
    u.ROL_ROL      = 1,
    u.USU_NOMBRE   = 'Administrador Principal',
    u.USU_EMAIL    = 'admin@novastore.com',
    u.USU_PASSWORD = '$2b$10$fdAeVoDTC/Fx0rbguAnoNeyZysZwVzHh61n3C9558lJBM7h3qlSfq',
    u.USU_ACTIVO   = 1
WHEN NOT MATCHED THEN INSERT (USU_USUARIO, ROL_ROL, USU_NOMBRE, USU_EMAIL, USU_PASSWORD, USU_ACTIVO)
VALUES (1, 1, 'Administrador Principal', 'admin@novastore.com',
        '$2b$10$fdAeVoDTC/Fx0rbguAnoNeyZysZwVzHh61n3C9558lJBM7h3qlSfq', 1);

MERGE INTO NOVA_USUARIO u
USING (SELECT 4 AS id FROM DUAL) src
ON (u.USU_USUARIO = src.id)
WHEN MATCHED THEN UPDATE SET
    u.ROL_ROL      = 2,
    u.USU_NOMBRE   = 'Carlos Castillo',
    u.USU_EMAIL    = 'operador@novastore.com',
    u.USU_PASSWORD = '$2b$10$/84kSR0iNm1LJ5Ee3GuET.jxYzJeNRp9kUjAOH5eh6pW1d/wKeAdK',
    u.USU_ACTIVO   = 1
WHEN NOT MATCHED THEN INSERT (USU_USUARIO, ROL_ROL, USU_NOMBRE, USU_EMAIL, USU_PASSWORD, USU_ACTIVO)
VALUES (4, 2, 'Carlos Castillo', 'operador@novastore.com',
        '$2b$10$/84kSR0iNm1LJ5Ee3GuET.jxYzJeNRp9kUjAOH5eh6pW1d/wKeAdK', 1);

MERGE INTO NOVA_USUARIO u
USING (SELECT 5 AS id FROM DUAL) src
ON (u.USU_USUARIO = src.id)
WHEN MATCHED THEN UPDATE SET
    u.ROL_ROL      = 3,
    u.USU_NOMBRE   = 'Supervisor General',
    u.USU_EMAIL    = 'supervisor@novastore.com',
    u.USU_PASSWORD = '$2b$10$q67s1PkNNoH1nzhEl9RTz.1/PCkZTd1kWjC2ew75TTjxFnWemYLn.',
    u.USU_ACTIVO   = 1
WHEN NOT MATCHED THEN INSERT (USU_USUARIO, ROL_ROL, USU_NOMBRE, USU_EMAIL, USU_PASSWORD, USU_ACTIVO)
VALUES (5, 3, 'Supervisor General', 'supervisor@novastore.com',
        '$2b$10$q67s1PkNNoH1nzhEl9RTz.1/PCkZTd1kWjC2ew75TTjxFnWemYLn.', 1);

COMMIT;

-- -----------------------------------------------------------------------------
-- 5. DATOS DE PRUEBA — Almacen, Marcas, Categorias
-- -----------------------------------------------------------------------------

-- Almacen principal
MERGE INTO NOVA_ALMACEN a
USING (SELECT 1 AS id FROM DUAL) src
ON (a.ALM_ALMACEN = src.id)
WHEN NOT MATCHED THEN INSERT (ALM_ALMACEN, ALM_NOMBRE, ALM_UBICACION)
VALUES (1, 'Almacen Central', 'Bodega Principal - Piso 1');

-- Marcas
MERGE INTO NOVA_MARCA m
USING (SELECT 1 AS id, 'Zara'  AS nombre FROM DUAL) src
ON (m.MARC_MARCA = src.id)
WHEN NOT MATCHED THEN INSERT (MARC_MARCA, MARC_NOMBRE, MARC_ACTIVO) VALUES (src.id, src.nombre, 1);

MERGE INTO NOVA_MARCA m
USING (SELECT 2 AS id, 'H&M'   AS nombre FROM DUAL) src
ON (m.MARC_MARCA = src.id)
WHEN NOT MATCHED THEN INSERT (MARC_MARCA, MARC_NOMBRE, MARC_ACTIVO) VALUES (src.id, src.nombre, 1);

MERGE INTO NOVA_MARCA m
USING (SELECT 3 AS id, 'Nike'  AS nombre FROM DUAL) src
ON (m.MARC_MARCA = src.id)
WHEN NOT MATCHED THEN INSERT (MARC_MARCA, MARC_NOMBRE, MARC_ACTIVO) VALUES (src.id, src.nombre, 1);

-- Categorias
MERGE INTO NOVA_CATEGORIA c
USING (SELECT 1 AS id, 'Camisetas'  AS nombre FROM DUAL) src
ON (c.CAT_CATEGORIA = src.id)
WHEN NOT MATCHED THEN INSERT (CAT_CATEGORIA, CAT_NOMBRE, CAT_ACTIVO) VALUES (src.id, src.nombre, 1);

MERGE INTO NOVA_CATEGORIA c
USING (SELECT 2 AS id, 'Pantalones' AS nombre FROM DUAL) src
ON (c.CAT_CATEGORIA = src.id)
WHEN NOT MATCHED THEN INSERT (CAT_CATEGORIA, CAT_NOMBRE, CAT_ACTIVO) VALUES (src.id, src.nombre, 1);

MERGE INTO NOVA_CATEGORIA c
USING (SELECT 3 AS id, 'Zapatos'    AS nombre FROM DUAL) src
ON (c.CAT_CATEGORIA = src.id)
WHEN NOT MATCHED THEN INSERT (CAT_CATEGORIA, CAT_NOMBRE, CAT_ACTIVO) VALUES (src.id, src.nombre, 1);

COMMIT;

-- =============================================================================
-- FIN DEL SCRIPT SEED
--
-- Credenciales de acceso:
--   ADMINISTRADOR: admin@novastore.com        / Admin1234!
--   OPERADOR:      operador@novastore.com      / Operador1234!
--   SUPERVISOR:    supervisor@novastore.com    / Supervisor1234!
-- =============================================================================
