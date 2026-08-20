UPDATE public.v2_finance_shares
SET revoked_at = now()
WHERE recipient_name = 'Banque Test SA' AND revoked_at IS NULL;

DELETE FROM public.v2_finance_document_links
WHERE document_id IN ('41edf2a7-ffe7-4852-aac6-224c4fb27773','fb5c710d-142e-43da-9911-4ffbee766b79');

DELETE FROM public.v2_compliance_document_versions
WHERE document_id IN ('41edf2a7-ffe7-4852-aac6-224c4fb27773','fb5c710d-142e-43da-9911-4ffbee766b79');

DELETE FROM public.v2_compliance_documents
WHERE id IN ('41edf2a7-ffe7-4852-aac6-224c4fb27773','fb5c710d-142e-43da-9911-4ffbee766b79');