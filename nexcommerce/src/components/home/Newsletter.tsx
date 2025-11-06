'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Thanks for subscribing!');
      setEmail('');
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16 md:py-24">
      <div className="container-custom">
        <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 p-8 md:p-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-6">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Subscribe to Our Newsletter
            </h2>
            <p className="text-muted-foreground mb-8">
              Get the latest updates on new products, special offers, and exclusive deals delivered to your inbox.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="input flex-1"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="btn-primary whitespace-nowrap"
              >
                {loading ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
            <p className="mt-4 text-xs text-muted-foreground">
              By subscribing, you agree to our Privacy Policy and consent to receive updates.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
