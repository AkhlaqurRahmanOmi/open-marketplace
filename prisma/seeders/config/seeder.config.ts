/**
 * Seeder Configuration
 * Control which seeders run and their behavior
 */
export const seederConfig = {
  // Foundation
  rbac: {
    enabled: true,
    clearExisting: true,
  },
  users: {
    enabled: true,
    clearExisting: true,
    createSuperAdmin: true,
  },
  organizationTypes: {
    enabled: true,
    clearExisting: true,
  },
  organizations: {
    enabled: true,
    clearExisting: true,
  },
  attributes: {
    enabled: true,
    clearExisting: true,
  },
  // Catalog
  categories: {
    enabled: true,
    clearExisting: true,
  },
  products: {
    enabled: true,
    clearExisting: true,
    createVariants: true,
    createImages: true,
    createInventory: true,
  },
  // Skip unimplemented modules
  orders: {
    enabled: false,
  },
  payments: {
    enabled: false,
  },
  coupons: {
    enabled: false,
  },
  reviews: {
    enabled: false,
  },
};

/**
 * Super Admin Credentials
 */
export const SUPER_ADMIN_CREDENTIALS = {
  email: 'superadmin@waywise.com',
  password: 'SuperAdmin@123',
  firstName: 'Super',
  lastName: 'Admin',
};

/**
 * Test User Credentials
 */
export const TEST_USERS = [
  {
    email: 'vendor1@waywise.com',
    password: 'Vendor@123',
    firstName: 'John',
    lastName: 'Vendor',
    userType: 'provider',
  },
  {
    email: 'vendor2@waywise.com',
    password: 'Vendor@123',
    firstName: 'Jane',
    lastName: 'Shop',
    userType: 'provider',
  },
  {
    email: 'customer@waywise.com',
    password: 'Customer@123',
    firstName: 'Alex',
    lastName: 'Customer',
    userType: 'customer',
  },
  {
    email: 'delivery@waywise.com',
    password: 'Delivery@123',
    firstName: 'Mike',
    lastName: 'Delivery',
    userType: 'provider',
  },
];
