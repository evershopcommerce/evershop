'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useCartStore } from '@/store/cart';
import { ThemeToggle } from '../ui/ThemeToggle';
import {
  ShoppingCart,
  User,
  Menu,
  X,
  Search,
  LogOut,
  Package,
  Settings,
} from 'lucide-react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession();
  const itemCount = useCartStore((state) => state.getItemCount());

  const navigation = [
    { name: 'Shop', href: '/products' },
    { name: 'Categories', href: '/categories' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container-custom">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-md bg-primary" />
              <span className="text-xl font-bold">NexCommerce</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <Link
              href="/search"
              className="btn-ghost p-2"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </Link>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Cart */}
            <Link
              href="/cart"
              className="btn-ghost relative p-2"
              aria-label="Shopping cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {session ? (
              <div className="relative group">
                <button className="btn-ghost p-2" aria-label="User menu">
                  <User className="h-5 w-5" />
                </button>
                <div className="absolute right-0 mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bg-popover border rounded-md shadow-lg py-1">
                  <div className="px-4 py-2 text-sm border-b">
                    <p className="font-medium">{session.user?.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {session.user?.email}
                    </p>
                  </div>
                  <Link
                    href="/account"
                    className="flex items-center px-4 py-2 text-sm hover:bg-accent"
                  >
                    <User className="mr-2 h-4 w-4" />
                    My Account
                  </Link>
                  <Link
                    href="/account/orders"
                    className="flex items-center px-4 py-2 text-sm hover:bg-accent"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Orders
                  </Link>
                  {session.user?.role === 'ADMIN' && (
                    <Link
                      href="/admin"
                      className="flex items-center px-4 py-2 text-sm hover:bg-accent"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  )}
                  <button
                    onClick={() => signOut()}
                    className="flex w-full items-center px-4 py-2 text-sm hover:bg-accent text-left"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/auth/login" className="btn-primary text-sm">
                Sign In
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden btn-ghost p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4 animate-slide-down">
            <div className="flex flex-col space-y-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-sm font-medium transition-colors hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
