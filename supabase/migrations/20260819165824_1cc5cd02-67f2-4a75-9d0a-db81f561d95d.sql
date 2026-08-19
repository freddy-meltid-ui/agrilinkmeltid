REVOKE ALL ON FUNCTION public.v2_is_agrigrid_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_is_field_agent(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_can_access_supplier(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_is_agrigrid_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.v2_is_field_agent(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.v2_can_access_supplier(uuid, uuid) TO authenticated, service_role;