'use client';

import { useState, useEffect } from 'react';
import { 
  User, 
  Camera, 
  CreditCard, 
  IdCard, 
  GraduationCap, 
  Building2, 
  DollarSign,
  Save,
  LogOut,
  Edit3,
  CheckCircle,
  AlertCircle,
  Loader2,
  Upload
} from 'lucide-react';
import { signOut, getAuth } from 'firebase/auth';
import { auth } from '../../../firebase-config'; // Import the initialized auth instance
import Navbar from '@/components/navbar'; // Adjust path as needed

export default function Dashboard() {
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    aadharNumber: '',
    panNumber: '',
    institution: '',
    workplace: '',
    annualIncome: '',
    studentStatus: 'no', // 'yes' or 'no'
    employmentStatus: 'unemployed' // 'employed', 'unemployed', 'self-employed', 'student'
  });

  const [errors, setErrors] = useState({});

  // Income ranges
  const incomeRanges = [
    { value: 'below-1lakh', label: 'Below ₹1 Lakh' },
    { value: '1-3lakh', label: '₹1 - 3 Lakhs' },
    { value: '3-5lakh', label: '₹3 - 5 Lakhs' },
    { value: '5-10lakh', label: '₹5 - 10 Lakhs' },
    { value: '10-20lakh', label: '₹10 - 20 Lakhs' },
    { value: '20-50lakh', label: '₹20 - 50 Lakhs' },
    { value: 'above-50lakh', label: 'Above ₹50 Lakhs' }
  ];

  const employmentOptions = [
    { value: 'employed', label: 'Employed' },
    { value: 'unemployed', label: 'Unemployed' },
    { value: 'self-employed', label: 'Self Employed' },
    { value: 'student', label: 'Student' }
  ];

  useEffect(() => {
    // Check authentication state
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        await fetchUserProfile(user.uid);
      } else {
        // Redirect to login if not authenticated
        window.location.href = '/login';
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserProfile = async (uid) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${uid}`);
      if (response.ok) {
        const userData = await response.json();
        setFormData({
          aadharNumber: userData.aadharNumber || '',
          panNumber: userData.panNumber || '',
          institution: userData.institution || '',
          workplace: userData.workplace || '',
          annualIncome: userData.annualIncome || '',
          studentStatus: userData.studentStatus || 'no',
          employmentStatus: userData.employmentStatus || 'unemployed'
        });
        if (userData.profileImage) {
          setImagePreview(userData.profileImage);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setMessage({ type: 'error', text: 'Failed to load profile data' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setMessage({ type: 'error', text: 'Image size should be less than 5MB' });
        return;
      }
      
      setProfileImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Aadhar validation (12 digits)
    if (formData.aadharNumber && !/^\d{12}$/.test(formData.aadharNumber)) {
      newErrors.aadharNumber = 'Aadhar number must be 12 digits';
    }
    
    // PAN validation (format: ABCDE1234F)
    if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(formData.panNumber)) {
      newErrors.panNumber = 'Invalid PAN format (e.g., ABCDE1234F)';
    }
    
    // Student-specific validation
    if (formData.studentStatus === 'yes' && !formData.institution.trim()) {
      newErrors.institution = 'Institution name is required for students';
    }
    
    // Employment-specific validation
    if (formData.employmentStatus === 'employed' && !formData.workplace.trim()) {
      newErrors.workplace = 'Workplace name is required for employed individuals';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadImageToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);
    
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to upload image');
    }
    
    const data = await response.json();
    return data.secure_url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      let imageUrl = imagePreview;
      
      // Upload image if new one selected
      if (profileImage) {
        imageUrl = await uploadImageToCloudinary(profileImage);
      }
      
      const userData = {
        ...formData,
        profileImage: imageUrl,
        updatedAt: new Date().toISOString(),
      };
      
      const response = await fetch(`/api/users/${user.uid}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
      setProfileImage(null);
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode ? 'bg-[#0B2E33]' : 'bg-gray-50'
      }`}>
        <div className="flex items-center space-x-2">
          <Loader2 className={`animate-spin h-8 w-8 ${
            darkMode ? 'text-[#B8E3E9]' : 'text-[#4F7C82]'
          }`} />
          <span className={`text-lg ${
            darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
          }`}>
            Loading your dashboard...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-[#0B2E33]' : 'bg-gray-50'
    }`}>
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
      
      <div className="pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path fill="#1E8DD0" d="M60.9,-0.3C60.9,25.5,30.4,51,1.2,51C-27.9,51,-55.9,25.5,-55.9,-0.3C-55.9,-26.1,-27.9,-52.1,1.2,-52.1C30.4,-52.1,60.9,-26.1,60.9,-0.3Z" transform="translate(100 100)" />
      </svg>
      
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-3xl font-bold ${
                  darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
                }`}>
                  Dashboard
                </h1>
                <p className={`mt-2 ${
                  darkMode ? 'text-[#93B1B5]' : 'text-gray-600'
                }`}>
                  Welcome back, {user?.displayName || user?.email}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                      darkMode
                        ? 'bg-[#4F7C82] hover:bg-[#4F7C82]/90 text-white'
                        : 'bg-[#0B2E33] hover:bg-[#0B2E33]/90 text-white'
                    }`}
                  >
                    <Edit3 size={18} />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setProfileImage(null);
                      setErrors({});
                    }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all duration-200 hover:scale-105 ${
                      darkMode
                        ? 'border-[#4F7C82] text-[#B8E3E9] hover:bg-[#4F7C82]/10'
                        : 'border-gray-300 text-[#0B2E33] hover:bg-gray-50'
                    }`}
                  >
                    <span>Cancel</span>
                  </button>
                )}
                
                <button
                  onClick={handleSignOut}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                    darkMode
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg border flex items-center space-x-2 ${
              message.type === 'success'
                ? darkMode
                  ? 'bg-green-900/20 border-green-700/30 text-green-300'
                  : 'bg-green-50 border-green-200 text-green-800'
                : darkMode
                  ? 'bg-red-900/20 border-red-700/30 text-red-300'
                  : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          {/* Profile Form */}
          <div className={`${
            darkMode ? 'bg-[#0B2E33]/80' : 'bg-white'
          } backdrop-blur-sm rounded-2xl shadow-xl p-8 border ${
            darkMode ? 'border-[#4F7C82]/20' : 'border-gray-200'
          }`}>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Profile Picture Section */}
              <div className="text-center">
                <h3 className={`text-xl font-semibold mb-6 ${
                  darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
                }`}>
                  Profile Picture
                </h3>
                
                <div className="relative inline-block">
                  <div className={`w-32 h-32 rounded-full overflow-hidden border-4 ${
                    darkMode ? 'border-[#4F7C82]' : 'border-gray-200'
                  } ${imagePreview ? '' : 'bg-gray-100 dark:bg-[#4F7C82]/20'}`}>
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className={`w-16 h-16 ${
                          darkMode ? 'text-[#93B1B5]' : 'text-gray-400'
                        }`} />
                      </div>
                    )}
                  </div>
                  
                  {isEditing && (
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/60 transition-colors">
                      <label htmlFor="profile-image" className="cursor-pointer">
                        <Camera className="w-8 h-8 text-white" />
                        <input
                          id="profile-image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
                
                {isEditing && (
                  <p className={`mt-2 text-sm ${
                    darkMode ? 'text-[#93B1B5]' : 'text-gray-600'
                  }`}>
                    Click to upload a new profile picture (Max 5MB)
                  </p>
                )}
              </div>

              {/* Personal Information */}
              <div>
                <h3 className={`text-xl font-semibold mb-6 ${
                  darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
                }`}>
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Aadhar Number */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
                    }`}>
                      Aadhar Card Number
                    </label>
                    <div className="relative">
                      <IdCard className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                        darkMode ? 'text-[#93B1B5]' : 'text-gray-400'
                      }`} />
                      <input
                        type="text"
                        name="aadharNumber"
                        value={formData.aadharNumber}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        maxLength={12}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-all duration-200 ${
                          darkMode
                            ? 'bg-[#0B2E33] border-[#4F7C82] text-[#B8E3E9] focus:border-[#B8E3E9] focus:ring-[#B8E3E9]/20'
                            : 'bg-white border-gray-300 text-[#0B2E33] focus:border-[#4F7C82] focus:ring-[#4F7C82]/20'
                        } ${!isEditing ? 'cursor-not-allowed opacity-60' : 'focus:ring-2 focus:ring-offset-0'} ${
                          errors.aadharNumber ? 'border-red-500' : ''
                        }`}
                        placeholder="Enter 12-digit Aadhar number"
                      />
                    </div>
                    {errors.aadharNumber && (
                      <p className="mt-1 text-sm text-red-500">{errors.aadharNumber}</p>
                    )}
                  </div>

                  {/* PAN Number */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
                    }`}>
                      PAN Card Number
                    </label>
                    <div className="relative">
                      <CreditCard className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                        darkMode ? 'text-[#93B1B5]' : 'text-gray-400'
                      }`} />
                      <input
                        type="text"
                        name="panNumber"
                        value={formData.panNumber}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        maxLength={10}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-all duration-200 uppercase ${
                          darkMode
                            ? 'bg-[#0B2E33] border-[#4F7C82] text-[#B8E3E9] focus:border-[#B8E3E9] focus:ring-[#B8E3E9]/20'
                            : 'bg-white border-gray-300 text-[#0B2E33] focus:border-[#4F7C82] focus:ring-[#4F7C82]/20'
                        } ${!isEditing ? 'cursor-not-allowed opacity-60' : 'focus:ring-2 focus:ring-offset-0'} ${
                          errors.panNumber ? 'border-red-500' : ''
                        }`}
                        placeholder="ABCDE1234F"
                      />
                    </div>
                    {errors.panNumber && (
                      <p className="mt-1 text-sm text-red-500">{errors.panNumber}</p>
                    )}
                  </div>

                  {/* Employment Status */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
                    }`}>
                      Employment Status
                    </label>
                    <div className="relative">
                      <Building2 className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                        darkMode ? 'text-[#93B1B5]' : 'text-gray-400'
                      }`} />
                      <select
                        name="employmentStatus"
                        value={formData.employmentStatus}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-all duration-200 ${
                          darkMode
                            ? 'bg-[#0B2E33] border-[#4F7C82] text-[#B8E3E9] focus:border-[#B8E3E9] focus:ring-[#B8E3E9]/20'
                            : 'bg-white border-gray-300 text-[#0B2E33] focus:border-[#4F7C82] focus:ring-[#4F7C82]/20'
                        } ${!isEditing ? 'cursor-not-allowed opacity-60' : 'focus:ring-2 focus:ring-offset-0'}`}
                      >
                        {employmentOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Annual Income */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
                    }`}>
                      Annual Income Range
                    </label>
                    <div className="relative">
                      <DollarSign className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                        darkMode ? 'text-[#93B1B5]' : 'text-gray-400'
                      }`} />
                      <select
                        name="annualIncome"
                        value={formData.annualIncome}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-all duration-200 ${
                          darkMode
                            ? 'bg-[#0B2E33] border-[#4F7C82] text-[#B8E3E9] focus:border-[#B8E3E9] focus:ring-[#B8E3E9]/20'
                            : 'bg-white border-gray-300 text-[#0B2E33] focus:border-[#4F7C82] focus:ring-[#4F7C82]/20'
                        } ${!isEditing ? 'cursor-not-allowed opacity-60' : 'focus:ring-2 focus:ring-offset-0'}`}
                      >
                        <option value="">Select income range</option>
                        {incomeRanges.map(range => (
                          <option key={range.value} value={range.value}>
                            {range.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Educational/Professional Information */}
              <div>
                <h3 className={`text-xl font-semibold mb-6 ${
                  darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
                }`}>
                  Educational & Professional Details
                </h3>
                
                <div className="space-y-6">
                  
                  {/* Student Status */}
                  <div>
                    <label className={`block text-sm font-medium mb-3 ${
                      darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
                    }`}>
                      Are you currently a student?
                    </label>
                    <div className="flex space-x-4">
                      {['yes', 'no'].map(option => (
                        <label key={option} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="studentStatus"
                            value={option}
                            checked={formData.studentStatus === option}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            className={`h-4 w-4 ${
                              darkMode ? 'text-[#4F7C82]' : 'text-[#0B2E33]'
                            } focus:ring-offset-0 focus:ring-2 ${
                              darkMode ? 'focus:ring-[#B8E3E9]' : 'focus:ring-[#4F7C82]'
                            }`}
                          />
                          <span className={`text-sm ${
                            darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
                          } ${!isEditing ? 'opacity-60' : ''}`}>
                            {option === 'yes' ? 'Yes' : 'No'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Institution (if student) */}
                  {formData.studentStatus === 'yes' && (
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
                      }`}>
                        College/School Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <GraduationCap className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                          darkMode ? 'text-[#93B1B5]' : 'text-gray-400'
                        }`} />
                        <input
                          type="text"
                          name="institution"
                          value={formData.institution}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-all duration-200 ${
                            darkMode
                              ? 'bg-[#0B2E33] border-[#4F7C82] text-[#B8E3E9] focus:border-[#B8E3E9] focus:ring-[#B8E3E9]/20'
                              : 'bg-white border-gray-300 text-[#0B2E33] focus:border-[#4F7C82] focus:ring-[#4F7C82]/20'
                          } ${!isEditing ? 'cursor-not-allowed opacity-60' : 'focus:ring-2 focus:ring-offset-0'} ${
                            errors.institution ? 'border-red-500' : ''
                          }`}
                          placeholder="Enter your college or school name"
                        />
                      </div>
                      {errors.institution && (
                        <p className="mt-1 text-sm text-red-500">{errors.institution}</p>
                      )}
                    </div>
                  )}

                  {/* Workplace (if employed) */}
                  {formData.employmentStatus === 'employed' && (
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
                      }`}>
                        Workplace Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                          darkMode ? 'text-[#93B1B5]' : 'text-gray-400'
                        }`} />
                        <input
                          type="text"
                          name="workplace"
                          value={formData.workplace}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-all duration-200 ${
                            darkMode
                              ? 'bg-[#0B2E33] border-[#4F7C82] text-[#B8E3E9] focus:border-[#B8E3E9] focus:ring-[#B8E3E9]/20'
                              : 'bg-white border-gray-300 text-[#0B2E33] focus:border-[#4F7C82] focus:ring-[#4F7C82]/20'
                          } ${!isEditing ? 'cursor-not-allowed opacity-60' : 'focus:ring-2 focus:ring-offset-0'} ${
                            errors.workplace ? 'border-red-500' : ''
                          }`}
                          placeholder="Enter your workplace name"
                        />
                      </div>
                      {errors.workplace && (
                        <p className="mt-1 text-sm text-red-500">{errors.workplace}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Save Button */}
              {isEditing && (
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                      darkMode
                        ? 'bg-[#4F7C82] hover:bg-[#4F7C82]/90 text-white'
                        : 'bg-[#0B2E33] hover:bg-[#0B2E33]/90 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}