import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
