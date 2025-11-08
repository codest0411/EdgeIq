# EdgeIQ Frontend

> **Modern, responsive React application for EdgeIQ - AI-Powered E-Learning Platform**

A beautiful, feature-rich frontend built with React, Vite, and Tailwind CSS, providing an exceptional learning experience.

---

## 🚀 Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Animations**: Framer Motion
- **State Management**: React Hooks
- **Authentication**: Supabase Auth
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **PDF Generation**: jsPDF
- **Payment**: Stripe Checkout
- **Code Editor**: Monaco Editor (React)

---

## ✨ Features

### User Features
- 🎓 **Course Browsing** - Browse and filter courses by category
- 📚 **Course Learning** - Watch videos, read lessons, take quizzes
- 📊 **Progress Tracking** - Track course completion and XP
- 🏆 **Leaderboard** - Weekly and all-time XP rankings
- 📝 **Assessments** - Take MCQ, coding, and text-based tests
- 🎮 **Games** - KBC-style quiz game with lifelines
- 🎯 **XP Battle** - Real-time quiz battles
- 📜 **Certificates** - Generate and download certificates
- 💳 **Payments** - Secure Stripe checkout integration
- 🌓 **Dark Mode** - Toggle between light and dark themes
- 📱 **Responsive** - Mobile-first design

### Instructor Features
- 📝 **Course Creation** - Create and manage courses
- 💰 **Earnings Dashboard** - Track revenue and enrollments
- 📊 **Analytics** - View course performance metrics

### Admin Features
- 👥 **User Management** - Manage users and roles
- 📚 **Content Moderation** - Approve/reject courses
- 📊 **Platform Analytics** - View platform statistics
- 🎯 **Assessment Management** - Create and manage assessments

---

## 📁 Project Structure

```
frontend/
├── public/                  # Static assets
│   └── vite.svg
├── src/
│   ├── components/          # Reusable components
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── LoadingSpinner.jsx
│   │   ├── CourseCertificate.jsx
│   │   ├── SupportForm.jsx
│   │   └── ...
│   ├── contexts/            # React contexts
│   │   ├── AuthContext.jsx
│   │   └── ThemeContext.jsx
│   ├── hooks/               # Custom hooks
│   │   ├── useAuth.js
│   │   └── useToast.js
│   ├── pages/               # Page components
│   │   ├── Home.jsx
│   │   ├── Courses.jsx
│   │   ├── CourseDetail.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Assessments.jsx
│   │   ├── AssessmentArena.jsx
│   │   ├── Leaderboard.jsx
│   │   ├── KBCGame.jsx
│   │   ├── XPBattle.jsx
│   │   ├── CertificateGenerator.jsx
│   │   ├── AdminDashboard.jsx
│   │   └── ...
│   ├── styles/              # Global styles
│   │   └── index.css
│   ├── utils/               # Utility functions
│   │   └── supabase.js
│   ├── App.jsx              # Main app component
│   └── main.jsx             # Entry point
├── .env.example             # Environment template
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md
```

---

## 🛠️ Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd EdgeIQ/frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# API
VITE_API_URL=http://localhost:5000/api
VITE_APP_URL=http://localhost:5173

# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# AI (Optional)
VITE_HUGGINGFACE_API_KEY=your_huggingface_key
```

4. **Start development server**
```bash
npm run dev
```

App runs on `http://localhost:5173`

5. **Build for production**
```bash
npm run build
```

---

## 🎨 Pages Overview

### Public Pages
- **Home** (`/`) - Landing page with features and stats
- **Courses** (`/courses`) - Browse all courses
- **Course Detail** (`/courses/:id`) - View course content
- **Login** (`/login`) - User authentication
- **Signup** (`/signup`) - User registration

### Protected Pages (Require Login)
- **Dashboard** (`/dashboard`) - User dashboard with progress
- **Assessments** (`/assessments`) - Browse assessments
- **Assessment Arena** (`/assessments/:id/arena`) - Take assessment
- **Leaderboard** (`/leaderboard`) - XP rankings
- **Games** (`/games`) - Game selection
- **KBC Game** (`/games/kbc`) - Quiz game
- **XP Battle** (`/games/xp-battle`) - Battle mode
- **Certificate Generator** (`/certificate-generator`) - Generate certificates
- **Profile** (`/profile`) - User profile settings

### Instructor Pages
- **Instructor Dashboard** (`/instructor`) - Instructor portal
- **Create Course** (`/instructor/create-course`) - Course creation
- **My Courses** (`/instructor/courses`) - Manage courses
- **Earnings** (`/instructor/earnings`) - Revenue tracking

### Admin Pages
- **Admin Dashboard** (`/admin`) - Admin panel
- **User Management** (`/admin/users`) - Manage users
- **Assessment Management** (`/admin/assessments`) - Manage assessments

---

## 🎯 Key Features Implementation

### Authentication Flow
```jsx
// Using AuthContext
import { useAuth } from './contexts/AuthContext';

function Component() {
  const { user, login, logout, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;
  
  return <div>Protected Content</div>;
}
```

### API Calls
```jsx
import axios from 'axios';

// GET request
const response = await axios.get('/api/courses');

// POST with auth
const { data } = await axios.post('/api/courses', courseData, {
  headers: {
    Authorization: `Bearer ${session.access_token}`
  }
});
```

### Stripe Payment
```jsx
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Create checkout session
const { sessionId } = await axios.post('/api/payments/create-checkout', {
  courseId: course.id
});

// Redirect to Stripe
await stripe.redirectToCheckout({ sessionId });
```

### Dark Mode Toggle
```jsx
import { useTheme } from './contexts/ThemeContext';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
```

---

## 🎨 Styling

### Tailwind CSS
The project uses Tailwind CSS with custom configuration:

```js
// tailwind.config.js
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {...},
        secondary: {...}
      }
    }
  }
}
```

### Custom Classes
```css
/* Global styles in src/styles/index.css */
@layer components {
  .btn-primary {
    @apply bg-primary-600 text-white px-4 py-2 rounded-lg;
  }
}
```

---

## 🔌 API Integration

### Base URL Configuration
```js
// vite.config.js
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
}
```

### Axios Instance
```js
import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_API_URL;
```

---

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

This creates an optimized build in the `dist/` folder.

### Deploy to Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

### Deploy to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Environment Variables
Set these in your hosting platform:
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`

---

## 🐛 Troubleshooting

### Common Issues

**Vite dev server not starting**
```bash
# Clear cache and restart
rm -rf node_modules/.vite
npm run dev
```

**API calls failing**
- Check `VITE_API_URL` in `.env`
- Ensure backend is running
- Verify CORS settings in backend

**Supabase auth errors**
- Verify Supabase credentials
- Check browser console for errors
- Ensure Supabase project is active

**Build errors**
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

**Stripe checkout not working**
- Verify `VITE_STRIPE_PUBLISHABLE_KEY`
- Check browser console for errors
- Ensure backend Stripe webhook is configured

---

## 📝 Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

---

## 🎨 UI Components

### Reusable Components
- `Navbar` - Navigation bar with auth state
- `Footer` - Footer with links
- `LoadingSpinner` - Loading indicator
- `Toast` - Notification system
- `Modal` - Reusable modal dialog
- `Card` - Content card component
- `Button` - Styled button variants
- `Input` - Form input components

### Page Components
- `Home` - Landing page
- `Dashboard` - User dashboard
- `CourseCard` - Course display card
- `QuizCard` - Quiz component
- `Leaderboard` - Rankings table
- `CertificateGenerator` - PDF certificate

---

## 🔒 Protected Routes

```jsx
// ProtectedRoute component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;
  
  return children;
}

// Usage in App.jsx
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

---

## 📱 Responsive Design

The app is fully responsive with breakpoints:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

```jsx
// Responsive Tailwind classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Content */}
</div>
```

---

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📧 Support

For issues and questions, please open a GitHub issue.

---

**Built with ❤️ using React + Vite + Tailwind CSS**
