'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon, Menu, X, FileText, Users, Info, Building2, MoreHorizontal } from 'lucide-react';

export default function Navbar({ darkMode, setDarkMode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Document Parser', icon: FileText, href: '/document-analyser' },
    { name: 'Govt Schemes', icon: Building2, href: '/schemes' },
    { name: 'About', icon: Info, href: '/about' },
    { name: 'Login', icon: Users, href: '/login' },
    { name: 'More', icon: MoreHorizontal, href: '/more' }
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? darkMode 
          ? 'bg-[#0B2E33]/95 backdrop-blur-md shadow-lg' 
          : 'bg-white/95 backdrop-blur-md shadow-lg'
        : darkMode
          ? 'bg-transparent'
          : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className={`text-2xl font-bold tracking-tight ${
              darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
            }`}>
              LegalFlow
            </h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:scale-105 ${
                      darkMode 
                        ? 'text-[#B8E3E9] hover:text-white hover:bg-[#4F7C82]/20' 
                        : 'text-[#4F7C82] hover:text-[#0B2E33] hover:bg-[#B8E3E9]/20'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Theme toggle */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                darkMode 
                  ? 'bg-[#4F7C82]/20 text-[#B8E3E9] hover:bg-[#4F7C82]/30' 
                  : 'bg-[#B8E3E9]/20 text-[#4F7C82] hover:bg-[#B8E3E9]/30'
              }`}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-2 rounded-md transition-colors ${
                  darkMode 
                    ? 'text-[#B8E3E9] hover:bg-[#4F7C82]/20' 
                    : 'text-[#4F7C82] hover:bg-[#B8E3E9]/20'
                }`}
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className={`md:hidden transition-all duration-300 ${
            darkMode ? 'bg-[#0B2E33]/95' : 'bg-white/95'
          } backdrop-blur-md rounded-lg mt-2 p-4 shadow-lg`}>
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium transition-colors ${
                      darkMode 
                        ? 'text-[#B8E3E9] hover:bg-[#4F7C82]/20' 
                        : 'text-[#4F7C82] hover:bg-[#B8E3E9]/20'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}