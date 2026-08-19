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
              <Route
                path="supply"
                element={<ModulePlaceholder titleKey="v2.supply.title" descriptionKey="v2.supply.description" phaseKey="v2.phase.p1" />}
              />
              <Route
                path="sourcing"
                element={<ModulePlaceholder titleKey="v2.sourcing.title" descriptionKey="v2.sourcing.description" phaseKey="v2.phase.p1" />}
              />
              <Route
                path="suppliers"
                element={<ModulePlaceholder titleKey="v2.suppliers.title" descriptionKey="v2.suppliers.description" phaseKey="v2.phase.p1" />}
              />
              <Route
                path="operations"
                element={<ModulePlaceholder titleKey="v2.operations.title" descriptionKey="v2.operations.description" phaseKey="v2.phase.p2" />}
              />
              <Route path="atlas" element={<V2Atlas />} />
              <Route
                path="compliance"
                element={<ModulePlaceholder titleKey="v2.compliance.title" descriptionKey="v2.compliance.description" phaseKey="v2.phase.p3" />}
              />
              <Route
                path="finance"
                element={<ModulePlaceholder titleKey="v2.finance.title" descriptionKey="v2.finance.description" phaseKey="v2.phase.p4" />}
              />
              <Route
                path="documents"
                element={<ModulePlaceholder titleKey="v2.documents.title" descriptionKey="v2.documents.description" phaseKey="v2.phase.p3" />}
              />
              <Route path="marketplace" element={<V2Marketplace />} />
              <Route path="settings" element={<V2Settings />} />
            </Route>
            <Route path="/legacy" element={<Navigate to="/dashboard" replace />} />

            <Route path="*" element={<NotFound />} />
            </Routes>
          </SyncQueueProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
