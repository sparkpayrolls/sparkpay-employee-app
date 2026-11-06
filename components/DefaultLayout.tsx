import React from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import BottomNav from "./BottomNav";
import Sidebar from "./Sidebar";
import { useDefaultLayout } from "../hooks/useDefaultLayout";

const DefaultLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useDefaultLayout();
  const location = useLocation();
  // a one-off message from the page that sent the person here
  const notice = (location.state as { notice?: string } | null)?.notice;
  const isPayslipDetail = /^\/app\/payslip\/[^/]+$/.test(location.pathname);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark">
      {/* Sidebar for medium screens and up */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content - min-w-0 prevents flex overflow from causing horizontal page scroll */}
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden pb-24 md:pb-0">
          {notice && (
            <p
              role="status"
              className="m-4 rounded-lg bg-primary/10 p-4 text-sm font-medium text-primary dark:bg-accent-blue/20 dark:text-accent-blue"
            >
              {notice}
            </p>
          )}
          <Outlet />
        </main>

        {/* BottomNav for small screens - hidden on payslip detail to avoid overlapping its footer */}
        {!isPayslipDetail && (
          <div className="md:hidden">
            <BottomNav />
          </div>
        )}
      </div>
    </div>
  );
};

export default DefaultLayout;
