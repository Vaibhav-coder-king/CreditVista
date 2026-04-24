import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageLayout } from "@/components/PageLayout";
import { VistaProvider } from "@/state/VistaContext";
import Landing from "./pages/Landing";
import Score from "./pages/Score";
import Dashboard from "./pages/Dashboard";
import Retrieve from "./pages/Retrieve";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" theme="dark" richColors />
      <VistaProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PageLayout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/score" element={<Score />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/retrieve" element={<Retrieve />} />
              <Route path="/about" element={<About />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </VistaProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
