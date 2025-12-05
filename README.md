<div align="center">

# 🛒 Multi-Vendor E-Commerce Platform

### Enterprise-Grade REST API for Multi-Stakeholder Marketplace

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

A production-ready, scalable multi-vendor e-commerce backend with comprehensive marketplace features, advanced RBAC, vendor management, and real-time capabilities.

[Features](#-features) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [API Documentation](#-api-documentation) • [Architecture](#-architecture)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Security](#-security)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**WayWise** is a comprehensive multi-vendor e-commerce platform designed to support multiple stakeholders including vendors, service providers, and administrators. Built with modern technologies and best practices, it provides a robust foundation for marketplace applications.

### What Makes It Special?

- **Multi-Vendor Architecture**: Support for unlimited vendors with isolated inventory and order management
- **Flexible Organization System**: Dynamic organization types (vendors, suppliers, service providers, etc.)
- **Advanced RBAC**: Role-based access control with fine-grained permissions at platform and organization levels
- **Vendor Financial Management**: Built-in balance tracking, payout scheduling, and transaction history
- **Real-time Capabilities**: WebSocket support for live notifications and updates
- **Production-Ready**: Comprehensive logging, error handling, caching, and monitoring

---

## ✨ Key Features

### 🔐 Authentication & Security

- **JWT Authentication**: Access and refresh token mechanism with configurable expiration
- **Google OAuth 2.0**: Social login integration
- **OTP Verification**: Email-based verification with rate limiting and cooldown
- **Password Management**: Secure reset flow with token-based validation
- **RBAC System**: Multi-level role and permission management
- **Bcrypt Hashing**: Industry-standard password encryption

### 🏢 Multi-Vendor & Organization Management

- **Dynamic Organization Types**: Configurable organization categories (vendors, suppliers, manufacturers, etc.)
- **Organization Lifecycle**: Approval workflow with pending, active, suspended, rejected states
- **Vendor Onboarding**: Document verification system with multiple document types
- **Custom Attributes**: Flexible attribute system for organization-specific data
- **Organization Settings**: Customizable policies, timezone, language preferences
- **Multi-User Organizations**: Team management with role assignments

### 💰 Vendor Financial System

- **Balance Management**: Real-time tracking of available and pending balances
- **Transaction Logging**: Complete audit trail of all financial movements
- **Automated Payouts**: Scheduled payout system with multiple payment methods
- **Fee Management**: Configurable platform fees per organization or globally
- **Revenue Split**: Automatic calculation of vendor earnings and platform fees
- **Payout History**: Detailed records of all completed and pending payouts

### 🛍️ Product Catalog & Inventory

- **Product Management**: Full CRUD with variants, options, and attributes
- **Multi-Vendor Products**: Each product belongs to a specific organization
- **Product Variants**: Support for size, color, and custom option combinations
- **Image Management**: Multiple images per product with AWS S3 integration
- **Category System**: Hierarchical categories with unlimited nesting
- **SEO Optimization**: Meta titles, descriptions, keywords, and custom slugs
- **Product Bundles**: Create product packages with discounted pricing
- **Full-Text Search**: PostgreSQL-powered search across products

### 📦 Inventory Management

- **Multi-Location Support**: Track inventory across multiple warehouses
- **Real-Time Stock Tracking**: Automatic updates on orders and returns
- **Reserved Inventory**: Hold stock during checkout process
- **Movement History**: Complete audit trail of all inventory changes
- **Low Stock Alerts**: Configurable thresholds for notifications
- **Bulk Operations**: Import/export and bulk update capabilities

### 🛒 Shopping Experience

- **Smart Cart System**: Session-based for guests, persistent for authenticated users
- **Cart Status Tracking**: Active, converted, abandoned, expired states
- **Abandoned Cart Recovery**: Automated detection and recovery workflows
- **Wishlist**: Save items for later with multi-item support
- **Recently Viewed**: Track user browsing history
- **Guest Checkout**: Complete purchase without registration

### 📋 Order Management

- **Complete Order Lifecycle**: Pending → Processing → Shipped → Delivered → Completed
- **Multi-Vendor Orders**: Single order with items from multiple vendors
- **Order Splitting**: Automatic fulfillment routing to respective vendors
- **Status History**: Track all status changes with timestamps
- **Order Notes**: Internal notes and customer communications
- **Bulk Operations**: Process multiple orders simultaneously

### 🚚 Shipping & Fulfillment

- **Multiple Shipping Methods**: Standard, Express, Overnight, Same-Day, Pickup
- **Carrier Integration**: Support for major shipping carriers
- **Real-Time Tracking**: Track shipments with carrier tracking numbers
- **Multi-Location Fulfillment**: Ship from nearest warehouse
- **Shipping Calculations**: Dynamic rate calculation based on weight and destination
- **Delivery Estimates**: Automatic calculation of delivery timeframes

### 💳 Payment Processing

- **Multiple Payment Gateways**: Extensible payment provider system
- **PesaPal Integration**: Built-in support for African payment gateway
- **Transaction Logging**: Complete audit trail of all payment events
- **Payment Status Tracking**: Pending, Authorized, Captured, Failed, Voided
- **Refund Management**: Full and partial refund support
- **Secure Processing**: PCI-compliant payment handling

### 🔄 Returns & Refunds

- **Return Request Workflow**: Customer-initiated returns with approval process
- **Condition Tracking**: New, Opened, Damaged condition states
- **Automated Refunds**: Trigger refunds upon return approval
- **Return Reasons**: Categorized return reasons for analytics
- **Restocking**: Automatic inventory adjustment on returns
- **Vendor-Specific Returns**: Route returns to original vendor

### 🎟️ Coupons & Promotions

- **Flexible Discount Types**: Percentage, Fixed Amount, Free Shipping
- **Targeting Options**: Product-specific, category-specific, or global
- **Usage Limits**: Maximum uses per coupon and per user
- **Date Restrictions**: Start and end date validation
- **User-Specific Coupons**: Assign coupons to specific customers
- **Redemption Tracking**: Complete history of coupon usage
- **Vendor Coupons**: Organization-specific promotional codes

### ⭐ Reviews & Ratings

- **5-Star Rating System**: Standard rating scale with half-star support
- **Review Images**: Upload up to 5 images per review (AWS S3)
- **Verified Purchase Badge**: Highlight reviews from actual buyers
- **Admin Moderation**: Approve, reject, or flag inappropriate reviews
- **Review Statistics**: Average ratings, distribution charts
- **Helpful Votes**: Community-driven review ranking

### 🔔 Notification System

- **Multi-Channel Delivery**: Email, SMS, Push, WebSocket, In-App
- **Template Engine**: Handlebars-based customizable templates
- **User Preferences**: Granular control over notification channels
- **Status Tracking**: Pending, Sent, Failed, Read, Archived
- **Event-Driven**: Automatic notifications on key events
- **Scheduled Cleanup**: Automatic archival of old notifications
- **Real-Time Updates**: WebSocket integration for instant delivery

### 📊 Reports & Analytics

- **Sales Reports**: Revenue, orders, and performance metrics
- **Vendor Analytics**: Individual vendor performance tracking
- **Product Performance**: Best sellers, slow movers, stock analysis
- **Cart Analytics**: Conversion rates, abandonment analysis
- **Customer Insights**: Purchase patterns, lifetime value
- **Financial Reports**: Revenue breakdown, fee collection, payouts

### 📝 Content Management

- **Blog System**: Full-featured blog with rich text editor (Jodit)
- **Homepage CMS**: Manage hero banners, features, story sections
- **Dynamic Sections**: Configurable homepage layout
- **SEO-Friendly**: Meta tags and structured data support
- **Draft/Publish Workflow**: Content staging before going live

### 🛠️ Technical Features

- **RESTful API Design**: Clean, predictable endpoint structure
- **API Versioning**: URI-based versioning (v1, v2)
- **Modular Architecture**: Platform, Admin, Vendor, Public modules
- **HATEOAS Links**: Hypermedia-driven API responses
- **Request Tracing**: Unique request IDs for debugging
- **Response Standardization**: Consistent response format across all endpoints
- **Pagination**: Cursor and offset-based pagination
- **Filtering & Sorting**: Advanced query capabilities
- **Redis Caching**: High-performance caching layer
- **BullMQ Integration**: Background job processing
- **Rate Limiting**: Protect against abuse and DDoS
- **CORS Configuration**: Secure cross-origin requests
- **Compression**: Gzip response compression
- **Health Checks**: Endpoint monitoring and status
- **Graceful Shutdown**: Clean process termination

### 📚 Documentation & Developer Experience

- **Swagger/OpenAPI**: Interactive API documentation
- **Compodoc**: Automated code documentation
- **TypeScript**: Full type safety and IntelliSense
- **ESLint & Prettier**: Code quality and formatting
- **Git Hooks**: Pre-commit validation
- **Docker Support**: Containerized development and deployment
- **Environment Validation**: Joi-based config validation

### ⏰ Scheduled Tasks

- **OTP Cleanup**: Daily cleanup of expired OTP codes (2:00 AM)
- **Notification Archival**: Archive old notifications (3:00 AM)
- **Cart Expiration**: Mark inactive carts as expired
- **Payout Processing**: Automated vendor payout execution
- **Report Generation**: Scheduled analytics and reports

---

## 🛠️ Tech Stack

### Core Framework
- **[NestJS](https://nestjs.com/)** - Progressive Node.js framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Node.js](https://nodejs.org/)** - JavaScript runtime (v16+)

### Database & ORM
- **[PostgreSQL](https://www.postgresql.org/)** - Relational database (v12+)
- **[Prisma](https://www.prisma.io/)** - Next-generation ORM
- **Full-Text Search** - PostgreSQL native search

### Authentication & Security
- **[@nestjs/jwt](https://www.npmjs.com/package/@nestjs/jwt)** - JWT implementation
- **[Google OAuth Library](https://www.npmjs.com/package/google-auth-library)** - OAuth 2.0
- **[Bcrypt](https://www.npmjs.com/package/bcrypt)** - Password hashing

### Storage & File Management
- **[AWS SDK S3](https://www.npmjs.com/package/@aws-sdk/client-s3)** - Cloud storage
- **[Multer](https://www.npmjs.com/package/multer)** - File upload handling

### Caching & Queue
- **[Redis](https://redis.io/)** - In-memory data store
- **[BullMQ](https://docs.bullmq.io/)** - Background job processing
- **[@nestjs/cache-manager](https://www.npmjs.com/package/@nestjs/cache-manager)** - Caching abstraction

### Real-Time Communication
- **[Socket.IO](https://socket.io/)** - WebSocket library
- **[@nestjs/websockets](https://www.npmjs.com/package/@nestjs/websockets)** - WebSocket module

### Email & Notifications
- **[Nodemailer](https://nodemailer.com/)** - Email sending
- **[Handlebars](https://handlebarsjs.com/)** - Template engine

### Validation & Transformation
- **[class-validator](https://www.npmjs.com/package/class-validator)** - Decorator-based validation
- **[class-transformer](https://www.npmjs.com/package/class-transformer)** - Object transformation
- **[Joi](https://joi.dev/)** - Schema validation

### Logging & Monitoring
- **[Winston](https://www.npmjs.com/package/winston)** - Logging library
- **[nest-winston](https://www.npmjs.com/package/nest-winston)** - NestJS Winston integration

### Documentation
- **[@nestjs/swagger](https://www.npmjs.com/package/@nestjs/swagger)** - OpenAPI/Swagger
- **[Compodoc](https://compodoc.app/)** - Code documentation generator

### Payment Integration
- **[PesaPal SDK](https://www.npmjs.com/package/pesapal3-sdk)** - Payment gateway

### Development Tools
- **[ESLint](https://eslint.org/)** - Code linting
- **[Prettier](https://prettier.io/)** - Code formatting
- **[Jest](https://jestjs.io/)** - Testing framework
- **[Docker](https://www.docker.com/)** - Containerization

---

## 🏗️ Architecture

### Module Structure

```
src/
├── modules/
│   ├── platform.module.ts    # Platform-wide features
│   ├── admin.module.ts        # Admin-specific features
│   ├── vendor.module.ts       # Vendor-specific features
│   ├── public.module.ts       # Public-facing features
│   └── core.module.ts         # Core shared features
├── auth/                      # Authentication & authorization
├── user/                      # User management
├── organization/              # Multi-vendor organization system
├── vendors/                   # Vendor-specific operations
├── rbac/                      # Role-based access control
├── attributes/                # Dynamic attribute system
├── catalog/                   # Product catalog
├── bundles/                   # Product bundles
├── inventory/                 # Inventory management
├── cart/                      # Shopping cart
├── orders/                    # Order processing
├── shipping/                  # Shipping & fulfillment
├── payments/                  # Payment processing
├── reviews/                   # Product reviews
├── coupons/                   # Discount coupons
├── notifications/             # Notification system
├── reports/                   # Analytics & reporting
├── blog/                      # Blog/CMS
├── cms/                       # Content management
├── shared/                    # Shared utilities
├── config/                    # Configuration
├── logger/                    # Logging setup
└── tasks/                     # Scheduled tasks
```

### Database Architecture

The system uses a comprehensive PostgreSQL schema with 60+ tables organized into logical domains:

- **Authentication**: User, Role, Permission, OTP, PasswordResetToken
- **Organizations**: Organization, OrganizationType, OrganizationUser, OrganizationSettings
- **Attributes**: AttributeDefinition, OrganizationAttribute, AttributeOption
- **Catalog**: Product, Variant, ProductOption, Category, ProductImage
- **Inventory**: Location, VariantInventory, InventoryMovement
- **Shopping**: Cart, CartItem, Wishlist, RecentlyViewed
- **Orders**: Order, OrderItem, OrderAddress, OrderStatusHistory
- **Fulfillment**: Shipment, FulfillmentItem, ShippingMethod
- **Payments**: Payment, TransactionLog, Refund, RefundItem
- **Financials**: VendorBalance, VendorBalanceTransaction, VendorPayout
- **Reviews**: Review, ReviewImage
- **Coupons**: Coupon, CouponRedemption, CouponProduct
- **Notifications**: Notification, NotificationTemplate, NotificationPreference
- **Content**: BlogPost, HomepageSection

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v16.x or higher ([Download](https://nodejs.org/))
- **PostgreSQL** v12.x or higher ([Download](https://www.postgresql.org/download/))
- **Redis** v6.x or higher ([Download](https://redis.io/download))
- **npm** or **yarn** package manager
- **AWS S3** bucket or S3-compatible storage
- **SMTP** server for email notifications
- **Docker** (optional, for containerized deployment)

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/waywise-multivendor-backend.git
cd waywise-multivendor-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see [Configuration](#-configuration) section).

### 4. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed the database with initial data
npm run prisma:seed
```

### 5. Start Redis (if not running)

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or using local installation
redis-server
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

#### Application Configuration
```env
NODE_ENV=development
PORT=4000
API_VERSION=1.0.0
PRODUCTION_URL=https://your-domain.com
```

#### Database Configuration
```env
DATABASE_URL="postgresql://username:password@localhost:5432/waywise_multivendor"
```

#### JWT Configuration
```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_TOKEN_AUDIENCE=localhost:4000
JWT_TOKEN_ISSUER=localhost:4000
JWT_ACCESS_TOKEN_TTL=3600
JWT_REFRESH_TOKEN_TTL=86400
```

#### Google OAuth Configuration
```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### Email Configuration
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=noreply@example.com
CONTACT_EMAIL=contact@example.com
```

#### OTP Configuration
```env
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6
OTP_MAX_ATTEMPTS=3
OTP_RESEND_COOLDOWN_SECONDS=60
```

#### AWS S3 Configuration
```env
AWS_ENDPOINT=https://s3.amazonaws.com
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
```

#### File Upload Configuration
```env
MAX_FILE_SIZE=5242880
ALLOWED_IMAGE_TYPES=jpg,jpeg,png,webp
MAX_IMAGES_PER_REVIEW=5
```

#### Logging Configuration
```env
LOG_LEVEL=debug
```

#### Cache Configuration
```env
CACHE_TTL=60000
CACHE_MAX_ITEMS=100
```

---

## 🏃 Running the Application

### Development Mode

```bash
npm run start:dev
```

The API will be available at `http://localhost:4000`

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

### Debug Mode

```bash
npm run start:debug
```

### Using Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Access Points

- **API Base URL**: `http://localhost:4000`
- **Swagger Documentation**: `http://localhost:4000/api/docs`
- **Health Check**: `http://localhost:4000/health`

---

## 📡 API Documentation

### Interactive Documentation

Visit `http://localhost:4000/api/docs` for interactive Swagger/OpenAPI documentation.

### API Modules

The API is organized into the following modules:

#### 🔐 Authentication (`/v1/auth`)
- User registration with email verification
- Login with email/password or Google OAuth
- Token refresh and logout
- Password reset flow
- OTP management

#### 👤 User Management (`/v1/user`)
- Profile management
- Address book
- User preferences
- Account settings

#### 🏢 Organization Management (`/v1/organization`, `/admin/organization`)
- Organization CRUD operations
- Document management
- Settings configuration
- User assignments
- Approval workflows

#### 🎭 RBAC (`/v1/rbac`, `/admin/rbac`)
- Role management
- Permission assignment
- User role assignment
- Permission checking

#### 🏷️ Attributes (`/v1/attributes`)
- Dynamic attribute definitions
- Organization-specific attributes
- Attribute validation

#### 📦 Catalog (`/v1/catalog`)
- Product management
- Category management
- Product search
- Variant management

#### 🎁 Bundles (`/v1/bundles`)
- Bundle creation
- Bundle management
- Pricing configuration

#### 📊 Inventory (`/v1/inventory`)
- Stock management
- Multi-location inventory
- Movement tracking
- Stock adjustments

#### 🛒 Cart (`/v1/cart`, `/admin/carts`)
- Add/remove items
- Update quantities
- Cart status management
- Abandoned cart recovery

#### 📋 Orders (`/v1/orders`, `/admin/orders`)
- Order creation
- Order management
- Status updates
- Order history

#### 🚚 Shipping (`/v1/shipping`)
- Shipping methods
- Rate calculation
- Tracking
- Fulfillment

#### 💳 Payments (`/v1/payments`)
- Payment processing
- Transaction logging
- Refund management

#### ⭐ Reviews (`/v1/reviews`)
- Review submission
- Image uploads
- Moderation
- Statistics

#### 🎟️ Coupons (`/v1/coupons`)
- Coupon management
- Validation
- Redemption tracking

#### 🔔 Notifications (`/v1/notifications`)
- Notification management
- Preferences
- Mark as read
- Notification history

#### 📊 Reports (`/v1/reports`)
- Sales reports
- Analytics
- Performance metrics

#### 📝 Blog (`/v1/blog`)
- Blog post management
- Publishing workflow

#### 🎨 CMS (`/v1/cms`)
- Homepage management
- Content sections

#### 💰 Vendor Financials (`/vendor/balance`, `/vendor/payouts`)
- Balance tracking
- Transaction history
- Payout requests
- Payout history

### Response Format

All API responses follow a standardized format:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": { },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "uuid-here"
  },
  "links": {
    "self": "/v1/resource",
    "next": "/v1/resource?page=2"
  }
}
```

---

## 🗄️ Database Schema

### Key Models

#### User & Authentication
- User, Role, Permission, UserRole, RolePermission
- Otp, PasswordResetToken

#### Organization System
- Organization, OrganizationType, OrganizationUser
- OrganizationSettings, OrganizationDocument
- AttributeDefinition, OrganizationAttribute

#### Vendor Financials
- VendorBalance, VendorBalanceTransaction
- VendorPayout, VendorPayoutItem

#### Product Catalog
- Product, ProductImage, ProductCategory
- Variant, VariantImage, VariantOptionValue
- ProductOption, OptionValue, Category

#### Inventory
- Location, VariantInventory, InventoryMovement

#### Shopping
- Cart, CartItem, Wishlist, WishlistItem
- RecentlyViewed

#### Orders & Fulfillment
- Order, OrderItem, OrderAddress, OrderStatusHistory
- Shipment, FulfillmentItem, ShippingMethod

#### Payments
- Payment, TransactionLog, Refund, RefundItem
- ReturnRequest, ReturnItem

#### Marketing
- Coupon, CouponRedemption, CouponProduct
- Review, ReviewImage

#### Notifications
- Notification, NotificationTemplate, NotificationPreference

#### Content
- BlogPost, HomepageSection

### Database Diagram

View the complete schema in `prisma/schema.prisma`

---

## 🔒 Security

### Implemented Security Measures

- **Password Hashing**: Bcrypt with salt rounds
- **JWT Tokens**: Secure token generation with expiration
- **OTP Rate Limiting**: Prevent brute force attacks
- **Input Validation**: class-validator on all DTOs
- **SQL Injection Protection**: Prisma ORM parameterized queries
- **XSS Protection**: Input sanitization
- **CORS**: Configurable cross-origin policies
- **Helmet**: Security headers
- **Rate Limiting**: Request throttling (recommended for production)
- **Environment Variables**: Sensitive data in .env
- **Role-Based Access**: Fine-grained permission system

### Security Best Practices

1. **Change Default Secrets**: Update JWT_SECRET in production
2. **Use HTTPS**: Always use SSL/TLS in production
3. **Enable Rate Limiting**: Protect against DDoS
4. **Regular Updates**: Keep dependencies up to date
5. **Database Backups**: Regular automated backups
6. **Monitoring**: Implement logging and alerting
7. **Audit Logs**: Track sensitive operations

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Test Structure

```
test/
├── unit/
│   ├── auth/
│   ├── catalog/
│   └── orders/
└── e2e/
    ├── auth.e2e-spec.ts
    ├── catalog.e2e-spec.ts
    └── orders.e2e-spec.ts
```

---

## 🚀 Deployment

### Docker Deployment

```bash
# Build image
docker build -t waywise-backend .

# Run container
docker run -p 4000:4000 --env-file .env waywise-backend
```

### Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Set environment variables

3. Run migrations:
```bash
npm run prisma:migrate:prod
```

4. Start the application:
```bash
npm run start:prod
```

### Environment-Specific Considerations

#### Production Checklist
- [ ] Set NODE_ENV=production
- [ ] Use strong JWT_SECRET
- [ ] Configure production database
- [ ] Set up Redis for caching
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Enable rate limiting
- [ ] Set up CDN for static assets

---

## 📊 Performance Optimization

- **Redis Caching**: Frequently accessed data
- **Database Indexing**: Optimized queries
- **Connection Pooling**: Efficient database connections
- **Lazy Loading**: Load data on demand
- **Pagination**: Limit result sets
- **Compression**: Gzip response compression
- **CDN Integration**: Static asset delivery

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards

- Follow TypeScript best practices
- Use ESLint and Prettier configurations
- Write unit tests for new features
- Update documentation as needed
- Follow conventional commit messages

---

## 📝 Scripts Reference

```bash
# Development
npm run start:dev          # Start with hot-reload
npm run start:debug        # Start in debug mode

# Production
npm run build              # Build for production
npm run start:prod         # Start production server

# Database
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # Open Prisma Studio
npm run prisma:seed        # Seed database
npm run db:reset           # Reset and seed database

# Code Quality
npm run lint               # Run ESLint
npm run format             # Format with Prettier

# Testing
npm run test               # Run unit tests
npm run test:e2e           # Run E2E tests
npm run test:cov           # Generate coverage report
```

---

## 📄 License

This project is licensed under the **UNLICENSED** License - it is proprietary software.

---

## 👥 Support & Contact

For questions, issues, or support:

- **Email**: contact@waywise.com
- **Documentation**: [API Docs](http://localhost:4000/api/docs)
- **Issues**: [GitHub Issues](https://github.com/yourusername/waywise-multivendor-backend/issues)

---

## 🙏 Acknowledgments

Built with:
- [NestJS](https://nestjs.com/) - The progressive Node.js framework
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [PostgreSQL](https://www.postgresql.org/) - The world's most advanced open source database

---

<div align="center">

**Built with ❤️ by the WayWise Team**

⭐ Star us on GitHub if you find this project useful!

</div>
