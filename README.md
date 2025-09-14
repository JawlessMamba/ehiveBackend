# Asset Inventory Management System

A comprehensive web-based platform for managing organizational assets, designed specifically for IT departments to track, monitor, and audit hardware inventory with role-based access control.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [User Roles](#user-roles)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

The Asset Inventory Management System replaces manual and semi-automated solutions (Excel files, paper logs) with a robust digital platform that provides:

- Real-time asset visibility
- Accurate reporting and analytics
- Role-based access control
- Comprehensive audit trails
- Multiple export formats

**Project Details:**
- **Platform:** Web Application
- **Prepared By:** Muhammad Harmain Ansari
- **Date:** August 6, 2025

## ✨ Features

### 📊 Dashboard
- Real-time KPI metrics (Total Assets, Active Assets, Expiring Equipment)
- Visual charts for asset distribution by department
- IS Spare Inventory management with hardware classification
- Operational and disposition status summaries

### 📦 Inventory Management
- Comprehensive asset listing with 18+ data fields
- Advanced filtering and search capabilities
- CRUD operations based on user permissions
- Bulk export functionality (Excel, CSV, PDF)
- Asset transfer and surplus marking

### ➕ Asset Registration
- Intuitive form-based asset entry
- Real-time validation and error handling
- Unique identifier enforcement
- Transfer workflow support

### 📂 Category Management
- Structured asset categorization
- Admin-controlled category CRUD operations
- Custom attribute creation for categories

### 📜 Audit History
- Complete transfer activity logging
- Searchable and filterable audit trails
- Accountability tracking with timestamps
- User activity monitoring

### 🔐 Security & Authentication
- JWT-based authentication
- Role-based access control (Admin/User)
- Session management with auto-timeout
- Encrypted password storage

## 🛠 Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React.js (Hooks) + Vite |
| **Validation** | Yup + React Hook Form |
| **Backend** | Node.js + Express.js |
| **Database** | MySQL |
| **Authentication** | JWT (Role-based) |
| **Export/Reporting** | jsPDF, ExcelJS, CSV libraries |
| **Architecture** | RESTful APIs, MVC Pattern |

## 💻 System Requirements

### Minimum Requirements
- **Node.js:** v16.0.0 or higher
- **npm:** v7.0.0 or higher
- **MySQL:** v8.0 or higher
- **Browser:** Chrome 90+, Firefox 88+, Safari 14+

### Recommended
- **RAM:** 8GB or higher
- **Storage:** 1GB available space
- **Network:** Stable internet connection for cloud deployments

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/asset-inventory-system.git
cd asset-inventory-system
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and JWT secret

# Run database migrations
npm run migrate

# Seed initial data (optional)
npm run seed

# Start the backend server
npm run dev
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory (new terminal)
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 4. Database Setup
```sql
-- Asset Inventory Management System Database Schema
-- Database: ims

-- Main Assets Table
CREATE TABLE `assets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `serial_number` varchar(100) NOT NULL,
  `hardware_type` varchar(50) NOT NULL,
  `model_number` varchar(50) DEFAULT NULL,
  `owner_fullname` varchar(100) NOT NULL,
  `hostname` varchar(100) DEFAULT NULL,
  `p_number` varchar(50) DEFAULT NULL,
  `cadre` varchar(50) NOT NULL,
  `department` varchar(50) NOT NULL,
  `section` varchar(50) DEFAULT NULL,
  `building` varchar(50) DEFAULT NULL,
  `vendor` varchar(100) DEFAULT NULL,
  `po_number` varchar(50) DEFAULT NULL,
  `po_date` date DEFAULT NULL,
  `dc_number` varchar(50) DEFAULT NULL,
  `dc_date` date DEFAULT NULL,
  `assigned_date` date DEFAULT NULL,
  `replacement_due_period` varchar(50) DEFAULT NULL,
  `replacement_due_date` date DEFAULT NULL,
  `operational_status` varchar(50) NOT NULL,
  `disposition_status` varchar(50) NOT NULL,
  `asset_id` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Asset History Table
CREATE TABLE `asset_history` (
  `history_id` int(11) NOT NULL AUTO_INCREMENT,
  `transfer_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `asset_id` int(11) NOT NULL,
  `serial_number` varchar(50) NOT NULL,
  `hardware_type_model` varchar(150) NOT NULL,
  `previous_owner` varchar(100) NOT NULL,
  `new_owner` varchar(100) NOT NULL,
  `transfer_reason` varchar(255) DEFAULT NULL,
  `transferred_by` int(11) NOT NULL,
  PRIMARY KEY (`history_id`),
  KEY `asset_id` (`asset_id`),
  KEY `transferred_by` (`transferred_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Asset Transfers Table
CREATE TABLE `asset_transfers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `asset_id` int(11) NOT NULL,
  `asset_serial_number` varchar(100) DEFAULT NULL,
  `previous_owner_fullname` varchar(100) NOT NULL,
  `previous_hostname` varchar(100) NOT NULL,
  `previous_p_number` varchar(50) NOT NULL,
  `previous_cadre` varchar(50) NOT NULL,
  `previous_department` varchar(50) NOT NULL,
  `previous_section` varchar(50) DEFAULT NULL,
  `previous_building` varchar(50) DEFAULT NULL,
  `new_owner_fullname` varchar(100) NOT NULL,
  `new_hostname` varchar(100) NOT NULL,
  `new_p_number` varchar(50) NOT NULL,
  `new_cadre` varchar(50) NOT NULL,
  `new_department` varchar(50) NOT NULL,
  `new_section` varchar(50) DEFAULT NULL,
  `new_building` varchar(50) DEFAULT NULL,
  `transfer_reason` varchar(255) NOT NULL,
  `transfer_date` datetime DEFAULT current_timestamp(),
  `transferred_by` varchar(255) DEFAULT NULL,
  `transferred_by_user_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_id` (`asset_id`),
  KEY `idx_transferred_by_user_id` (`transferred_by_user_id`),
  CONSTRAINT `asset_transfers_ibfk_1` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`),
  CONSTRAINT `fk_transferred_by_user` FOREIGN KEY (`transferred_by_user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- User Management Table
CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','user') NOT NULL DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('active','blocked') DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Reference Tables for Dropdowns/Categories

CREATE TABLE `hardware_type` (
  `type_id` int(11) NOT NULL AUTO_INCREMENT,
  `type_name` varchar(100) NOT NULL,
  PRIMARY KEY (`type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `department` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `sections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `cadres` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `building` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `vendors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `models` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `operational_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `disposition_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

## ⚙️ Configuration

### Environment Variables

**Backend (.env):**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=asset_inventory
DB_USER=your_username
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

**Frontend (.env):**
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_TITLE=Asset Inventory Management
```

### Database Schema
The system uses the following main tables:
- `users` - User authentication and roles
- `assets` - Asset inventory data
- `categories` - Asset categorization
- `history` - Audit trail for transfers
- `departments` - Organizational structure

## 📖 Usage

### Getting Started
1. Access the application at `http://localhost:3000`
2. Login with your credentials
3. Navigate through the sidebar menu based on your role

### For Administrators
- **User Management:** Add/remove users and assign roles
- **Asset Management:** Full CRUD operations on all assets
- **Category Management:** Create and manage asset categories
- **System Monitoring:** Access to all audit logs and reports

### For Users
- **Asset Entry:** Add new assets to the inventory
- **Asset Updates:** Modify existing asset information (limited)
- **Inventory Viewing:** Browse and search through assets
- **Report Generation:** Export data in multiple formats

## 👥 User Roles

### Admin
- ✅ Full system access
- ✅ User management capabilities
- ✅ Asset deletion and serial number editing
- ✅ Category management
- ✅ Complete audit access

### User
- ✅ Asset addition and limited editing
- ✅ Inventory viewing and filtering
- ✅ Data export functionality
- ✅ History tracking access
- ❌ No deletion or user management privileges

## 🔌 API Documentation

### Authentication Endpoints
```
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/verify
```

### Asset Management Endpoints
```
GET    /api/assets          # Get all assets
POST   /api/assets          # Create new asset
PUT    /api/assets/:id      # Update asset
DELETE /api/assets/:id      # Delete asset (Admin only)
GET    /api/assets/export   # Export assets
```

### Category Management Endpoints
```
GET    /api/categories      # Get all categories
POST   /api/categories      # Create category (Admin only)
PUT    /api/categories/:id  # Update category (Admin only)
DELETE /api/categories/:id  # Delete category (Admin only)
```

### History & Audit Endpoints
```
GET /api/history            # Get transfer history
GET /api/history/search     # Search history with filters
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards
- Use ESLint and Prettier for code formatting
- Follow React Hooks best practices
- Write meaningful commit messages
- Add unit tests for new features
- Update documentation for API changes

## 📝 Development Notes

### Project Structure
```
asset-inventory-system/
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── config/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── utils/
│   └── public/
└── docs/
```

### Testing
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# End-to-end tests
npm run test:e2e
```

## 🐛 Troubleshooting

### Common Issues

**Database Connection Error:**
- Verify MySQL service is running
- Check database credentials in `.env`
- Ensure database exists and user has proper permissions

**Authentication Issues:**
- Clear browser local storage
- Check JWT secret configuration
- Verify user credentials in database

**Build Errors:**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version compatibility
- Verify all environment variables are set
=
---

**Built with ❤️ by the IT Development Team**
