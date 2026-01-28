-- ========================================
-- Base de Datos: nova_salud_db
-- Sistema de Gestión de Inventario y Ventas
-- Botica Nova Salud
-- ========================================

CREATE DATABASE IF NOT EXISTS nova_salud_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nova_salud_db;

-- ========================================
-- Tabla: usuarios
-- ========================================
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'vendedor') NOT NULL DEFAULT 'vendedor',
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_rol (rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Tabla: productos
-- ========================================
CREATE TABLE IF NOT EXISTS productos (
  id_producto INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  codigo_barras VARCHAR(50) UNIQUE,
  categoria VARCHAR(100) NOT NULL,
  precio_compra DECIMAL(10,2) NOT NULL,
  precio_venta DECIMAL(10,2) NOT NULL,
  stock_actual INT NOT NULL DEFAULT 0,
  stock_minimo INT NOT NULL DEFAULT 10,
  fecha_vencimiento DATE,
  laboratorio VARCHAR(100),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nombre (nombre),
  INDEX idx_categoria (categoria),
  INDEX idx_codigo_barras (codigo_barras),
  INDEX idx_stock (stock_actual)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Tabla: clientes
-- ========================================
CREATE TABLE IF NOT EXISTS clientes (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  dni VARCHAR(20) UNIQUE,
  telefono VARCHAR(20),
  email VARCHAR(100),
  direccion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dni (dni),
  INDEX idx_nombre_apellido (apellido, nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Tabla: ventas
-- ========================================
CREATE TABLE IF NOT EXISTS ventas (
  id_venta INT AUTO_INCREMENT PRIMARY KEY,
  id_cliente INT,
  id_usuario INT NOT NULL,
  fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  subtotal DECIMAL(10,2) NOT NULL,
  igv DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  tipo_pago ENUM('efectivo', 'tarjeta', 'transferencia') NOT NULL DEFAULT 'efectivo',
  estado ENUM('completada', 'cancelada') NOT NULL DEFAULT 'completada',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
  INDEX idx_fecha_venta (fecha_venta),
  INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Tabla: detalle_ventas
-- ========================================
CREATE TABLE IF NOT EXISTS detalle_ventas (
  id_detalle INT AUTO_INCREMENT PRIMARY KEY,
  id_venta INT NOT NULL,
  id_producto INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (id_venta) REFERENCES ventas(id_venta) ON DELETE CASCADE,
  FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE RESTRICT,
  INDEX idx_venta (id_venta),
  INDEX idx_producto (id_producto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Tabla: alertas_stock
-- ========================================
CREATE TABLE IF NOT EXISTS alertas_stock (
  id_alerta INT AUTO_INCREMENT PRIMARY KEY,
  id_producto INT NOT NULL,
  tipo ENUM('stock_bajo', 'producto_vencido') NOT NULL,
  mensaje TEXT NOT NULL,
  fecha_alerta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  leida BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE,
  INDEX idx_leida (leida),
  INDEX idx_fecha_alerta (fecha_alerta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Datos de Ejemplo
-- ========================================

-- Insertar usuarios (contraseñas hasheadas con bcrypt)
INSERT INTO usuarios (nombre, email, password, rol) VALUES
('Administrador Principal', 'admin@novasalud.com', '$2a$10$w5WZvQhHW9N0mTJJxjEmJ.gF5QN5.zQVZ3JqVXmXZK1kYmGKKGx4e', 'admin'),
('Carlos Vendedor', 'vendedor@novasalud.com', '$2a$10$w5WZvQhHW9N0mTJJxjEmJ.gF5QN5.zQVZ3JqVXmXZK1kYmGKKGx4e', 'vendedor'),
('María López', 'maria.lopez@novasalud.com', '$2a$10$w5WZvQhHW9N0mTJJxjEmJ.gF5QN5.zQVZ3JqVXmXZK1kYmGKKGx4e', 'vendedor');

-- Contraseña para todos: Admin123! (hash bcrypt)

-- Insertar productos farmacéuticos
INSERT INTO productos (nombre, descripcion, codigo_barras, categoria, precio_compra, precio_venta, stock_actual, stock_minimo, fecha_vencimiento, laboratorio) VALUES
('Paracetamol 500mg x 100', 'Analgésico y antipirético', '7501234567890', 'Analgésicos', 5.50, 8.00, 150, 50, '2026-12-31', 'Medifarma'),
('Ibuprofeno 400mg x 50', 'Antiinflamatorio no esteroideo', '7501234567891', 'Analgésicos', 8.00, 12.00, 80, 30, '2026-06-30', 'Farmindustria'),
('Amoxicilina 500mg x 20', 'Antibiótico de amplio espectro', '7501234567892', 'Antibióticos', 12.00, 18.00, 60, 40, '2025-12-31', 'Roemmers'),
('Omeprazol 20mg x 30', 'Inhibidor de la bomba de protones', '7501234567893', 'Gastroenterología', 10.00, 15.00, 45, 25, '2026-03-31', 'Bayer'),
('Loratadina 10mg x 30', 'Antihistamínico', '7501234567894', 'Alergias', 6.00, 9.00, 70, 30, '2026-09-30', 'Genfar'),
('Metformina 850mg x 60', 'Antidiabético oral', '7501234567895', 'Diabetes', 15.00, 22.00, 55, 35, '2026-08-31', 'Merck'),
('Atorvastatina 20mg x 30', 'Hipolipemiante', '7501234567896', 'Cardiología', 20.00, 30.00, 40, 20, '2026-05-31', 'Pfizer'),
('Aspirina 100mg x 100', 'Antiagregante plaquetario', '7501234567897', 'Cardiología', 5.00, 7.50, 120, 50, '2027-01-31', 'Bayer'),
('Ranitidina 150mg x 30', 'Antiácido', '7501234567898', 'Gastroenterología', 7.00, 11.00, 35, 25, '2025-11-30', 'GSK'),
('Cetirizina 10mg x 20', 'Antihistamínico', '7501234567899', 'Alergias', 4.50, 7.00, 90, 40, '2026-10-31', 'Lek'),
('Losartán 50mg x 30', 'Antihipertensivo', '7501234567900', 'Cardiología', 12.00, 18.00, 52, 30, '2026-07-31', 'Merck'),
('Azitromicina 500mg x 3', 'Antibiótico macrólido', '7501234567901', 'Antibióticos', 15.00, 22.00, 38, 20, '2025-10-31', 'Pfizer'),
('Diclofenaco Gel 50g', 'Antiinflamatorio tópico', '7501234567902', 'Uso Tópico', 8.00, 12.00, 65, 30, '2026-11-30', 'Voltaren'),
('Vitamina C 1000mg x 30', 'Suplemento vitamínico', '7501234567903', 'Vitaminas', 10.00, 15.00, 100, 40, '2027-02-28', 'Redoxon'),
('Vitamina D3 2000UI x 60', 'Suplemento vitamínico', '7501234567904', 'Vitaminas', 18.00, 25.00, 75, 30, '2027-03-31', 'Healthy'),
('Complejo B x 100', 'Suplemento vitamínico', '7501234567905', 'Vitaminas', 12.00, 18.00, 88, 35, '2026-12-31', 'Bedoyecta'),
('Alcohol en Gel 500ml', 'Antiséptico para manos', '7501234567906', 'Higiene', 8.00, 12.00, 200, 80, '2028-01-31', 'Nevex'),
('Mascarillas KN95 x 50', 'Protección respiratoria', '7501234567907', 'Protección', 25.00, 35.00, 150, 60, '2027-06-30', '3M'),
('Tensiómetro Digital', 'Medidor de presión arterial', '7501234567908', 'Equipos', 45.00, 65.00, 25, 10, NULL, 'Omron'),
('Termómetro Digital', 'Medidor de temperatura', '7501234567909', 'Equipos', 15.00, 22.00, 40, 15, NULL, 'Citizen'),
('Glucómetro + 50 tiras', 'Medidor de glucosa', '7501234567910', 'Equipos', 55.00, 80.00, 18, 10, '2026-09-30', 'Accu-Chek'),
('Suero Fisiológico 500ml', 'Solución salina', '7501234567911', 'Soluciones', 3.00, 5.00, 180, 70, '2026-04-30', 'Baxter'),
('Vendas Elásticas 10cm', 'Material de curación', '7501234567912', 'Curaciones', 4.00, 6.50, 95, 40, NULL, 'Hartmann'),
('Gasas Estériles x 100', 'Material de curación', '7501234567913', 'Curaciones', 10.00, 15.00, 110, 50, NULL, 'Hartmann'),
('Clorfenamina 4mg x 100', 'Antihistamínico', '7501234567914', 'Alergias', 5.00, 8.00, 72, 35, '2026-08-31', 'Inti'),
('Salbutamol Inhvaler', 'Broncodilatador', '7501234567915', 'Respiratorio', 18.00, 25.00, 32, 15, '2025-12-31', 'GSK'),
('Captopril 25mg x 30', 'Antihipertensivo', '7501234567916', 'Cardiología', 8.00, 12.00, 48, 25, '2026-06-30', 'Medrock'),
('Clonazepam 2mg x 30', 'Ansiolítico', '7501234567917', 'Sistema Nervioso', 15.00, 22.00, 28, 15, '2025-11-30', 'Roche'),
('Fluconazol 150mg', 'Antimicótico', '7501234567918', 'Antimicóticos', 12.00, 18.00, 42, 20, '2026-05-31', 'Pfizer'),
('Ciprofloxacino 500mg x 10', 'Antibiótico', '7501234567919', 'Antibióticos', 16.00, 24.00, 36, 15, '2025-10-31', 'Bayer'),
('Nimesulida 100mg x 20', 'Antiinflamatorio', '7501234567920', 'Analgésicos', 9.00, 14.00, 58, 25, '2026-07-31', 'Medifarma'),
('Ketorolaco 10mg x 6', 'Analgésico potente', '7501234567921', 'Analgésicos', 8.00, 12.00, 68, 30, '2026-02-28', 'Roche'),
('Tramadol 50mg x 10', 'Analgésico opioide', '7501234567922', 'Analgésicos', 14.00, 20.00, 24, 10, '2025-12-31', 'Grünenthal'),
('Dexametasona 4mg/mL Amp', 'Corticoide inyectable', '7501234567923', 'Inyectables', 5.00, 8.00, 50, 20, '2026-03-31', 'Pharmaceutical'),
('Complejo B Inyectable', 'Vitamina inyectable', '7501234567924', 'Inyectables', 8.00, 12.00, 44, 20, '2026-04-30', 'Bedoyecta'),
('Diclofenaco Inyectable', 'Antiinflamatorio inyectable', '7501234567925', 'Inyectables', 6.00, 9.00, 56, 25, '2026-01-31', 'Voltaren');

-- Insertar clientes
INSERT INTO clientes (nombre, apellido, dni, telefono, email, direccion) VALUES
('Juan', 'Pérez García', '12345678', '987654321', 'juan.perez@email.com', 'Av. Principal 123, Lima'),
('María', 'González López', '23456789', '987654322', 'maria.gonzalez@email.com', 'Jr. Los Olivos 456, Lima'),
('Carlos', 'Rodríguez Sánchez', '34567890', '987654323', 'carlos.rodriguez@email.com', 'Calle Las Flores 789, Callao'),
('Ana', 'Martínez Díaz', '45678901', '987654324', 'ana.martinez@email.com', 'Av. Universitaria 321, Lima'),
('Luis', 'Hernández Torres', '56789012', '987654325', 'luis.hernandez@email.com', 'Jr. Comercio 654, Lima'),
('Carmen', 'López Ramírez', '67890123', '987654326', 'carmen.lopez@email.com', 'Av. Arequipa 987, Lima'),
('Jorge', 'García Flores', '78901234', '987654327', 'jorge.garcia@email.com', 'Calle San Martín 159, Miraflores'),
('Rosa', 'Sánchez Vega', '89012345', '987654328', 'rosa.sanchez@email.com', 'Jr. Progreso 753, Lima'),
('Pedro', 'Torres Castillo', '90123456', '987654329', 'pedro.torres@email.com', 'Av. Brasil 852, Jesús María'),
('Laura', 'Ramírez Cruz', '01234567', '987654330', 'laura.ramirez@email.com', 'Calle Lima 456, Surco'),
('Miguel', 'Flores Morales', '11223344', '987654331', NULL, 'Av. Javier Prado 789, San Isidro'),
('Patricia', 'Vega Silva', '22334455', '987654332', NULL, 'Jr. Huancayo 321, Breña'),
('Roberto', 'Castillo Mendoza', '33445566', '987654333', 'roberto.castillo@email.com', 'Av. Colonial 654, Callao'),
('Diana', 'Cruz Vargas', '44556677', '987654334', NULL, 'Calle Los Pinos 987, La Molina'),
('Fernando', 'Morales Quispe', '55667788', '987654335', 'fernando.morales@email.com', 'Av. Venezuela 159, Cercado de Lima');

-- Insertar algunas ventas de ejemplo
INSERT INTO ventas (id_cliente, id_usuario, subtotal, igv, total, tipo_pago, estado) VALUES
(1, 2, 20.00, 3.60, 23.60, 'efectivo', 'completada'),
(2, 2, 45.00, 8.10, 53.10, 'tarjeta', 'completada'),
(3, 2, 30.00, 5.40, 35.40, 'efectivo', 'completada'),
(4, 3, 55.00, 9.90, 64.90, 'transferencia', 'completada'),
(NULL, 2, 15.00, 2.70, 17.70, 'efectivo', 'completada');

-- Insertar detalles de ventas
INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES
(1, 1, 2, 8.00, 16.00),
(1, 5, 1, 9.00, 9.00),
(2, 3, 2, 18.00, 36.00),
(2, 7, 1, 30.00, 30.00),
(3, 2, 2, 12.00, 24.00),
(3, 10, 1, 7.00, 7.00),
(4, 6, 2, 22.00, 44.00),
(4, 16, 1, 18.00, 18.00),
(5, 1, 1, 8.00, 8.00),
(5, 4, 1, 15.00, 15.00);

-- Insertar alertas de stock bajo
INSERT INTO alertas_stock (id_producto, tipo, mensaje, leida) VALUES
(9, 'stock_bajo', 'El producto "Ranitidina 150mg x 30" tiene stock bajo (35 unidades)', FALSE),
(21, 'stock_bajo', 'El producto "Glucómetro + 50 tiras" tiene stock bajo (18 unidades)', FALSE),
(28, 'stock_bajo', 'El producto "Clonazepam 2mg x 30" tiene stock bajo (28 unidades)', FALSE),
(33, 'stock_bajo', 'El producto "Tramadol 50mg x 10" tiene stock bajo (24 unidades)', FALSE),
(19, 'stock_bajo', 'El producto "Tensiómetro Digital" tiene stock bajo (25 unidades)', FALSE);

-- ========================================
-- Fin del Script
-- ========================================

SELECT 'Base de datos nova_salud_db creada exitosamente' AS Mensaje;
