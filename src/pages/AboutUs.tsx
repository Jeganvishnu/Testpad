import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Target, Users, Zap, BookOpen, Trophy, ArrowRight } from 'lucide-react';
import Navbar from '../components/common/Navbar';

const AboutUs: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 dark:from-slate-900 dark:via-purple-950 dark:to-blue-950">
            <Navbar />
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-24">
                    <div className="text-center">
                        <img src="/logo.png" alt="TestPad" className="mx-auto h-16 w-16 sm:h-20 sm:w-20 mb-4 sm:mb-6" />
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4 sm:mb-6">
                            About TestPad
                        </h1>
                        <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
                            Revolutionizing education through AI-powered adaptive testing and personalized learning experiences
                        </p>
                    </div>
                </div>
            </div>

            {/* Mission Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4 sm:mb-6">Our Mission</h2>
                        <p className="text-lg text-slate-600 dark:text-slate-300 mb-4">
                            TestPad is an innovative educational platform designed to transform how students prepare for aptitude tests and assessments. We leverage cutting-edge AI technology to create personalized learning experiences that adapt to each student's unique needs.
                        </p>
                        <p className="text-lg text-slate-600 dark:text-slate-300">
                            Our platform combines the power of adaptive testing with AI-generated practice questions, providing students with unlimited, high-quality study materials tailored to their skill level and learning pace.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:gap-6">
                        <div className="card-modern p-6 text-center">
                            <Target className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                            <h3 className="font-bold text-slate-900 dark:text-white mb-2">Adaptive Testing</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Smart algorithms that adjust difficulty based on performance</p>
                        </div>
                        <div className="card-modern p-6 text-center">
                            <Zap className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                            <h3 className="font-bold text-slate-900 dark:text-white mb-2">AI-Powered</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Generate unlimited practice questions from any syllabus</p>
                        </div>
                        <div className="card-modern p-6 text-center">
                            <BookOpen className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                            <h3 className="font-bold text-slate-900 dark:text-white mb-2">Comprehensive</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Cover all topics with detailed analytics</p>
                        </div>
                        <div className="card-modern p-6 text-center">
                            <Trophy className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                            <h3 className="font-bold text-slate-900 dark:text-white mb-2">Track Progress</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Monitor improvement with detailed insights</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="bg-white dark:bg-slate-900 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-12">What Makes Us Different</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="card-modern p-8">
                            <div className="h-12 w-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center mb-4">
                                <GraduationCap className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Student-Centric Design</h3>
                            <p className="text-slate-600 dark:text-slate-400">
                                Built with students in mind, our intuitive interface makes test preparation engaging and effective. Track your progress, identify weak areas, and improve systematically.
                            </p>
                        </div>
                        <div className="card-modern p-8">
                            <div className="h-12 w-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center mb-4">
                                <Zap className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">AI Question Generation</h3>
                            <p className="text-slate-600 dark:text-slate-400">
                                Upload any PDF or Word document and let our AI generate unlimited practice questions. No more searching for study materials - create them instantly from your course content.
                            </p>
                        </div>
                        <div className="card-modern p-8">
                            <div className="h-12 w-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center mb-4">
                                <Users className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Admin Control</h3>
                            <p className="text-slate-600 dark:text-slate-400">
                                Comprehensive admin dashboard for educators to create tests, manage students, track performance, and generate detailed analytics reports.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="p-12 text-center bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl">
                    <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
                    <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
                        Join thousands of students already improving their test scores with TestPad's adaptive learning platform
                    </p>
                    <Link
                        to="/register"
                        className="btn-touch-lg inline-flex items-center space-x-2 px-6 py-4 sm:px-8 sm:py-4 bg-white text-purple-600 font-semibold rounded-xl hover:bg-purple-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                        <span>Start Learning Today</span>
                        <ArrowRight className="h-5 w-5" />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AboutUs;
