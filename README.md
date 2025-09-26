# CRM System

This project is a modern CRM system developed to facilitate customer relationship management. It provides integrated team-based analysis, user performance measurement, and quality control processes.

## 🚀 Features

### 📊 Dashboard (Overview)
- Total customers, users, and teams count
- Average customer ratio per user
- Customer analyses (pre-quality control statuses: To Call, Rausgefallen WP, New)
- Status of recently added customers
- Best users and teams list

### 👥 User and Team Management
- New users and teams can be created
- Tracking of customers assigned per user
- Team leadership and performance tracking

### 📞 Customer Management
- Tracking of customer statuses (e.g., to call, new, eliminated)
- Appointment categories and slot management

### ✅ Quality Control Process
- Pre-quality control (Vor-QC)
- Final quality control (Final-QC)
- Status-based customer distribution and analyses

  
 ![1752252916145](https://github.com/user-attachments/assets/9a7ab468-5271-44ec-abd3-f2e328728249)


### 📅 Calendar & Slot Management
- Defining time slots for customer meetings
- Slot reservation and tracking

  
![1752252916229](https://github.com/user-attachments/assets/6da56c86-b047-4b70-bd00-545a81b6862c)

### 🏆 Rankings
- User and team-based success rankings
- Performance comparison

## 🛠️ Technology Stack

| Area      | Technologies |
|-----------|-------------|
| Frontend  | Next.js 15, React 19, Tailwind CSS 4, shadcn/ui |
| Backend   | PocketBase (database + API) |
| UI Kit    | Radix UI, lucide-react icon set |
| State/Form | React Hook Form, Zod |
| Drag & Drop | dnd-kit, hello-pangea/dnd |
| Documents | jsPDF, docx |
| Date     | date-fns, react-day-picker |

## 📂 Installation
```bash
git clone https://github.com/uzeyirrr/sbcomyeni.git
cd sbcomyeni
npm install # or yarn
npm run dev # development environment
