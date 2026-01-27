import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext"; // <--- IMPORTANTE

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import VenueDetail from "./pages/VenueDetail";
// ProductDetail foi removido das rotas pois usaremos o Drawer na VenueDetail
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Checkout from "./pages/Checkout";
import OrderTracking from "./pages/OrderTracking";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CartProvider> {/* <--- ENVELOPA TUDO AQUI */}
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/place/:id" element={<VenueDetail />} />
            <Route path="/checkout" element={<Checkout />} /> 
            <Route path="/order/:id" element={<OrderTracking />} />
            {/* Rota checkout será criada na próxima fase */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;