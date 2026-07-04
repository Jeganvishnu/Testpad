import React, { useState } from 'react';
import { Mail, Send, CheckCircle, AlertCircle } from 'lucide-react';
import emailjs from '@emailjs/browser';
import Navbar from '../components/common/Navbar';

const ContactUs: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('sending');
        setErrorMessage('');

        try {
            // Using EmailJS to send email
            await emailjs.send(
                'service_optimum', // You'll need to create this service in EmailJS
                'template_contact', // You'll need to create this template
                {
                    from_name: formData.name,
                    from_email: formData.email,
                    subject: formData.subject,
                    message: formData.message,
                    to_email: 'optimum-test@gmail.com'
                },
                'YOUR_PUBLIC_KEY' // Replace with your EmailJS public key
            );

            setStatus('success');
            setFormData({ name: '', email: '', subject: '', message: '' });

            // Reset success message after 5 seconds
            setTimeout(() => setStatus('idle'), 5000);
        } catch (error) {
            console.error('Error sending email:', error);
            setStatus('error');
            setErrorMessage('Failed to send message. Please try again or email us directly at optimum-test@gmail.com');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 dark:from-slate-900 dark:via-purple-950 dark:to-blue-950">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
                        Contact Us
                    </h1>
                    <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                        Have questions or feedback? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                    {/* Contact Form */}
                    <div className="card-modern mobile-p-safe">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Send us a Message</h2>

                        {status === 'success' && (
                            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center space-x-3">
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                <p className="text-green-700 dark:text-green-300 font-medium">Message sent successfully! We'll get back to you soon.</p>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start space-x-3">
                                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                                <p className="text-red-700 dark:text-red-300 text-sm">{errorMessage}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Your Name
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="input-mobile block w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white dark:bg-slate-800 dark:text-white transition-all"
                                    placeholder="Enter your name"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="input-mobile block w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white dark:bg-slate-800 dark:text-white transition-all"
                                    placeholder="your.email@example.com"
                                />
                            </div>

                            <div>
                                <label htmlFor="subject" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    id="subject"
                                    name="subject"
                                    required
                                    value={formData.subject}
                                    onChange={handleChange}
                                    className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white dark:bg-slate-800 dark:text-white transition-all"
                                    placeholder="What is this about?"
                                />
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Message
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    required
                                    rows={6}
                                    value={formData.message}
                                    onChange={handleChange}
                                    className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white dark:bg-slate-800 dark:text-white transition-all resize-none"
                                    placeholder="Tell us more about your inquiry..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'sending'}
                                className="btn-touch-lg w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                            >
                                {status === 'sending' ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                        <span>Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-5 w-5" />
                                        <span>Send Message</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-8">
                        <div className="card-modern p-8">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Get in Touch</h2>
                            <div className="space-y-6">
                                <div className="flex items-start space-x-4">
                                    <div className="h-12 w-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Mail className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Email</h3>
                                        <a href="mailto:optimum-test@gmail.com" className="text-purple-600 dark:text-purple-400 hover:underline">
                                            optimum-test@gmail.com
                                        </a>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                            We'll respond within 24-48 hours
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl">
                            <h3 className="text-xl font-bold text-white mb-4">Quick Support</h3>
                            <p className="text-white mb-4">
                                For immediate assistance, check out our FAQ section or browse through our help documentation.
                            </p>
                            <div className="space-y-3">
                                <div className="flex items-center space-x-2 text-white">
                                    <CheckCircle className="h-5 w-5" />
                                    <span>Average response time: 24 hours</span>
                                </div>
                                <div className="flex items-center space-x-2 text-white">
                                    <CheckCircle className="h-5 w-5" />
                                    <span>Available Monday - Friday</span>
                                </div>
                                <div className="flex items-center space-x-2 text-white">
                                    <CheckCircle className="h-5 w-5" />
                                    <span>Dedicated support team</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactUs;
