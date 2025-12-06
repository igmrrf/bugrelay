"use client";

import * as React from "react";
import { Header } from "./header";
import { Footer } from "./footer";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useAuthStore } from "@/lib/stores";

interface MainLayoutProps {
  children: React.ReactNode;
  onSearch?: (query: string) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      <Footer />
    </div>
  );
};

