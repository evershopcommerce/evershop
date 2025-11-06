import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Package, ShoppingCart, Users, DollarSign } from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/login');
  }

  // Get statistics
  const [totalProducts, totalOrders, totalUsers, recentOrders] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count(),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const totalRevenue = await prisma.order.aggregate({
    _sum: {
      total: true,
    },
    where: {
      paymentStatus: 'PAID',
    },
  });

  const stats = [
    {
      name: 'Total Products',
      value: totalProducts,
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      name: 'Total Orders',
      value: totalOrders,
      icon: ShoppingCart,
      color: 'bg-green-500',
    },
    {
      name: 'Total Users',
      value: totalUsers,
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      name: 'Revenue',
      value: `$${Number(totalRevenue._sum.total || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-yellow-500',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back, {session.user.name}
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.name} className="card p-6">
                  <div className="flex items-center gap-4">
                    <div className={`${stat.color} p-3 rounded-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.name}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="card p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/admin/products/new" className="btn-primary">
                Add Product
              </Link>
              <Link href="/admin/products" className="btn-outline">
                Manage Products
              </Link>
              <Link href="/admin/orders" className="btn-outline">
                View Orders
              </Link>
              <Link href="/admin/settings" className="btn-outline">
                Settings
              </Link>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="card p-6">
            <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Order #</th>
                    <th className="text-left py-3 px-2">Customer</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-right py-3 px-2">Total</th>
                    <th className="text-right py-3 px-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b">
                      <td className="py-3 px-2">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-primary hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-2">{order.user.name}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`badge ${
                            order.status === 'DELIVERED'
                              ? 'badge-default'
                              : 'badge-secondary'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        ${Number(order.total).toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-right text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
