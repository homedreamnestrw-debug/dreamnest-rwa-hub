INSERT INTO public.user_roles (user_id, role)
VALUES ('11b452e4-5715-4d10-9dab-0a9ecec33a4c', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;