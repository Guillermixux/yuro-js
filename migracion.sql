-- ============================================
-- MIGRACIÓN: PythonAnywhere → Cloudflare D1
-- ============================================
-- Ejecutar: wrangler d1 execute yuro --file=./migracion.sql
-- ============================================

-- NOTA: Los usuarios se migran con password temporal "yuro2024"
-- Después del primer login, deberán cambiar la contraseña

-- USUARIOS (direcciones youro... convertidas a yuro...)
INSERT OR IGNORE INTO usuarios (nombre, password_hash, direccion, es_admin, congelado, csrf, creado, sesion_token, sesion_expira, necesita_cambiar_password) VALUES
('Hacienda', 'TEMPORAL_yuro2024', 'yurod2f71ec9544e9c9cdc48c7fa97aa081b40f21cc9', 1, 0, 'csrf_hacienda_mig', 1791931932.9574842, NULL, NULL, 1),
('Guille', 'TEMPORAL_yuro2024', 'yuro0768ee47388c350c9a4f163be0f664e888431a69', 0, 0, 'csrf_guille_mig', 1791932871.5026264, NULL, NULL, 1);

-- TRANSACCIONES (con direcciones youro... → yuro...)
INSERT INTO transacciones (de, para, cantidad, concepto, timestamp, tipo) VALUES
('FAUCET', 'yuro97ce6d980b772b082284238e425c386e9893df1f', 100.0, 'Bienvenida', 1791930801.0450425, 'bienvenida'),
('FAUCET', 'yurod2f71ec9544e9c9cdc48c7fa97aa081b40f21cc9', 100.0, 'Bienvenida', 1791931932.973504, 'bienvenida'),
('FAUCET', 'yuro0768ee47388c350c9a4f163be0f664e888431a69', 100.0, 'Bienvenida', 1791932871.5236278, 'bienvenida'),
('COINBASE', 'yuro0768ee47388c350c9a4f163be0f664e888431a69', 50.0, 'Minería', 1791932883.0113134, 'mineria'),
('COINBASE', 'yuro0768ee47388c350c9a4f163be0f664e888431a69', 50.0, 'Minería', 1791932894.5398736, 'mineria'),
('GOBIERNO', 'yuro0768ee47388c350c9a4f163be0f664e888431a69', 1.0, 'Envío del gobierno', 1791934493.4466717, 'envio'),
('yurod2f71ec9544e9c9cdc48c7fa97aa081b40f21cc9', 'yuro0768ee47388c350c9a4f163be0f664e888431a69', 39.5, 'pizza', 1791934901.143741, 'envio'),
('yurod2f71ec9544e9c9cdc48c7fa97aa081b40f21cc9', 'GOBIERNO', 10.5, 'Impuesto (21.0%)', 1791934901.1577096, 'impuesto'),
('COINBASE', 'yurod2f71ec9544e9c9cdc48c7fa97aa081b40f21cc9', 50.0, 'Minería', 1791966121.6727314, 'mineria');

-- BLOQUE GENESIS
INSERT INTO bloques (numero, hash, hash_anterior, nonce, minero, recompensa, timestamp) VALUES
(0, 'genesis_migrado', '0', 0, 'Hacienda', 0, 1791931932.9574842);
