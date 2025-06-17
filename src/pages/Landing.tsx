import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, User, Calendar, LayoutDashboard, Shield, Smartphone } from 'lucide-react';

export const Landing: React.FC = () => {
  const features = [
    {
      icon: Clock,
      title: 'Easy Sign In/Out',
      description: 'Simple one-click attendance tracking for all weekdays. Sign in when you arrive, sign out when you leave.'
    },
    {
      icon: Calendar,
      title: 'Missed Days Tracking',
      description: 'Automatically track and display missed attendance days with clear visibility for interns and admins.'
    },
    {
      icon: LayoutDashboard,
      title: 'Personal Dashboard',
      description: 'View your attendance history, missed days, and track your progress with an intuitive dashboard.'
    },
    {
      icon: Shield,
      title: 'Admin Oversight',
      description: 'Comprehensive admin panel for managing all intern attendance records and generating reports.'
    },
    {
      icon: User,
      title: 'Profile Management',
      description: 'Manage your profile information and keep your attendance records organized and up-to-date.'
    },
    {
      icon: Smartphone,
      title: 'Mobile Friendly',
      description: 'Access the system from any device with our responsive design that works perfectly on mobile.'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Track Your Attendance at
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">
                Ilorin Innovation Hub
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              A modern, efficient system designed to streamline intern attendance tracking. 
              Sign in and out with ease, track your progress, and stay connected with your internship journey.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="text-lg px-8 py-3">
                <Link to="/login/intern">Login as Intern</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8 py-3">
                <Link to="/login/admin">Login as Admin</Link>
              </Button>
              <Button size="lg" variant="secondary" asChild className="text-lg px-8 py-3">
                <Link to="/signup/intern">Register as Intern</Link>
              </Button>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-emerald-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
      </section>

      {/* About Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">About the System</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Built specifically for the Ilorin Innovation Hub, this attendance system ensures 
              seamless tracking of intern presence while providing valuable insights for both 
              interns and administrators.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Empowering Innovation Through Accountability
              </h3>
              <p className="text-gray-600 mb-6">
                The Ilorin Innovation Hub is committed to fostering the next generation of 
                innovators and entrepreneurs. Our attendance system supports this mission by 
                providing a reliable, user-friendly platform that encourages consistent 
                participation and professional development.
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Mandatory weekday attendance (Monday to Friday)
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                  Real-time tracking and reporting
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Comprehensive admin oversight tools
                </li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-emerald-50 p-8 rounded-2xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-2xl">IIH</span>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Ilorin Innovation Hub</h4>
                <p className="text-gray-600">
                  Leading the way in technology education and innovation in Kwara State, 
                  providing world-class internship programs that shape the future of tech.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Key Features</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Everything you need for efficient attendance management, designed with 
              both interns and administrators in mind.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-emerald-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join the Ilorin Innovation Hub community and start tracking your attendance today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild className="text-lg px-8 py-3">
              <Link to="/signup/intern">Create Intern Account</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-blue-600">
              <Link to="/login/intern">Login as Intern</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-blue-600">
              <Link to="/login/admin">Login as Admin</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
