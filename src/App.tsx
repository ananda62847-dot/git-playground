import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import MobileAuth from "./pages/MobileAuth";
import NotFound from "./pages/NotFound";
import ChunkErrorBoundary from "@/components/ChunkErrorBoundary";

// Auth + admin/cadre only — citizen-facing routes are unmounted (code preserved on disk).
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const CadreRegister = lazy(() => import("./pages/CadreRegister"));
const CadreLogin = lazy(() => import("./pages/CadreLogin"));
const CadreDashboard = lazy(() => import("./pages/CadreDashboard"));
const CadreScoreHistory = lazy(() => import("./pages/CadreScoreHistory"));
const CadreReportDetail = lazy(() => import("./pages/CadreReportDetail"));
const ChatBot = lazy(() => import("./pages/ChatBot"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 300_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search]);
  return null;
};

const RouteFallback = () => (
  <div className="fixed top-0 inset-x-0 z-[100] h-0.5 bg-primary/20 overflow-hidden">
    <div className="h-full w-1/3 bg-primary animate-[loading_1s_ease-in-out_infinite]" />
    <style>{`@keyframes loading{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}`}</style>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <ChunkErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<MobileAuth />} />
                <Route path="/mobile-auth" element={<MobileAuth />} />
                <Route path="/admin" element={<AdminLogin />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/cadre/register" element={<CadreRegister />} />
                <Route path="/cadre/login" element={<CadreLogin />} />
                <Route path="/cadre" element={<CadreDashboard />} />
                <Route path="/cadre/score-history" element={<CadreScoreHistory />} />
                <Route path="/cadre/report/:id" element={<CadreReportDetail />} />
                <Route path="/cadre/chat" element={<ChatBot />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ChunkErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
