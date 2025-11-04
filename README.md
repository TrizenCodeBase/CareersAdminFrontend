# Trizen Careers Admin Panel

Admin panel for managing job applications and candidates for Trizen Ventures.

## Features

- **Dashboard** - Overview of application statistics
- **Applications List** - View all applications with filtering and search
- **Application Details** - View complete candidate information
- **Status Management** - Update application status (pending, reviewed, shortlisted, rejected, accepted)
- **Admin Authentication** - Secure login for admin users only

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (optional, defaults to localhost):
```env
VITE_API_BASE_URL=http://localhost:5000
```

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Usage

1. Login with admin credentials
2. View dashboard for statistics
3. Navigate to Applications to see all submissions
4. Click on any application to view detailed candidate information
5. Update application status as needed

## Requirements

- Admin user account with `role: 'admin'` in the database
- Backend API running at configured URL
- Modern browser with JavaScript enabled

