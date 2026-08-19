// AGRI-GRID V2 — reuses the existing V1 Atlas module inside the V2 shell (V1 code untouched)
import { useTranslation } from "react-i18next";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import AgriculturalAtlasPage from "@/pages/AgriculturalAtlasPage";

const V2Atlas = () => {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t("v2.atlas.title")} description={t("v2.atlas.description")} />
      <AgriculturalAtlasPage />
    </>
  );
};

export default V2Atlas;
