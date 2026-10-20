-- Datos iniciales de demostración. Es idempotente para entornos que ya tienen
-- la migración base aplicada y no modifica incidentes existentes.
INSERT INTO users (id, name, email, role)
VALUES
  ('00000000-0000-4000-8000-000000000004', 'Ana López', 'ana.lopez@incident-hub.local', 'TECHNICIAN'),
  ('00000000-0000-4000-8000-000000000005', 'Carlos Méndez', 'carlos.mendez@incident-hub.local', 'TECHNICIAN')
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name, role = EXCLUDED.role, active = TRUE;
