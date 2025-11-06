# NexCommerce - Modern E-commerce Platform

A production-ready, full-stack e-commerce platform built with Next.js 14, TypeScript, Prisma, and Tailwind CSS. Features a complete shopping experience with product management, cart functionality, checkout flow, payment integration, and admin dashboard.

![NexCommerce](https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200)

## ✨ Features

### Customer-Facing Features
- 🛍️ **Product Catalog** - Browse products with filtering, sorting, and search
- 🖼️ **Product Details** - High-quality images with zoom, variants, and detailed descriptions
- 🛒 **Shopping Cart** - Persistent cart with real-time updates
- 💳 **Checkout Flow** - Multi-step checkout with address management
- 💰 **Payment Integration** - Stripe payment processing
- 👤 **User Authentication** - Secure login/signup with NextAuth
- 📱 **Responsive Design** - Fully responsive across all devices
- 🌙 **Dark Mode** - Beautiful dark/light theme toggle
- ⚡ **Fast Performance** - Optimized with Next.js 14 App Router
- 🎨 **Smooth Animations** - Framer Motion animations throughout

### Admin Features
- 📊 **Admin Dashboard** - Overview of orders, products, and revenue
- 📦 **Product Management** - Full CRUD operations for products
- 📋 **Order Management** - View and manage customer orders
- 👥 **User Management** - Manage customers and admins
- ⚙️ **Settings** - Configure site settings and preferences

### Technical Features
- 🔒 **Secure Authentication** - Password hashing with bcrypt
- 🗄️ **PostgreSQL Database** - Robust data storage with Prisma ORM
- 📝 **TypeScript** - Type-safe codebase
- 🎨 **Tailwind CSS** - Utility-first styling with custom theme
- 🔄 **State Management** - Zustand for cart state
- 📧 **Email Notifications** - Order confirmations (optional)
- 🐳 **Docker Support** - Easy deployment with Docker
- 🔍 **SEO Optimized** - Meta tags, Open Graph, and sitemaps

## 🚀 Quick Start

### Prerequisites

- Node.js 18.17 or higher
- npm 9.0 or higher
- PostgreSQL 12 or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/nexcommerce.git
   cd nexcommerce/nexcommerce
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure your database and other settings:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/nexcommerce"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="your-stripe-key"
   STRIPE_SECRET_KEY="your-stripe-secret"
   ```

4. **Initialize the database**
   ```bash
   npm run db:push
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Setup

### Using PostgreSQL Locally

1. **Install PostgreSQL** (if not installed)
   - macOS: `brew install postgresql`
   - Ubuntu: `sudo apt-get install postgresql`
   - Windows: Download from [postgresql.org](https://www.postgresql.org/download/)

2. **Create database**
   ```bash
   createdb nexcommerce
   ```

3. **Update DATABASE_URL** in `.env`
   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/nexcommerce"
   ```

### Using Docker

```bash
docker-compose up -d postgres
```

## 👤 Default Credentials

After seeding the database, you can login with:

**Admin Account:**
- Email: `admin@nexcommerce.com`
- Password: `admin123`

**Customer Account:**
- Email: `customer@example.com`
- Password: `customer123`

**⚠️ Important:** Change these credentials in production!

## 📁 Project Structure

```
nexcommerce/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts            # Seed data
├── src/
│   ├── app/               # Next.js 14 App Router
│   │   ├── api/          # API routes
│   │   ├── auth/         # Authentication pages
│   │   ├── products/     # Product pages
│   │   ├── cart/         # Shopping cart
│   │   ├── checkout/     # Checkout flow
│   │   └── admin/        # Admin dashboard
│   ├── components/        # React components
│   │   ├── layout/       # Header, Footer, etc.
│   │   ├── product/      # Product components
│   │   ├── home/         # Home page components
│   │   └── ui/           # UI components
│   ├── lib/              # Utility functions
│   │   ├── prisma.ts     # Prisma client
│   │   ├── auth-options.ts  # NextAuth config
│   │   └── utils.ts      # Helper functions
│   ├── store/            # Zustand stores
│   │   └── cart.ts       # Cart state
│   ├── types/            # TypeScript types
│   └── styles/           # Global styles
├── public/               # Static assets
├── .env.example          # Environment template
├── tailwind.config.ts    # Tailwind configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database with sample data
npm run db:studio        # Open Prisma Studio

# Type Checking
npm run type-check       # Check TypeScript types
```

## 🎨 Customization

### Changing Colors

Edit `tailwind.config.ts` to customize the color scheme:

```typescript
colors: {
  primary: {
    500: '#0ea5e9',  // Your primary color
    // ... other shades
  },
}
```

### Adding Products

1. Use the admin dashboard at `/admin`
2. Or seed your own data in `prisma/seed.ts`

### Configuring Payments

1. Sign up for [Stripe](https://stripe.com)
2. Get your API keys from the Dashboard
3. Add keys to `.env`:
   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
   STRIPE_SECRET_KEY="sk_test_..."
   ```

## 🐳 Docker Deployment

### Build and run with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Using Dockerfile only

```bash
# Build image
docker build -t nexcommerce .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="your-db-url" \
  -e NEXTAUTH_SECRET="your-secret" \
  nexcommerce
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy!

### Other Platforms

- **Railway:** One-click deploy with PostgreSQL
- **Render:** Deploy with managed PostgreSQL
- **AWS/GCP/Azure:** Use Docker image

### Environment Variables for Production

Make sure to set these in your deployment platform:
- `DATABASE_URL`
- `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` (your production URL)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`

## 🔒 Security Best Practices

- ✅ All passwords are hashed with bcrypt
- ✅ CSRF protection with NextAuth
- ✅ SQL injection prevention with Prisma
- ✅ XSS protection with React
- ✅ Secure headers with Next.js
- ⚠️ Always use HTTPS in production
- ⚠️ Change default admin credentials
- ⚠️ Use strong `NEXTAUTH_SECRET`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Database with [Prisma](https://www.prisma.io/)
- Authentication with [NextAuth.js](https://next-auth.js.org/)
- Payments with [Stripe](https://stripe.com/)
- Icons from [Lucide](https://lucide.dev/)

## 📧 Support

For support, email support@nexcommerce.com or open an issue on GitHub.

## 🗺️ Roadmap

- [ ] PayPal integration
- [ ] Product reviews and ratings
- [ ] Wishlist functionality
- [ ] Advanced search with filters
- [ ] Email notifications
- [ ] Multi-currency support
- [ ] Inventory management
- [ ] Discount codes and coupons
- [ ] Product recommendations
- [ ] Analytics dashboard

---

**Built with ❤️ by the NexCommerce Team**
