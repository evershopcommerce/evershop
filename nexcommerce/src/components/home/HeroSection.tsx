'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20 md:py-32">
      <div className="container-custom">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col justify-center"
          >
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Welcome to{' '}
              <span className="text-primary">NexCommerce</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Discover amazing products at unbeatable prices. Shop the latest
              trends in electronics, fashion, and home essentials.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link href="/products" className="btn-primary px-8 py-3 text-base">
                Shop Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link href="/categories" className="btn-outline px-8 py-3 text-base">
                Browse Categories
              </Link>
            </div>
            <div className="mt-12 grid grid-cols-3 gap-8">
              <div>
                <p className="text-3xl font-bold">10K+</p>
                <p className="text-sm text-muted-foreground">Products</p>
              </div>
              <div>
                <p className="text-3xl font-bold">50K+</p>
                <p className="text-sm text-muted-foreground">Happy Customers</p>
              </div>
              <div>
                <p className="text-3xl font-bold">4.8</p>
                <p className="text-sm text-muted-foreground">Rating</p>
              </div>
            </div>
          </motion.div>

          {/* Right Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="aspect-square relative rounded-2xl overflow-hidden bg-muted">
              <img
                src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800"
                alt="Shopping"
                className="object-cover w-full h-full"
              />
            </div>
            {/* Floating Cards */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="absolute -left-8 top-1/4 card p-4 shadow-lg"
            >
              <p className="text-sm font-semibold">Free Shipping</p>
              <p className="text-xs text-muted-foreground">On orders over $100</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="absolute -right-8 bottom-1/4 card p-4 shadow-lg"
            >
              <p className="text-sm font-semibold">24/7 Support</p>
              <p className="text-xs text-muted-foreground">Always here to help</p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Background Decorations */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />
      </div>
    </section>
  );
}
