# Dhanvika Beauty Parlour | Salon Booking System

A premium, modern web application designed for **Dhanvika Beauty Parlour** to streamline appointment scheduling, service discovery, customer management, and admin operations.

## ✨ Features

- **🌸 Customer Experience**:
  - Discover services across hair, makeup, spa, and bridal categories.
  - Interactive booking flow with real-time slot checking.
  - Personalized customer dashboard to view upcoming and historical bookings.
  - Automatic invoice generation in PDF format.
  - Quick WhatsApp booking confirmations.
  
- **🔐 Authentication & Security**:
  - Secure login/signup system for clients.
  - Restricted Admin Dashboard for booking and gallery management.

- **📊 Admin Portal**:
  - Unified view of all scheduled appointments.
  - Filter bookings by date or customer name.
  - Update appointment status (Confirm/Cancel) or delete records.
  - Style Gallery Manager: Upload and manage reference style images linked to services.

- **⚡ Technology Stack**:
  - **Frontend**: React, Vite, Tailwind CSS, Lucide icons.
  - **Backend/Database**: Firestore Database for real-time slot and reference gallery synchronization (with offline local storage fallbacks).
  - **Invoices**: PDF generation using dynamic templates.

## 🛠️ Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/harshasiddhartha8927-op/parlour.git
   cd parlour
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```
