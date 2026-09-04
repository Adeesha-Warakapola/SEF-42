# SLIIT Lost & Found Full Complete System

A centralized, secure web application designed for SLIIT students, staff, and administrators to report lost belongings, list found items, and safely verify and process ownership claims.

---

## 📌 The Selected Problem

Across university campuses like SLIIT, hundreds of valuable personal items (student IDs, laptops, USB drives, wallets, earphones, notebooks) are misplaced or found every semester. 

Currently, the recovery process suffers from severe inefficiencies:
- **Fragmented Communication Channels**: Inquiries and notices are scattered across unofficial WhatsApp groups, batch Telegram channels, and physical notice boards.
- **Low Recovery & High Clutter**: Posts quickly get buried under daily messages, resulting in low recovery rates for owners.
- **Lack of Verification & Security**: No systematic method exists to verify whether a person claiming an item is the legitimate owner.
- **No Centralized Administrative Oversight**: Campus security and faculty desks lack a unified dashboard to monitor item status, handle unclaimed property, or prevent fraudulent claims.

---

## 💡 The Proposed Solution

The **SLIIT Lost & Found System** provides an organized, single-source platform tailored specifically for the university community. 

- **Unified Digital Registry**: A structured catalog for reporting and viewing both lost and found items in real-time.
- **Proof-Based Claim Workflow**: Claimants must provide distinct verification details (serial numbers, distinguishing marks, color patterns) before retrieving an item.
- **Role-Based Moderation**: Campus administrators can review claim proofs, approve/reject requests, resolve listings, and manage user access.
- **Instant Search & Filter**: Real-time filtering by category, campus location, date, and keywords allows users to locate their lost belongings within seconds.

---

## ✨ Main Features

### 1. 🔐 User Authentication & Role Management
- Secure user registration and login.
- Role-based authorization distinguishing regular **Students** from **Admins**.
- Protected routes preventing unauthorized access to item reporting and admin panels.

### 2. 🔍 Lost Items Management
- Report lost items with details (name, category, last known campus location, date lost, description, and image URL).
- Real-time catalog of all active lost items.
- Item owners can edit or delete their submitted reports.

### 3. 📦 Found Items Management
- Report found items found across campus venues (Computing building, Library, Canteen, Engineering block, etc.).
- Categorized gallery view of all items waiting to be claimed.
- Integrated "Claim Item" action directly on found item cards.

### 4. 📝 Verification & Claims System
- Multi-step claim submission requiring claimant verification details.
- User-specific dashboard to track the status of filed claims (**Pending**, **Approved**, or **Rejected**).
- Automated item status updates upon claim approval.

### 5. 🛡️ Admin Dashboard & Moderation
- Overview metrics and analytics (Total Lost Items, Found Items, Resolved Items, Pending Claims).
- Claim adjudication tool (review claimant notes and approve/reject claims).
- Management of user privileges (promoting students to admins).

### 6. 🔎 Search & Multi-Filter Engine
- Instant search by item title and description.
- Multi-parameter filtering by:
  - **Category** (Electronics, Accessories, Wallets & Bags, Documents/Cards, Keys, Books/Notes, etc.)
  - **Location** (Main Building, New Building, Library, Cafeteria, Computing Lab, etc.)
  - **Date Reported**

---

## 🛠️ Technologies Used

### Frontend
- **React 19**: Component-based user interface architecture.
- **Vite 8**: Next-generation lightning-fast build tool and dev server.
- **Tailwind CSS v4**: Modern utility-first styling for responsive and sleek UI design.
- **React Router DOM v7**: Client-side routing with guarded route wrappers.

### Backend & Database (BaaS)
- **Supabase (PostgreSQL)**: Scalable relational database engine.
- **PL/pgSQL RPC Functions**: Server-side stored procedures for secure registration, authentication, and admin actions.
- **Row Level Security (RLS)**: Fine-grained database access control policies.
- **`pgcrypto` Extension**: Cryptographic hashing (`crypt()` with Blowfish salt) for password protection.

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18+ recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A free [Supabase](https://supabase.com) account

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/sliit-lost-and-found.git
cd sliit-lost-and-found/sliit-lost-and-found
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup (Supabase)
1. Log in to [Supabase](https://supabase.com) and create a new project.
2. Go to the **SQL Editor** tab in your Supabase dashboard.
3. Open [`supabase/schema.sql`](supabase/schema.sql), paste its entire contents into the SQL Editor, and click **Run**.
4. In your Supabase dashboard, navigate to **Project Settings > API** to obtain:
   - **Project URL**
   - **Project API Anon Key**

### 4. Configure Environment Variables
Copy the example environment file:
```bash
cp .env.example .env
```
Open `.env` and fill in your Supabase project credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 5. Run the Application Locally
```bash
npm run dev
```
Open the local URL provided in your terminal (usually [http://localhost:5173](http://localhost:5173)).

---

## 👤 Demo Credentials

If you loaded the sample data included in `supabase/schema.sql`, you can log in with:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@gmail.com` | `admin12345` |
| **Student** | `nimal.perera@my.sliit.lk` | `student123` |

---

## 📁 Project Structure

```
sliit-lost-and-found/
├── public/                 # Static public assets
├── src/
│   ├── components/         # Reusable UI components (Navbar, ItemCard, ItemForm, etc.)
│   ├── context/            # React context providers (AppContext for auth & global state)
│   ├── lib/                # Supabase client, constants, and validation rules
│   ├── pages/              # View pages (Home, Login, Register, LostItems, FoundItems, Claims, Admin)
│   ├── App.jsx             # Main router & page layout
│   ├── index.css           # Global stylesheet with Tailwind CSS
│   └── main.jsx            # React root entry point
├── supabase/
│   └── schema.sql          # Complete PostgreSQL schema, RLS policies, and RPC functions
├── .env.example            # Template for environment variables
├── package.json            # Project dependencies and npm scripts
└── README.md               # Project documentation
```

---

## 📄 License
This project is developed for educational purposes as part of the SLIIT curriculum.
