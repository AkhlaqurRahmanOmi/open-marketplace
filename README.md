# E-Commerce REST API

A production-ready, enterprise-grade E-Commerce REST API built with NestJS, Prisma, and PostgreSQL. Features comprehensive e-commerce functionality, advanced authentication, role-based access control, and REST API best practices.

## 🚀 Features

### Authentication & Security
- JWT-based authentication with access/refresh tokens
- Google OAuth 2.0 integration
- OTP-based email verification with rate limiting and automated cleanup
- Password reset with secure token-based flow
- Role-Based Access Control (RBAC) with user roles and permissions
- Fine-grained permission system for granular access control
- Bcrypt password hashing

### E-Commerce Capabilities
- **Product Catalog**: Products with variants, options, images, categories, SEO optimization, full-text search, and product bundles
- **Inventory Management**: Multi-location inventory tracking, stock management, reserved inventory, and movement history
- **Shopping Experience**: Guest and authenticated user carts with session-based management, cart status tracking (active, converted, abandoned, expired), abandoned cart recovery, cart expiration management, wishlist functionality, recently viewed products
- **Order Management**: Complete order lifecycle (pending → processing → shipped → delivered) with status tracking and history
- **Shipping & Fulfillment**: Multiple shipping methods (standard, express, overnight, same-day, pickup), carrier tracking, multi-location fulfillment
- **Payment Processing**: Multiple payment gateways, transaction logging, audit trail, refund management
- **Returns Management**: Return request workflow with approval/rejection process and condition tracking
- **Coupons & Discounts**: Flexible coupon system (percentage, fixed amount, free shipping) with usage limits, date restrictions, product/category targeting, user-specific coupons, and redemption tracking
- **Reviews & Ratings**: Product reviews with 1-5 star ratings, image uploads (AWS S3), verified purchase badges, admin moderation, and statistics
- **Notifications**: Multi-channel notifications (email, WebSocket, in-app, SMS, push) with Handlebars templates, user preferences, status tracking (pending, sent, failed, read, archived), and automated cleanup
- **Reports & Analytics**: Sales reports, order statistics, product performance metrics, cart analytics (conversion rates, abandonment rates, average cart value), and abandoned cart details

### Technical Features
- RESTful API design with URI-based versioning (v1, v2)
- Standardized response format with HATEOAS links
- Request tracing with unique IDs for debugging
- In-memory caching with configurable TTL and max items
- Pagination, filtering, and sorting support
- AWS S3 integration for file storage (product images, review images)
- Winston logger with structured logging, log rotation, and configurable log levels
- Comprehensive Swagger/OpenAPI documentation with detailed schemas
- Global error handling with class-validator validation
- Scheduled tasks for automated cleanup (OTP cleanup daily at 2 AM, notification archival daily at 3 AM)
- Event-driven architecture with @nestjs/event-emitter
- Full-text search support for products (PostgreSQL)
- Compodoc integration for code documentation

## 🛠️ Tech Stack

- **Framework**: NestJS (Node.js framework)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + Google OAuth 2.0 + OTP
- **Storage**: AWS S3 (or S3-compatible services like Synology C2)
- **Email**: Nodemailer with SMTP
- **Real-time**: Socket.IO for WebSocket connections
- **Validation**: class-validator, class-transformer
- **Logging**: Winston with nest-winston
- **Caching**: @nestjs/cache-manager (in-memory)
- **Documentation**: Swagger/OpenAPI
- **Language**: TypeScript

## 📋 Prerequisites

- Node.js v16 or higher
- PostgreSQL 12 or higher
- npm or yarn package manager
- AWS S3 bucket (or S3-compatible storage)
- SMTP server for email notifications

## 🔧 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd e-commerce
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory (see `.env.example` for reference):

```env
# Application
NODE_ENV=development
PORT=4000
API_VERSION=1.0.0

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ecommerce"

# JWT Configuration
JWT_SECRET=your-jwt-secret-here
JWT_TOKEN_AUDIENCE=localhost:4000
JWT_TOKEN_ISSUER=localhost:4000
JWT_ACCESS_TOKEN_TTL=3600
JWT_REFRESH_TOKEN_TTL=86400

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email Configuration
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
EMAIL_FROM=noreply@example.com
CONTACT_EMAIL=contact@example.com

# OTP Configuration
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6
OTP_MAX_ATTEMPTS=3
OTP_RESEND_COOLDOWN_SECONDS=60

# AWS S3 Configuration
AWS_ENDPOINT=https://s3.amazonaws.com
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name

# File Upload Configuration
MAX_FILE_SIZE=5242880
ALLOWED_IMAGE_TYPES=jpg,jpeg,png,webp
MAX_IMAGES_PER_REVIEW=5

# Logging
LOG_LEVEL=debug

# Cache
CACHE_TTL=60000
CACHE_MAX_ITEMS=100
```

### 4. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# (Optional) Seed the database with sample data
npx prisma db seed
```

## 🚀 Running the Application

```bash
# Development mode with hot-reload
npm run start:dev

# Production mode
npm run start:prod

# Debug mode
npm run start:debug
```

**Access Points:**
- API Base URL: `http://localhost:4000`
- Swagger Documentation: `http://localhost:4000/api/docs`

## 📡 API Endpoints

### Authentication
- `POST /v1/auth/register` - Register new user
- `POST /v1/auth/verify-otp` - Verify email with OTP
- `POST /v1/auth/resend-otp` - Resend OTP code
- `POST /v1/auth/sign-in` - Login with email/password
- `POST /v1/auth/refresh-tokens` - Refresh access token
- `POST /v1/auth/logout` - Logout user
- `POST /v1/auth/forgot-password` - Request password reset
- `POST /v1/auth/reset-password` - Reset password with token
- `GET /v1/auth/google` - Google OAuth login
- `GET /v1/auth/google/callback` - Google OAuth callback

### Users
- `GET /v1/user/profile` - Get current user profile
- `PATCH /v1/user/profile` - Update user profile
- `GET /v1/user/all` - Get all users (admin only)
- `GET /v1/user/addresses` - Get user addresses
- `POST /v1/user/addresses` - Add new address
- `PATCH /v1/user/addresses/:id` - Update address
- `DELETE /v1/user/addresses/:id` - Delete address

### Catalog
- `GET /v1/catalog/products` - List products with filters
- `GET /v1/catalog/products/:id` - Get product details
- `POST /v1/catalog/products` - Create product (admin)
- `PATCH /v1/catalog/products/:id` - Update product (admin)
- `DELETE /v1/catalog/products/:id` - Delete product (admin)
- `GET /v1/catalog/categories` - List all categories
- `GET /v1/catalog/search` - Search products

### Bundles
- `GET /v1/bundles` - List all bundles
- `GET /v1/bundles/:id` - Get bundle details
- `POST /v1/bundles` - Create bundle (admin)
- `PATCH /v1/bundles/:id` - Update bundle (admin)
- `DELETE /v1/bundles/:id` - Delete bundle (admin)

### Inventory
- `GET /v1/inventory/variants/:id` - Get variant inventory
- `POST /v1/inventory/adjust` - Adjust inventory (admin)
- `GET /v1/inventory/movements` - Get inventory movements (admin)

### Orders
- `POST /v1/orders` - Create new order
- `GET /v1/orders` - Get user orders
- `GET /v1/orders/:id` - Get order details
- `PATCH /v1/orders/:id/status` - Update order status (admin)
- `GET /v1/orders/:id/history` - Get order status history

### Shipping
- `GET /v1/shipping/methods` - List shipping methods
- `POST /v1/shipping/calculate` - Calculate shipping cost
- `GET /v1/shipping/track/:trackingNumber` - Track shipment

### Payments
- `POST /v1/payments/process` - Process payment
- `GET /v1/payments/:id` - Get payment details
- `POST /v1/payments/:id/refund` - Refund payment (admin)

### Reviews
- `GET /v1/reviews` - List all reviews
- `GET /v1/reviews/:id` - Get review details
- `GET /v1/reviews/products/:productId` - Get product reviews
- `GET /v1/reviews/products/:productId/statistics` - Get review statistics
- `POST /v1/reviews` - Create review
- `PATCH /v1/reviews/:id` - Update review
- `DELETE /v1/reviews/:id` - Delete review
- `POST /v1/reviews/:id/images` - Upload review images
- `DELETE /v1/reviews/:reviewId/images/:imageId` - Delete review image
- `PATCH /v1/reviews/:id/status` - Update review status (admin)

### Coupons
- `GET /v1/coupons` - List all coupons
- `GET /v1/coupons/:code` - Get coupon by code
- `POST /v1/coupons/validate` - Validate coupon
- `POST /v1/coupons` - Create coupon (admin)
- `PATCH /v1/coupons/:id` - Update coupon (admin)
- `DELETE /v1/coupons/:id` - Delete coupon (admin)

### Notifications
- `GET /v1/notifications` - List all notifications
- `GET /v1/notifications/user/:userId` - Get user notifications
- `GET /v1/notifications/user/:userId/unread` - Get unread notifications
- `GET /v1/notifications/user/:userId/unread/count` - Get unread count
- `PUT /v1/notifications/mark-as-read` - Mark notifications as read
- `PUT /v1/notifications/user/:userId/mark-all-read` - Mark all as read
- `DELETE /v1/notifications/:id` - Delete notification
- `GET /v1/notifications/preferences/user/:userId` - Get user preferences
- `PUT /v1/notifications/preferences` - Update notification preferences

### Cart (Admin)
- `GET /admin/carts` - Get all carts with filters
- `GET /admin/carts/abandoned` - Get abandoned carts
- `GET /admin/carts/count` - Get cart count
- `POST /admin/carts/mark-abandoned` - Mark carts as abandoned
- `POST /admin/carts/mark-expired` - Mark carts as expired
- `DELETE /admin/carts/cleanup-expired` - Delete expired carts
- `GET /admin/carts/reports/statistics` - Cart statistics
- `GET /admin/carts/reports/abandoned-details` - Abandoned cart details
- `GET /admin/carts/reports/average-value` - Average cart value
- `GET /admin/carts/reports/overview` - Comprehensive cart report

### Reports
- `GET /v1/reports/sales` - Get sales reports (admin)
- `GET /v1/reports/orders` - Get order reports (admin)
- `GET /v1/reports/products` - Get product reports (admin)

> **Note:** For complete API documentation with request/response examples, visit `/api/docs` when the application is running.

## 📊 Database Schema

The application uses Prisma ORM with PostgreSQL. The database schema includes:

**Authentication & Users:**
User, Role, Permission, UserRole, RolePermission, Otp, PasswordResetToken, UserAddress

**Catalog:**
Product, ProductImage, Variant, VariantImage, ProductOption, OptionValue, VariantOptionValue, Category, ProductCategory, ProductAttribute

**Bundles:**
Bundle, BundleItem

**Inventory:**
Location, VariantInventory, InventoryMovement

**Shopping:**
Cart (with status: active, converted, abandoned, expired), CartItem, Wishlist, WishlistItem, RecentlyViewed

**Orders:**
Order, OrderItem, OrderAddress, OrderStatusHistory

**Shipping:**
ShippingMethod, Shipment, FulfillmentItem

**Payments:**
Payment, TransactionLog, Refund, RefundItem

**Returns:**
ReturnRequest, ReturnItem

**Coupons:**
Coupon, CouponProduct, CouponCategory, CouponUser, CouponRedemption

**Reviews:**
Review, ReviewImage

**Notifications:**
Notification, NotificationTemplate, NotificationPreference

View the complete schema in `prisma/schema.prisma`.

## 🔐 Security

- Passwords are hashed using bcrypt
- JWT tokens with configurable expiration
- OTP verification with rate limiting and cooldown
- Role-based access control (RBAC)
- Permission-based authorization
- Input validation on all endpoints
- SQL injection protection via Prisma ORM
- CORS configuration
- Request rate limiting (required for production)

## 🌍 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Application port | `4000` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | Secret key for JWT signing | - |
| `JWT_ACCESS_TOKEN_TTL` | Access token expiry (seconds) | `3600` |
| `JWT_REFRESH_TOKEN_TTL` | Refresh token expiry (seconds) | `86400` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | - |
| `SMTP_HOST` | SMTP server host | - |
| `SMTP_PORT` | SMTP server port | `2525` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASS` | SMTP password | - |
| `OTP_EXPIRY_MINUTES` | OTP expiration time | `10` |
| `OTP_LENGTH` | OTP code length | `6` |
| `OTP_MAX_ATTEMPTS` | Maximum OTP attempts | `3` |
| `AWS_ACCESS_KEY_ID` | AWS access key | - |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | - |
| `AWS_REGION` | AWS region | `us-east-1` |
| `S3_BUCKET_NAME` | S3 bucket name | - |
| `MAX_FILE_SIZE` | Max file upload size (bytes) | `5242880` |
| `MAX_IMAGES_PER_REVIEW` | Max images per review | `5` |
| `LOG_LEVEL` | Logging level | `debug` |

## 📚 Documentation

- **API Documentation**: Available at `/api/docs` (Swagger UI)
- **Database Schema**: See `prisma/schema.prisma`
- **Environment Setup**: See `.env.example`

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Support

For questions, issues, or support:
- Open an issue on GitHub
- Check the API documentation at `/api/docs`
- Review the Prisma schema documentation

## 🔗 Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Swagger/OpenAPI Specification](https://swagger.io/specification/)
- [Socket.IO Documentation](https://socket.io/docs/)

---

**Built with ❤️ using NestJS, Prisma, and PostgreSQL**
