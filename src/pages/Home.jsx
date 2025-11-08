import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Award, TrendingUp, Sparkles, GraduationCap, Users, Target, Zap, Shield, Star, Lightbulb, Globe, Rocket, Heart } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Home() {
  const [stats, setStats] = useState({
    activeStudents: 10000,
    expertCourses: 500,
    successRate: 95,
    industryPartners: 50
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/stats/platform');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        // Keep default values if API fails
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 sm:py-16 md:py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight"
            >
              Think Sharper. and{' '}
              <span className="bg-gradient-to-r from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary bg-clip-text text-transparent">
                 Rise Higher.
              </span>{' '}
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 max-w-3xl mx-auto px-2 leading-relaxed"
            >
             EdgeIQ harnesses the power of AI to craft a smarter, personalized learning experience—helping you master skills faster and achieve more.</motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center px-4 sm:px-0"
            >
              <Link to="/auth" className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 w-full sm:w-auto text-center">
                Get Started Free
              </Link>
              <Link to="/become-instructor" className="btn-secondary text-base sm:text-lg px-6 sm:px-8 py-3 flex items-center justify-center space-x-2 w-full sm:w-auto">
                <GraduationCap className="h-5 w-5" />
                <span>Become an Instructor</span>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 bg-light-card dark:bg-dark-card">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8 sm:mb-12">
            Why Choose EdgeIQ?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<BookOpen className="h-8 w-8" />}
              title="Expert Courses"
              description="Learn from industry professionals with real-world experience"
            />
            <FeatureCard
              icon={<Sparkles className="h-8 w-8" />}
              title="AI Insights"
              description="Get personalized recommendations powered by advanced AI"
            />
            <FeatureCard
              icon={<Award className="h-8 w-8" />}
              title="Certificates"
              description="Earn verified certificates to showcase your achievements"
            />
            <FeatureCard
              icon={<TrendingUp className="h-8 w-8" />}
              title="Track Progress"
              description="Monitor your learning journey with detailed analytics"
            />
          </div>
        </div>
      </section>

      {/* Platform Features Stats */}
      <section className="py-12 sm:py-16 md:py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">
            What's Available on EdgeIQ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <StatCard 
              number={`${stats.expertCourses.toLocaleString()}+`} 
              label="Available Courses" 
              loading={loading}
            />
            <StatCard 
              number="5+" 
              label="Learning Features" 
              loading={false}
            />
            <StatCard 
              number="AI-Powered" 
              label="Interview Practice" 
              loading={false}
            />
            <StatCard 
              number="24/7" 
              label="Platform Access" 
              loading={false}
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 bg-light-card dark:bg-dark-card">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-3 sm:mb-4">
            How EdgeIQ Works
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 text-center mb-8 sm:mb-12 max-w-3xl mx-auto px-4">
            Your journey to mastery in three simple steps
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              icon={<Target className="h-8 w-8" />}
              title="Choose Your Path"
              description="Browse our extensive course library and select courses that align with your career goals and interests."
            />
            <StepCard
              number="2"
              icon={<Zap className="h-8 w-8" />}
              title="Learn with AI"
              description="Experience personalized learning powered by AI that adapts to your pace and provides real-time insights."
            />
            <StepCard
              number="3"
              icon={<Award className="h-8 w-8" />}
              title="Earn & Grow"
              description="Complete assessments, earn certificates, and track your progress on the leaderboard."
            />
          </div>
        </div>
      </section>

      {/* Platform Features Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8 sm:mb-12">
            Everything You Need to Succeed
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <PlatformFeature
              icon={<Users className="h-6 w-6" />}
              title="Interactive Learning Community"
              description="Connect with fellow learners, share insights, and compete on the leaderboard to stay motivated."
            />
            <PlatformFeature
              icon={<Sparkles className="h-6 w-6" />}
              title="AI-Powered Interviews"
              description="Practice with our AI interview system that provides realistic scenarios and instant feedback."
            />
            <PlatformFeature
              icon={<Shield className="h-6 w-6" />}
              title="Proctored Assessments"
              description="Take secure, proctored assessments that validate your skills and knowledge."
            />
            <PlatformFeature
              icon={<TrendingUp className="h-6 w-6" />}
              title="XP Battle Game"
              description="Make learning fun with our gamified XP system that rewards your progress and achievements."
            />
          </div>
        </div>
      </section>

      {/* Our Goals Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 bg-light-card dark:bg-dark-card">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">
              Our Goals & Vision
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto px-4">
              We're on a mission to revolutionize education through AI-powered learning experiences
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <GoalCard
              icon={<Lightbulb className="h-8 w-8" />}
              title="Democratize Learning"
              description="Make world-class education accessible to everyone, regardless of their background or location."
            />
            <GoalCard
              icon={<Rocket className="h-8 w-8" />}
              title="Accelerate Growth"
              description="Help learners achieve their goals faster through personalized AI-driven learning paths."
            />
            <GoalCard
              icon={<Globe className="h-8 w-8" />}
              title="Build Community"
              description="Create a global network of learners and experts who support and inspire each other."
            />
            <GoalCard
              icon={<Heart className="h-8 w-8" />}
              title="Empower Success"
              description="Equip students with skills, confidence, and certifications to excel in their careers."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 sm:mb-6">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 px-4">
            Join thousands of students already learning smarter with EdgeIQ
          </p>
          <Link to="/auth" className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 inline-block w-full sm:w-auto mx-4 sm:mx-0">
            Start Learning Today
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="card text-center"
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary text-white mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </motion.div>
  );
}

function StatCard({ number, label, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="card text-center"
    >
      <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary bg-clip-text text-transparent mb-2">
        {loading ? (
          <div className="animate-pulse">...</div>
        ) : (
          <motion.span
            key={number}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {number}
          </motion.span>
        )}
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-lg">{label}</p>
    </motion.div>
  );
}

function StepCard({ number, icon, title, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="card text-center relative"
    >
      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary text-white flex items-center justify-center text-xl font-bold">
        {number}
      </div>
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-light-card dark:bg-dark-card border-2 border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary mb-4 mt-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </motion.div>
  );
}

function PlatformFeature({ icon, title, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="card flex gap-4"
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary text-white flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </motion.div>
  );
}

function GoalCard({ icon, title, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="card text-center hover:shadow-xl transition-shadow duration-300"
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary text-white mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
    </motion.div>
  );
}
