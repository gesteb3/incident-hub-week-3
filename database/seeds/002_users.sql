INSERT INTO users (id, name, email, role) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Usuario Solicitante', 'solicitante@incident-hub.local', 'REQUESTER'),
  ('00000000-0000-4000-8000-000000000002', 'Técnico de Soporte', 'tecnico@incident-hub.local', 'TECHNICIAN'),
  ('00000000-0000-4000-8000-000000000003', 'Administrador', 'admin@incident-hub.local', 'ADMIN'),
  ('00000000-0000-4000-8000-000000000004', 'Ana López', 'ana.lopez@incident-hub.local', 'TECHNICIAN'),
  ('00000000-0000-4000-8000-000000000005', 'Carlos Méndez', 'carlos.mendez@incident-hub.local', 'TECHNICIAN')
ON CONFLICT (email) DO NOTHING;
