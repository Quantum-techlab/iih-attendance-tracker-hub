
import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">IIH</span>
              </div>
              <span className="font-semibold text-gray-900 text-lg">Attendance System</span>
            </div>
            <p className="text-gray-600 text-sm max-w-md">
              Streamline intern attendance tracking at Ilorin Innovation Hub with our modern, 
              efficient system designed for the future of work.
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
              Connect
            </h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://iih.ng" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
                >
                  Ilorin Innovation Hub
                </a>
              </li>
              <li>
                <a 
                  href="mailto:info@iih.ng"
                  className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
                >
                  Support
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-center text-gray-500 text-sm">
            © {currentYear} Ilorin Innovation Hub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
