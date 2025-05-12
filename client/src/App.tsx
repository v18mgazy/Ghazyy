import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import SalesPage from "@/pages/index";
import ManagementPage from "@/pages/management";
import ReportsPage from "@/pages/reports";
import CustomersPage from "@/pages/customers";
import InvoiceManagementPage from "@/pages/invoice-management-new";
import NewInvoicePage from "@/pages/invoice/new";
import AppLayout from "./components/layout/app-layout";
import { useEffect, useContext } from "react";
import { AuthProvider, useAuthContext } from "@/context/auth-context";

function ProtectedRoutes() {
  const { user, loading, isAdmin } = useAuthContext();
  const [location, setLocation] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user && location !== "/login") {
      setLocation("/login");
    }
  }, [user, loading, location, setLocation]);

  // Protected route wrapper
  const ProtectedRoute = ({
    component: Component,
    adminOnly = false,
  }: {
    component: React.ComponentType;
    adminOnly?: boolean;
  }) => {
    if (loading) {
      return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!user) {
      return null; // Will be redirected by the above effect
    }

    if (adminOnly && !isAdmin) {
      return <NotFound />;
    }

    return (
      <AppLayout>
        <Component />
      </AppLayout>
    );
  };

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        {() => <ProtectedRoute component={SalesPage} />}
      </Route>
      <Route path="/management">
        {() => <ProtectedRoute component={ManagementPage} adminOnly={true} />}
      </Route>
      <Route path="/reports">
        {() => <ProtectedRoute component={ReportsPage} adminOnly={true} />}
      </Route>
      <Route path="/customers">
        {() => <ProtectedRoute component={CustomersPage} adminOnly={true} />}
      </Route>
      <Route path="/invoices">
        {() => <ProtectedRoute component={InvoiceManagementPage} adminOnly={false} />}
      </Route>
      <Route path="/invoice/new">
        {() => <ProtectedRoute component={NewInvoicePage} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <ProtectedRoutes />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;