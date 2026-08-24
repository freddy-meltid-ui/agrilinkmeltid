import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Marketplace from "./pages/Marketplace";
import NewListing from "./pages/NewListing";
import ListingDetail from "./pages/ListingDetail";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import Reputation from "./pages/Reputation";
import NearbyMatches from "./pages/NearbyMatches";
import CropPrices from "./pages/CropPrices";
import ListingSuggestions from "./pages/ListingSuggestions";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import AtlasDashboard from "./pages/AtlasDashboard";
import RegionProfile from "./pages/RegionProfile";
import AgriculturalAtlasPage from "./pages/AgriculturalAtlasPage";
import OfflineAtlas from "./pages/OfflineAtlas";
import PendingSync from "./pages/PendingSync";
import SyncQueueProvider from "./components/SyncQueueProvider";
// AGRI-GRID V2 modules (parallel to V1 — V1 routes below remain untouched)
import V2Layout from "./pages/v2/V2Layout";
import ModulePlaceholder from "./pages/v2/ModulePlaceholder";
import V2Atlas from "./pages/v2/V2Atlas";
import V2Marketplace from "./pages/v2/V2Marketplace";
import V2Settings from "./pages/v2/V2Settings";
import V2Dashboard from "./pages/v2/V2Dashboard";
import V2Onboarding from "./pages/v2/V2Onboarding";
import V2ProcessorProfile from "./pages/v2/V2ProcessorProfile";
import V2FieldLayout from "./pages/v2/field/V2FieldLayout";
import V2FieldDashboard from "./pages/v2/field/V2FieldDashboard";
import V2FieldSuppliers from "./pages/v2/field/V2FieldSuppliers";
import V2RegisterSupplier from "./pages/v2/field/V2RegisterSupplier";
import V2SupplierDetail from "./pages/v2/field/V2SupplierDetail";
import V2FieldAdmin from "./pages/v2/field/V2FieldAdmin";
import V2DataQuality from "./pages/v2/field/V2DataQuality";
import V2SupplyDiscovery from "./pages/v2/V2SupplyDiscovery";
import V2SupplyDetail from "./pages/v2/V2SupplyDetail";
import V2SourcingList from "./pages/v2/sourcing/V2SourcingList";
import V2SourcingNew from "./pages/v2/sourcing/V2SourcingNew";
import V2SourcingDetail from "./pages/v2/sourcing/V2SourcingDetail";
import V2FieldTasks from "./pages/v2/field/V2FieldTasks";
import V2CommercialConfirmations from "./pages/v2/field/V2CommercialConfirmations";
import V2Operations from "./pages/v2/operations/V2Operations";
import V2OrderDetail from "./pages/v2/operations/V2OrderDetail";
import V2Inventory from "./pages/v2/operations/V2Inventory";
import V2Production from "./pages/v2/operations/V2Production";
import V2ProductionNew from "./pages/v2/operations/V2ProductionNew";
import V2ProductionDetail from "./pages/v2/operations/V2ProductionDetail";
import V2FinishedGoods from "./pages/v2/operations/V2FinishedGoods";
import V2Traceability from "./pages/v2/operations/V2Traceability";
import V2Customers from "./pages/v2/operations/V2Customers";
import V2Sales from "./pages/v2/operations/V2Sales";
import V2SalesNew from "./pages/v2/operations/V2SalesNew";
import V2SaleDetail from "./pages/v2/operations/V2SaleDetail";
import V2Expenses from "./pages/v2/operations/V2Expenses";
import V2Performance from "./pages/v2/operations/V2Performance";
import V2ComplianceLayout from "./pages/v2/compliance/V2ComplianceLayout";
import V2ComplianceOverview from "./pages/v2/compliance/V2ComplianceOverview";
import V2ComplianceAssessment from "./pages/v2/compliance/V2ComplianceAssessment";
import V2ComplianceActions from "./pages/v2/compliance/V2ComplianceActions";
import V2ComplianceDocuments from "./pages/v2/compliance/V2ComplianceDocuments";
import V2ComplianceAuditPack from "./pages/v2/compliance/V2ComplianceAuditPack";
import V2FinanceLayout from "./pages/v2/finance/V2FinanceLayout";
import V2FinanceOverview from "./pages/v2/finance/V2FinanceOverview";
import V2FinanceRequest from "./pages/v2/finance/V2FinanceRequest";
import V2FinanceDocuments from "./pages/v2/finance/V2FinanceDocuments";
import V2FinanceDossier from "./pages/v2/finance/V2FinanceDossier";
import V2FinanceSharing from "./pages/v2/finance/V2FinanceSharing";
import V2FinanceSharedDossier from "./pages/v2/finance/V2FinanceSharedDossier";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SyncQueueProvider>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/marketplace/new" element={<NewListing />} />
            <Route path="/marketplace/:id" element={<ListingDetail />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/reputation" element={<Reputation />} />
            <Route path="/nearby" element={<NearbyMatches />} />
            <Route path="/crop-prices" element={<CropPrices />} />
            <Route path="/harvest-suggestions" element={<ListingSuggestions />} />
            <Route path="/listing-suggestions" element={<ListingSuggestions />} />
            <Route path="/atlas" element={<AgriculturalAtlasPage />} />
            <Route path="/atlas/explorer" element={<AtlasDashboard />} />
            <Route path="/atlas/region/:regionId" element={<RegionProfile />} />
            <Route path="/atlas/offline" element={<OfflineAtlas />} />
            <Route path="/atlas/sync" element={<PendingSync />} />

            {/* ===== AGRI-GRID V2 (parallel app shell) ===== */}
            <Route path="/app" element={<V2Layout />}>
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<V2Dashboard />} />
              <Route path="onboarding" element={<V2Onboarding />} />
              <Route path="processor" element={<V2ProcessorProfile />} />
              <Route path="field" element={<V2FieldLayout />}>
                <Route index element={<V2FieldDashboard />} />
                <Route path="suppliers" element={<V2FieldSuppliers />} />
                <Route path="suppliers/new" element={<V2RegisterSupplier />} />
                <Route path="suppliers/:id" element={<V2SupplierDetail />} />
                <Route path="tasks" element={<V2FieldTasks />} />
                <Route path="confirmations" element={<V2CommercialConfirmations />} />
                <Route path="admin" element={<V2FieldAdmin />} />
                <Route path="quality" element={<V2DataQuality />} />
              </Route>
              <Route path="supply" element={<V2SupplyDiscovery />} />
              <Route path="supply/:id" element={<V2SupplyDetail />} />

              <Route path="sourcing" element={<V2SourcingList />} />
              <Route path="sourcing/new" element={<V2SourcingNew />} />
              <Route path="sourcing/:id" element={<V2SourcingDetail />} />
              <Route
                path="suppliers"
                element={<ModulePlaceholder titleKey="v2.suppliers.title" descriptionKey="v2.suppliers.description" phaseKey="v2.phase.p1" />}
              />
              <Route path="operations" element={<V2Operations />} />
              <Route path="operations/orders/:orderId" element={<V2OrderDetail />} />
              <Route path="operations/inventory" element={<V2Inventory />} />
              <Route path="operations/production" element={<V2Production />} />
              <Route path="operations/production/new" element={<V2ProductionNew />} />
              <Route path="operations/production/:batchId" element={<V2ProductionDetail />} />
              <Route path="operations/finished-goods" element={<V2FinishedGoods />} />
              <Route path="operations/finished-goods/:finishedBatchId" element={<V2Traceability />} />
              <Route path="operations/customers" element={<V2Customers />} />
              <Route path="operations/sales" element={<V2Sales />} />
              <Route path="operations/sales/new" element={<V2SalesNew />} />
              <Route path="operations/sales/:saleId" element={<V2SaleDetail />} />
              <Route path="operations/expenses" element={<V2Expenses />} />
              <Route path="operations/performance" element={<V2Performance />} />
              <Route path="atlas" element={<V2Atlas />} />
              <Route path="compliance" element={<V2ComplianceLayout />}>
                <Route index element={<V2ComplianceOverview />} />
                <Route path="copilot" element={<V2ComplianceCopilot />} />
                <Route path="copilot/:analysisId" element={<V2CopilotAnalysis />} />
                <Route path="actions" element={<V2ComplianceActions />} />
                <Route path="documents" element={<V2ComplianceDocuments />} />
              </Route>
              <Route path="compliance/programs/:orgProgramId" element={<V2ComplianceAssessment />} />
              <Route path="compliance/programs/:orgProgramId/audit-pack" element={<V2ComplianceAuditPack />} />

              <Route path="finance" element={<V2FinanceLayout />}>
                <Route index element={<V2FinanceOverview />} />
                <Route path="request" element={<V2FinanceRequest />} />
                <Route path="documents" element={<V2FinanceDocuments />} />
                <Route path="dossier" element={<V2FinanceDossier />} />
                <Route path="sharing" element={<V2FinanceSharing />} />
              </Route>


              <Route
                path="documents"
                element={<ModulePlaceholder titleKey="v2.documents.title" descriptionKey="v2.documents.description" phaseKey="v2.phase.p3" />}
              />
              <Route path="marketplace" element={<V2Marketplace />} />
              <Route path="settings" element={<V2Settings />} />
            </Route>
            <Route path="/legacy" element={<Navigate to="/dashboard" replace />} />

            {/* Consent-based lender pack: public, token-only, no session required. */}
            <Route path="/finance-pack/:token" element={<V2FinanceSharedDossier />} />

            <Route path="*" element={<NotFound />} />
            </Routes>
          </SyncQueueProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
