import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import CustomerCalling from "./pages/CustomerCalling";
import ReCalling from "./pages/ReCalling";
import TotalCalls from "./pages/TotalCalls";
import Users from "./pages/Users";
import UserKYC from "./pages/UserKYC";
import SalarySlip from "./pages/SalarySlip";
import ImportData from "./pages/ImportData";
import Reports from "./pages/Reports";
import SessionLogs from "./pages/SessionLogs";
import LiveMonitoring from "./pages/LiveMonitoring";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/calling" element={<ProtectedRoute><CustomerCalling /></ProtectedRoute>} />
      <Route path="/recalling" element={<ProtectedRoute><ReCalling /></ProtectedRoute>} />
      <Route path="/total-calls" element={<ProtectedRoute><TotalCalls /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
      <Route path="/kyc" element={<ProtectedRoute><UserKYC /></ProtectedRoute>} />
      <Route path="/salary" element={<ProtectedRoute><SalarySlip /></ProtectedRoute>} />
      <Route path="/import" element={<ProtectedRoute><ImportData /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/sessions" element={<ProtectedRoute><SessionLogs /></ProtectedRoute>} />
      <Route path="/monitoring" element={<ProtectedRoute><LiveMonitoring /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
