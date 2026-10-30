-- =============================================================================
-- NOVA STORE — Script de Datos Iniciales (SEED)
-- Base de datos: Oracle 21c
-- Esquema: AS_II
-- Ejecutar como: AS_II o usuario propietario de las tablas
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
-- 4. USUARIOS INICIALES (contraseñas hasheadas con bcrypt, 10 rounds)
--    admin@novastore.com      -> Admin1234!
--    operador@novastore.com   -> Operador1234!
--    supervisor@novastore.com -> Supervisor1234!
-- -----------------------------------------------------------------------------
MERGE INTO NOVA_USUARIO u
USING (SELECT 'admin@novastore.com' AS email, 1 AS rol_id, 'Administrador Principal' AS nombre,
              '$2b$10$fdAeVoDTC/Fx0rbguAnoNeyZysZwVzHh61n3C9558lJBM7h3qlSfq' AS pass FROM DUAL) src
ON (u.USU_EMAIL = src.email)
WHEN MATCHED THEN UPDATE SET
    u.ROL_ROL      = src.rol_id,
    u.USU_NOMBRE   = src.nombre,
    u.USU_PASSWORD = src.pass,
    u.USU_ACTIVO   = 1
WHEN NOT MATCHED THEN INSERT (USU_USUARIO, ROL_ROL, USU_NOMBRE, USU_EMAIL, USU_PASSWORD, USU_ACTIVO)
VALUES (1, src.rol_id, src.nombre, src.email, src.pass, 1);

MERGE INTO NOVA_USUARIO u
USING (SELECT 'operador@novastore.com' AS email, 2 AS rol_id, 'Carlos Castillo' AS nombre,
              '$2b$10$/84kSR0iNm1LJ5Ee3GuET.jxYzJeNRp9kUjAOH5eh6pW1d/wKeAdK' AS pass FROM DUAL) src
ON (u.USU_EMAIL = src.email)
WHEN MATCHED THEN UPDATE SET
    u.ROL_ROL      = src.rol_id,
    u.USU_NOMBRE   = src.nombre,
    u.USU_PASSWORD = src.pass,
    u.USU_ACTIVO   = 1
WHEN NOT MATCHED THEN INSERT (USU_USUARIO, ROL_ROL, USU_NOMBRE, USU_EMAIL, USU_PASSWORD, USU_ACTIVO)
VALUES (2, src.rol_id, src.nombre, src.email, src.pass, 1);

MERGE INTO NOVA_USUARIO u
USING (SELECT 'supervisor@novastore.com' AS email, 3 AS rol_id, 'Supervisor General' AS nombre,
              '$2b$10$q67s1PkNNoH1nzhEl9RTz.1/PCkZTd1kWjC2ew75TTjxFnWemYLn.' AS pass FROM DUAL) src
ON (u.USU_EMAIL = src.email)
WHEN MATCHED THEN UPDATE SET
    u.ROL_ROL      = src.rol_id,
    u.USU_NOMBRE   = src.nombre,
    u.USU_PASSWORD = src.pass,
    u.USU_ACTIVO   = 1
WHEN NOT MATCHED THEN INSERT (USU_USUARIO, ROL_ROL, USU_NOMBRE, USU_EMAIL, USU_PASSWORD, USU_ACTIVO)
VALUES (3, src.rol_id, src.nombre, src.email, src.pass, 1);

COMMIT;

-- -----------------------------------------------------------------------------
-- 5. DATOS DE PRUEBA — Almacén, Marcas, Categorías, Cliente, Producto, Variante e Inventario
-- -----------------------------------------------------------------------------

-- Almacén principal
MERGE INTO NOVA_ALMACEN a
USING (SELECT 1 AS id FROM DUAL) src
ON (a.ALM_ALMACEN = src.id)
WHEN NOT MATCHED THEN INSERT (ALM_ALMACEN, ALM_NOMBRE, ALM_UBICACION)
VALUES (1, 'Almacen Central', 'Bodega Principal - Piso 1');

-- Marcas
MERGE INTO NOVA_MARCA m
USING (SELECT 1 AS id, 'Nike'  AS nombre FROM DUAL) src
ON (m.MARC_MARCA = src.id)
WHEN NOT MATCHED THEN INSERT (MARC_MARCA, MARC_NOMBRE, MARC_ACTIVO) VALUES (src.id, src.nombre, 1);

MERGE INTO NOVA_MARCA m
USING (SELECT 2 AS id, 'Zara'  AS nombre FROM DUAL) src
ON (m.MARC_MARCA = src.id)
WHEN NOT MATCHED THEN INSERT (MARC_MARCA, MARC_NOMBRE, MARC_ACTIVO) VALUES (src.id, src.nombre, 1);

MERGE INTO NOVA_MARCA m
USING (SELECT 3 AS id, 'H&M'   AS nombre FROM DUAL) src
ON (m.MARC_MARCA = src.id)
WHEN NOT MATCHED THEN INSERT (MARC_MARCA, MARC_NOMBRE, MARC_ACTIVO) VALUES (src.id, src.nombre, 1);

-- Categorías
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

-- Cliente de prueba
MERGE INTO NOVA_CLIENTE cli
USING (SELECT 1 AS id FROM DUAL) src
ON (cli.CLI_CLIENTE = src.id)
WHEN NOT MATCHED THEN INSERT (CLI_CLIENTE, CLI_NOMBRE, CLI_DPI_NIT, CLI_TELEFONO, CLI_CORREO, CLI_DIRECCION, CLI_ACTIVO)
VALUES (1, 'Maria Lopez', '1002003004001', '+502 5555-1234', 'maria.lopez@example.com', 'Zona 14, Ciudad de Guatemala', 1);

-- Producto de prueba
MERGE INTO NOVA_PRODUCTO p
USING (SELECT 1 AS id FROM DUAL) src
ON (p.PRODU_PRODUCTO = src.id)
WHEN NOT MATCHED THEN INSERT (PRODU_PRODUCTO, CAT_CATEGORIA, MARC_MARCA, PRODU_NOMBRE, PRODU_DESCRIPCION, PRODU_ACTIVO)
VALUES (1, 1, 1, 'Polera Deportiva Dri-FIT', 'Camiseta deportiva ligera y transpirable de alto rendimiento', 1);

-- Variante de prueba con regla de precio (venta > compra)
MERGE INTO NOVA_VARIANTE v
USING (SELECT 1 AS id FROM DUAL) src
ON (v.VAR_VARIANTE = src.id)
WHEN NOT MATCHED THEN INSERT (VAR_VARIANTE, PRODU_PRODUCTO, VAR_TALLA, VAR_COLOR, VAR_SKU, VAR_PRECIO_COMPRA, VAR_PRECIO_VENTA, VAR_STOCK_MINIMO, VAR_ACTIVO)
VALUES (1, 1, 'M', 'Negro', 'NIK-DRI-M-NEG', 15.00, 29.99, 5, 1);

-- Stock inicial en almacén 1 (50 unidades)
MERGE INTO NOVA_INVENTARIO inv
USING (SELECT 1 AS v_id, 1 AS alm_id FROM DUAL) src
ON (inv.VAR_VARIANTE = src.v_id AND inv.ALM_ALMACEN = src.alm_id)
WHEN MATCHED THEN UPDATE SET inv.INV_CANTIDAD = 50
WHEN NOT MATCHED THEN INSERT (VAR_VARIANTE, ALM_ALMACEN, INV_CANTIDAD)
VALUES (src.v_id, src.alm_id, 50);

COMMIT;

-- -----------------------------------------------------------------------------
-- 6. CORRECCION DE TRIGGERS — Prevenir duplicacion de inventario
-- -----------------------------------------------------------------------------
-- Deshabilita TRG_MOVI_ACTUALIZA_INV si existe (el trigger activo y correcto es TRG_MOVI_INVENTARIO)
BEGIN
    EXECUTE IMMEDIATE 'ALTER TRIGGER TRG_MOVI_ACTUALIZA_INV DISABLE';
EXCEPTION
    WHEN OTHERS THEN NULL;
END;
/

COMMIT;

-- =============================================================================
-- FIN DEL SCRIPT SEED
--
-- Credenciales de acceso:
--   ADMINISTRADOR: admin@novastore.com        / Admin1234!
--   OPERADOR:      operador@novastore.com      / Operador1234!
--   SUPERVISOR:    supervisor@novastore.com    / Supervisor1234!
-- =============================================================================
