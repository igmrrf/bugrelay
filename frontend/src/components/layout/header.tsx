"use client";

import * as React from "react";
import Link from "next/link";
import { Bug, Menu, Search, User, User2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/lib/stores";

export const Header = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [searchQuery, setSearchQuery] = React.useState("");

  const { logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  console.log(user);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(searchQuery.trim());
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <Bug className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">BugRelay</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/bugs"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Browse Bugs
            </Link>
            <Link
              href="/submit"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Submit Bug
            </Link>
            <Link
              href="/companies"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Companies
            </Link>
          </nav>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-4">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search bugs, companies..."
              className="pl-10 pr-4"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        {/* User Actions */}
        <div className="flex items-center space-x-4">
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="flex gap-2">
                      <User className="h-4 w-4" />
                      {user.displayName}
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user.displayName}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={logout}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            className="md:hidden"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container py-4 space-y-2">
            <Link
              href="/bugs"
              className="block px-2 py-1 text-sm font-medium transition-colors hover:text-foreground/80 text-foreground/60"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Browse Bugs
            </Link>
            <Link
              href="/submit"
              className="block px-2 py-1 text-sm font-medium transition-colors hover:text-foreground/80 text-foreground/60"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Submit Bug
            </Link>
            <Link
              href="/companies"
              className="block px-2 py-1 text-sm font-medium transition-colors hover:text-foreground/80 text-foreground/60"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Companies
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};
