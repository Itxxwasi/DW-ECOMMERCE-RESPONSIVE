<!-- ee709cc9-9e18-4002-8198-9d782a069043 5df14a18-ab67-454e-aa71-ccdf82f6743e -->
# Optional Customer Account System Implementation

## Overview

Add optional customer account functionality that allows guests to shop without accounts, while providing optional registration for cart persistence and order history. Admin panel remains completely separate. **Admin users cannot sign up - they are auto-created on server startup.**

## Current State Analysis

- User model exists with `role` field (user/admin)
- Auth routes exist (`/api/auth/register`, `/api/auth/login`)
- Guest cart already works via localStorage
- Cart merging works on login/register
- Login page currently redirects ALL users to `/admin` (needs fix)
- Register page already redirects to home
- Admin routes protected by `adminAuth` middleware
- **Admin auto-creation already exists in `server.js`** (admin@dwatson.pk / admin123)

## Implementation Tasks

### 1. Fix Login Page for Customer/Admin Separation

**File**: `frontend/login.html`

- Change title from "Admin Login" to "Login" or "Customer Login"
- Update header text to be customer-focused
- Remove any signup/register links (admin cannot sign up)

**File**: `frontend/js/login.js`

- After successful login, check user role from token
- If role is 'admin', redirect to `/admin`
- If role is 'user' or undefined, redirect to `/` (home page)
- Keep guest cart merging functionality

### 2. Update Register Page (Customer Only)

**File**: `frontend/register.html`

- Ensure it's customer-focused (already redirects to home correctly)
- Add note: "Create your customer account" (not for admin)
- Verify styling matches customer experience

**File**: `frontend/js/register.js`

- Already redirects to home - verify it works correctly
- Ensure guest cart merging works
- Registration will always create customer account (role='user')

### 3. Prevent Admin Signup in Backend

**File**: `backend/routes/auth.js`

- Update `/api/auth/register` endpoint to **enforce `role: 'user'` only**
- Prevent any registration with `role: 'admin'` (force role to 'user' regardless of input)
- Admin users are auto-created on server startup, not through registration
- Add validation to reject any attempt to register with admin role

### 4. Verify Admin Auto-Creation

**File**: `backend/server.js`

- Verify admin auto-creation on startup works correctly
- Admin email: `admin@dwatson.pk` (from ADMIN_EMAIL env var or default)
- Admin password: `admin123` (from ADMIN_PASSWORD env var or default)
- Ensure this only creates admin if it doesn't exist
- No changes needed if already working

### 5. Add Login/Register Links to Navigation Bar

**File**: `frontend/index.html` (or main layout file)

- Add login/register buttons in navbar when user is not logged in
- Show "My Account" and "Logout" when user is logged in
- Position: Typically in top-right of navbar

**File**: `frontend/js/main.js` (or create new `frontend/js/auth-ui.js`)

- Add function to check authentication status
- Update navbar UI based on auth status
- Handle logout functionality (clear token, redirect to home)

### 6. Add Login/Register Prompts to Cart Page

**File**: `frontend/cart.html` (or wherever cart is displayed)

- Add banner/message for guest users: "Create an account to save your cart and view order history"
- Add "Login" and "Register" buttons for guest users
- Hide prompts when user is logged in

**File**: `frontend/js/cart.js`

- Check if user is logged in
- Show/hide login prompts accordingly
- Link buttons to `/login.html` and `/register.html`

### 7. Create User Account/Profile Page

**File**: `frontend/account.html` (new file)

- Display user profile information (name, email, phone)
- Show order history (list of past orders)
- Allow basic profile editing (name, phone, address)
- Add logout button

**File**: `frontend/js/account.js` (new file)

- Fetch user profile from `/api/auth/me`
- Fetch order history from `/api/orders` (user's orders)
- Handle profile updates
- Handle logout

**File**: `backend/routes/orders.js`

- Ensure `/api/orders` endpoint filters orders by user ID for regular users
- Add user-specific order endpoint if needed

### 8. Ensure Admin Panel Separation

**File**: `backend/middleware/adminAuth.js`

- Verify it properly checks for `role === 'admin'`
- Ensure all admin routes use `adminAuth` middleware

**File**: `backend/routes/admin.js`

- Verify all routes use `adminAuth` middleware
- No changes needed if already protected

### 9. Add Logout Functionality

**File**: `frontend/js/main.js` or new `frontend/js/auth-ui.js`

- Create `logout()` function
- Clear `localStorage.removeItem('token')`
- Redirect to home page
- Update cart count (clear if needed)

### 10. Update Cart Count Display

**File**: `frontend/js/main.js`

- Ensure cart count works for both guest and authenticated users
- Update count after login/logout

### 11. Add Route for Account Page

**File**: `backend/server.js`

- Add route: `app.get('/account', ...)` to serve `account.html`
- Optionally protect with `auth` middleware (redirect to login if not authenticated)

## Technical Details

### Authentication Flow

1. **Guest User**: 

- Can browse, add to cart (localStorage), checkout
- No account required
- Cart persists in browser only

2. **Registered User**:

- Can browse, add to cart (MongoDB), checkout
- Cart persists across devices
- Can view order history
- Can update profile
- **Role is always 'user'** (cannot be 'admin')

3. **Admin User**:

- **Auto-created on server startup** (admin@dwatson.pk / admin123)
- **Cannot be created through registration**
- Separate login at `/admin` or via `/login.html` (redirects to `/admin`)
- Cannot access customer account features
- Admin panel completely isolated

### Key Files to Modify

- `frontend/login.html` - Update UI and redirect logic
- `frontend/js/login.js` - Add role-based redirect
- `frontend/register.html` - Ensure customer-focused
- `frontend/js/register.js` - Verify redirect works
- `backend/routes/auth.js` - **Enforce role='user' in registration**
- `frontend/index.html` - Add auth UI to navbar
- `frontend/cart.html` - Add login prompts
- `frontend/js/main.js` - Add auth status checking and logout
- `frontend/account.html` - New user account page
- `frontend/js/account.js` - New account management script
- `backend/server.js` - Add account page route, verify admin auto-creation

### Security Considerations

- Admin routes already protected by `adminAuth` middleware
- Customer routes use regular `auth` middleware
- JWT tokens contain role information
- Guest cart cannot access user-specific data
- **Admin users cannot be created through registration** - only auto-created on server startup
- **Registration endpoint enforces `role: 'user'` regardless of input**
- Admin credentials stored in environment variables (ADMIN_EMAIL, ADMIN_PASSWORD)

## Testing Checklist

- [ ] Guest can browse and add to cart without account
- [ ] Guest can checkout without account
- [ ] User can register and stays on home page
- [ ] **User registration always creates role='user' (never 'admin')**
- [ ] **Attempting to register with admin role fails or is forced to 'user'**
- [ ] User can login and stays on home page (not admin)
- [ ] Admin can login and goes to admin panel
- [ ] **Admin user is auto-created on server startup (admin@dwatson.pk / admin123)**
- [ ] **Admin cannot be created through registration endpoint**
- [ ] Cart merges when guest registers/logs in
- [ ] Login/Register links appear in navbar
- [ ] Login prompts appear on cart page for guests
- [ ] User account page shows profile and orders
- [ ] Logout clears token and redirects correctly
- [ ] Admin panel remains inaccessible to regular users

### To-dos

- [ ] Update login.html and login.js to be customer-focused and redirect based on user role (admin -> /admin, user -> /)
- [ ] Add login/register buttons to navbar when not logged in, and My Account/Logout when logged in
- [ ] Add login/register prompts to cart page for guest users
- [ ] Create account.html page showing user profile and order history
- [ ] Create account.js to handle profile display, order history, and profile updates
- [ ] Add logout function that clears token and updates UI
- [ ] Add /account route in server.js to serve account.html
- [ ] Verify admin routes are properly protected and separate from customer accounts