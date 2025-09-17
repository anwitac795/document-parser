'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Building2, 
  Info, 
  Users, 
  MoreHorizontal, 
  ChevronRight,
  Upload,
  Search,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  Github,
  Mail,
  Phone
} from 'lucide-react';
import Navbar from './navbar';

export default function Homepage() {
  const [darkMode, setDarkMode] = useState(false);
  const [isVisible, setIsVisible] = useState({});

  // Intersection observer for animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    const sections = document.querySelectorAll('.animate-on-scroll');
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: FileText,
      title: 'Document Parser',
      description: 'AI-powered document analysis that extracts key information from legal documents, contracts, and forms with precision and speed.',
      benefits: ['OCR Technology', 'Multi-format Support', 'Data Extraction']
    },
    {
      icon: Building2,
      title: 'Government Schemes',
      description: 'Comprehensive database of government schemes and programs. Find eligibility criteria and application processes tailored to your profile.',
      benefits: ['Eligibility Checker', 'Application Guidance', 'Real-time Updates']
    },
    {
      icon: Info,
      title: 'Legal Insights',
      description: 'Get detailed explanations of legal terms, requirements, and procedures. Simplifying complex legal language for everyone.',
      benefits: ['Plain English', 'Expert Analysis', 'Case Studies']
    },
    {
      icon: Users,
      title: 'Secure Access',
      description: 'Enterprise-grade security for your sensitive legal documents. Role-based access and encrypted storage for peace of mind.',
      benefits: ['End-to-end Encryption', 'Access Control', 'Audit Trails']
    }
  ];

  const stats = [
    { number: '50K+', label: 'Documents Processed' },
    { number: '1000+', label: 'Government Schemes' },
    { number: '99.9%', label: 'Accuracy Rate' },
    { number: '24/7', label: 'Support Available' }
  ];

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      darkMode 
        ? 'bg-[#0B2E33] text-white' 
        : 'bg-white text-[#0B2E33]'
    }`}>
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23${darkMode ? 'B8E3E9' : '4F7C82'}' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className={`text-5xl md:text-7xl font-bold mb-6 transition-all duration-1000 ${
              isVisible.hero ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-10'
            }`} id="hero">
              <span className={darkMode ? 'text-[#B8E3E9]' : 'text-[#4F7C82]'}>Legal</span>
              <span className={darkMode ? 'text-white' : 'text-[#0B2E33]'}>Flow</span>
            </h1>
            
            <p className={`text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed ${
              darkMode ? 'text-[#93B1B5]' : 'text-[#4F7C82]'
            }`}>
              Simplifying legal document processing and government scheme discovery with intelligent automation
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center space-x-2 ${
                darkMode 
                  ? 'bg-[#B8E3E9] text-[#0B2E33] hover:bg-[#93B1B5]' 
                  : 'bg-[#4F7C82] text-white hover:bg-[#0B2E33]'
              }`}>
                <Upload size={24} />
                <span>Parse Document</span>
                <ArrowRight size={20} />
              </button>
              
              <button className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 hover:scale-105 border-2 ${
                darkMode 
                  ? 'border-[#B8E3E9] text-[#B8E3E9] hover:bg-[#B8E3E9] hover:text-[#0B2E33]' 
                  : 'border-[#4F7C82] text-[#4F7C82] hover:bg-[#4F7C82] hover:text-white'
              }`}>
                Explore Schemes
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={`py-16 ${darkMode ? 'bg-[#4F7C82]/10' : 'bg-[#B8E3E9]/20'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className={`text-3xl md:text-4xl font-bold mb-2 ${
                  darkMode ? 'text-[#B8E3E9]' : 'text-[#4F7C82]'
                }`}>
                  {stat.number}
                </div>
                <div className={`text-sm md:text-base ${
                  darkMode ? 'text-[#93B1B5]' : 'text-[#4F7C82]'
                }`}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${
              darkMode ? 'text-white' : 'text-[#0B2E33]'
            }`}>
              Powerful Features
            </h2>
            <p className={`text-xl max-w-2xl mx-auto ${
              darkMode ? 'text-[#93B1B5]' : 'text-[#4F7C82]'
            }`}>
              Everything you need to streamline legal document processing and government scheme discovery
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`animate-on-scroll p-8 rounded-2xl transition-all duration-500 hover:scale-105 border ${
                    darkMode 
                      ? 'bg-[#4F7C82]/10 border-[#4F7C82]/20 hover:bg-[#4F7C82]/15' 
                      : 'bg-[#B8E3E9]/10 border-[#B8E3E9]/30 hover:bg-[#B8E3E9]/20'
                  } ${isVisible[`feature-${index}`] ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-10'}`}
                  id={`feature-${index}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${
                    darkMode ? 'bg-[#B8E3E9]/20' : 'bg-[#4F7C82]/20'
                  }`}>
                    <Icon size={28} className={darkMode ? 'text-[#B8E3E9]' : 'text-[#4F7C82]'} />
                  </div>
                  
                  <h3 className={`text-2xl font-bold mb-4 ${
                    darkMode ? 'text-white' : 'text-[#0B2E33]'
                  }`}>
                    {feature.title}
                  </h3>
                  
                  <p className={`text-lg mb-6 leading-relaxed ${
                    darkMode ? 'text-[#93B1B5]' : 'text-[#4F7C82]'
                  }`}>
                    {feature.description}
                  </p>

                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, i) => (
                      <li key={i} className={`flex items-center space-x-3 ${
                        darkMode ? 'text-[#B8E3E9]' : 'text-[#4F7C82]'
                      }`}>
                        <CheckCircle size={18} />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-20 ${darkMode ? 'bg-[#4F7C82]/5' : 'bg-[#B8E3E9]/10'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className={`animate-on-scroll ${
            isVisible.cta ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-10'
          }`} id="cta">
            <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${
              darkMode ? 'text-white' : 'text-[#0B2E33]'
            }`}>
              Ready to Get Started?
            </h2>
            
            <p className={`text-xl mb-8 ${
              darkMode ? 'text-[#93B1B5]' : 'text-[#4F7C82]'
            }`}>
              Join thousands of users who trust LegalFlow for their document processing needs
            </p>

            <button className={`px-10 py-5 rounded-xl font-semibold text-xl transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center space-x-3 mx-auto ${
              darkMode 
                ? 'bg-[#B8E3E9] text-[#0B2E33] hover:bg-[#93B1B5]' 
                : 'bg-[#4F7C82] text-white hover:bg-[#0B2E33]'
            }`}>
              <Zap size={24} />
              <span>Start Free Trial</span>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-16 border-t ${
        darkMode 
          ? 'bg-[#0B2E33] border-[#4F7C82]/20' 
          : 'bg-[#B8E3E9]/10 border-[#B8E3E9]/30'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className={`text-2xl font-bold mb-4 ${
                darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
              }`}>
                LegalFlow
              </h3>
              <p className={`text-lg mb-6 max-w-md ${
                darkMode ? 'text-[#93B1B5]' : 'text-[#4F7C82]'
              }`}>
                Revolutionizing legal document processing with intelligent automation and comprehensive government scheme discovery.
              </p>
              <div className="flex space-x-4">
                {[Github, Mail, Phone].map((Icon, index) => (
                  <a
                    key={index}
                    href="#"
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 ${
                      darkMode 
                        ? 'bg-[#4F7C82]/20 text-[#B8E3E9] hover:bg-[#4F7C82]/30' 
                        : 'bg-[#B8E3E9]/20 text-[#4F7C82] hover:bg-[#B8E3E9]/30'
                    }`}
                  >
                    <Icon size={20} />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className={`text-lg font-semibold mb-4 ${
                darkMode ? 'text-white' : 'text-[#0B2E33]'
              }`}>
                Quick Links
              </h4>
              <ul className="space-y-2">
                {['Document Parser', 'Government Schemes', 'About Us', 'Contact'].map((link) => (
                  <li key={link}>
                    <a href="#" className={`transition-colors hover:underline ${
                      darkMode ? 'text-[#93B1B5] hover:text-[#B8E3E9]' : 'text-[#4F7C82] hover:text-[#0B2E33]'
                    }`}>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className={`text-lg font-semibold mb-4 ${
                darkMode ? 'text-white' : 'text-[#0B2E33]'
              }`}>
                Legal
              </h4>
              <ul className="space-y-2">
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Data Protection'].map((link) => (
                  <li key={link}>
                    <a href="#" className={`transition-colors hover:underline ${
                      darkMode ? 'text-[#93B1B5] hover:text-[#B8E3E9]' : 'text-[#4F7C82] hover:text-[#0B2E33]'
                    }`}>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={`mt-12 pt-8 border-t text-center ${
            darkMode ? 'border-[#4F7C82]/20 text-[#93B1B5]' : 'border-[#B8E3E9]/30 text-[#4F7C82]'
          }`}>
            <p>&copy; 2025 LegalFlow. All rights reserved. Built with precision and care.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}