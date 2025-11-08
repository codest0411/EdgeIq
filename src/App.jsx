import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/ToastContainer';
import { SupportProvider } from './contexts/SupportContext';
import SupportForm from './components/SupportForm';
import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import ResetPassword from './pages/ResetPassword';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import LessonViewer from './pages/LessonViewer';
import QuizPage from './pages/QuizPage';
import Dashboard from './pages/Dashboard';
import InstructorDashboard from './pages/InstructorDashboard';
import Leaderboard from './pages/Leaderboard';
import AdminDashboard from './pages/AdminDashboard';
import BecomeInstructor from './pages/BecomeInstructor';
import AdminUserManagement from './pages/AdminUserManagement';
import AdminCourseManagement from './pages/AdminCourseManagement';
import AdminSupport from './pages/AdminSupport';
import InstructorCreateCourse from './pages/InstructorCreateCourseNew';
import InstructorEditCourse from './pages/InstructorEditCourse';
import PaymentSuccess from './pages/PaymentSuccess';
import StudentProfile from './pages/StudentProfile';
import KBCGame from './pages/KBCGame';
import AIInterview from './pages/AIInterview';
import AdminInterviewManagement from './pages/AdminInterviewManagement';
import AssessmentArena from './pages/AssessmentArena';
import AdminAssessmentManagement from './pages/AdminAssessmentManagement';
import Assessments from './pages/Assessments';
import CertificateGenerator from './pages/CertificateGenerator';

function App() {
  return (
    <ToastProvider>
      <SupportProvider>
        <Router>
      <Routes>
        {/* Admin routes without Navbar/Footer */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/user-management" element={<AdminUserManagement />} />
        <Route path="/admin/courses" element={<AdminCourseManagement />} />
        <Route path="/admin/interviews" element={<AdminInterviewManagement />} />
        <Route path="/admin/support" element={<AdminSupport />} />
        <Route path="/admin/assessments" element={<AdminAssessmentManagement />} />
        
        {/* Instructor routes without Navbar/Footer */}
        <Route path="/instructor/dashboard" element={<InstructorDashboard />} />
        <Route path="/instructor/courses/create" element={<InstructorCreateCourse />} />
        <Route path="/instructor/courses/:courseId/edit" element={<InstructorEditCourse />} />
        
        {/* Auth page without Navbar/Footer */}
        <Route path="/auth" element={<AuthPage />} />
        
        {/* Password Reset page without Navbar/Footer */}
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* XP Battle Game without Navbar/Footer (full screen immersive) */}
        <Route 
          path="/kbc-game" 
          element={
            <ProtectedRoute>
              <KBCGame />
            </ProtectedRoute>
          } 
        />
        
        {/* Assessment Arena without Navbar/Footer (full screen proctored) */}
        <Route 
          path="/assessment/:assessmentId" 
          element={
            <ProtectedRoute>
              <AssessmentArena />
            </ProtectedRoute>
          } 
        />
        
        {/* Regular routes with Navbar/Footer */}
        <Route path="/*" element={
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/become-instructor" element={<BecomeInstructor />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/courses/:id" element={<CourseDetail />} />
                <Route
                  path="/courses/:id/lesson/:lessonId"
                  element={
                    <ProtectedRoute>
                      <LessonViewer />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/courses/:id/quiz/:quizId"
                  element={
                    <ProtectedRoute>
                      <QuizPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ai-interview"
                  element={
                    <ProtectedRoute>
                      <AIInterview />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/assessments"
                  element={
                    <ProtectedRoute>
                      <Assessments />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <StudentProfile />
                    </ProtectedRoute>
                  }
                />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/certificate-generator" element={<CertificateGenerator />} />
              </Routes>
            </main>
            <Footer />
          </div>
        } />
      </Routes>
      <SupportForm />
    </Router>
      </SupportProvider>
    </ToastProvider>
  );
}

export default App;
