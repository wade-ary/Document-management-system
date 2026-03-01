"use client";
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, User, LogOut, Settings, Globe } from 'lucide-react';
import { useClerk, UserButton, useUser } from "@clerk/nextjs";

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        google: any;
    }
}

const UserMenuDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [fontSize, setFontSize] = useState<number>(16);
    const [isHighContrast, setIsHighContrast] = useState<boolean>(false);
    const [isColorBlindMode, setIsColorBlindMode] = useState<boolean>(false);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const { signOut } = useClerk();
    const { user, isLoaded } = useUser();

    const languages = [
        { code: 'en', name: 'English', native: 'English' },
        { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
        { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
        { code: 'te', name: 'Telugu', native: 'తెలుగు' },
        { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
        { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
        { code: 'mr', name: 'Marathi', native: 'मराठी' },
        { code: 'bn', name: 'Bengali', native: 'বাংলা' },
        { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
        { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
        { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
        { code: 'as', name: 'Assamese', native: 'অসমীয়া' },
        { code: 'ur', name: 'Urdu', native: 'اردو' },
    ];

    const toggleDropdown = () => {
        setIsOpen((prev) => !prev);
    };

    const increaseFontSize = () => {
        setFontSize((prev) => Math.min(prev + 2, 24));
    };

    const decreaseFontSize = () => {
        setFontSize((prev) => Math.max(prev - 2, 12));
    };

    const toggleHighContrast = () => {
        const newValue = !isHighContrast;
        setIsHighContrast(newValue);
        localStorage.setItem('highContrast', JSON.stringify(newValue));
        
        // Apply/remove the class immediately
        if (newValue) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }
    };

    const toggleColorBlindMode = () => {
        const newValue = !isColorBlindMode;
        setIsColorBlindMode(newValue);
        localStorage.setItem('colorBlindMode', JSON.stringify(newValue));
        
        // Apply/remove the class immediately
        if (newValue) {
            document.body.classList.add('color-blind');
        } else {
            document.body.classList.remove('color-blind');
        }
    };

    const handleLanguageChange = (langCode: string) => {
        setSelectedLanguage(langCode);
        localStorage.setItem('selectedLanguage', langCode);
        
        // Trigger Google Translate
        if (typeof window !== 'undefined' && window.google && window.google.translate) {
            const googleTranslateElement = document.querySelector('.goog-te-combo') as HTMLSelectElement;
            if (googleTranslateElement) {
                googleTranslateElement.value = langCode;
                googleTranslateElement.dispatchEvent(new Event('change'));
            }
        }
    };

    // Load saved preferences on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Load font size
            const savedFontSize = localStorage.getItem('fontSize');
            if (savedFontSize) {
                const size = parseInt(savedFontSize);
                setFontSize(size);
                document.documentElement.style.fontSize = `${size}px`;
            }

            // Load high contrast mode
            const savedHighContrast = localStorage.getItem('highContrast');
            if (savedHighContrast) {
                const isEnabled = JSON.parse(savedHighContrast);
                setIsHighContrast(isEnabled);
                if (isEnabled) {
                    document.body.classList.add('high-contrast');
                }
            }

            // Load color blind mode
            const savedColorBlindMode = localStorage.getItem('colorBlindMode');
            if (savedColorBlindMode) {
                const isEnabled = JSON.parse(savedColorBlindMode);
                setIsColorBlindMode(isEnabled);
                if (isEnabled) {
                    document.body.classList.add('color-blind');
                }
            }

            // Load language preference
            const savedLanguage = localStorage.getItem('selectedLanguage');
            if (savedLanguage) {
                setSelectedLanguage(savedLanguage);
            }

            setIsInitialized(true);
        }
    }, []);

    useEffect(() => {
        if (isInitialized) {
            document.documentElement.style.fontSize = `${fontSize}px`;
            localStorage.setItem('fontSize', fontSize.toString());
        }
    }, [fontSize, isInitialized]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={toggleDropdown}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors duration-200 shadow-lg"
                aria-label="User menu"
                aria-expanded={isOpen}
            >
                <UserButton 
                    appearance={{
                        elements: {
                            avatarBox: "w-8 h-8 border-2 border-white",
                        }
                    }}
                />
                {isLoaded && user && (
                    <div className="flex flex-col leading-tight text-left">
                        <span className="text-sm font-semibold line-clamp-1">
                            {user.username}
                        </span>
                        <span className="text-[0.7rem] -mt-[2px] text-blue-100 capitalize">
                            {user.unsafeMetadata.accountType as string}
                        </span>
                    </div>
                )}
                <ChevronDown className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} size={18} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                    {/* User Info Section */}
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                            <UserButton 
                                appearance={{
                                    elements: {
                                        avatarBox: "w-12 h-12 border-2 border-blue-600",
                                    }
                                }}
                            />
                            {isLoaded && user && (
                                <div className="flex flex-col">
                                    <p className="text-sm font-semibold text-gray-800">
                                        {user.username}
                                    </p>
                                    <p className="text-xs text-gray-600 capitalize">
                                        {user.unsafeMetadata.accountType as string}
                                    </p>
                                    {user.primaryEmailAddress && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {user.primaryEmailAddress.emailAddress}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Language Selection Section */}
                    <div className="border-b border-gray-200">
                        <div className="px-4 py-2 bg-gray-50 flex items-center">
                            <Globe className="w-4 h-4 mr-2 text-gray-600" />
                            <span className="text-sm font-semibold text-gray-700">Language</span>
                        </div>
                        <div className="px-4 py-3">
                            <select
                                value={selectedLanguage}
                                onChange={(e) => handleLanguageChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                aria-label="Select language"
                            >
                                {languages.map((lang) => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.name} ({lang.native})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Accessibility Settings Section */}
                    <div className="border-b border-gray-200">
                        <div className="px-4 py-2 bg-gray-50 flex items-center">
                            <Settings className="w-4 h-4 mr-2 text-gray-600" />
                            <span className="text-sm font-semibold text-gray-700">Accessibility Settings</span>
                        </div>
                        <button
                            onClick={increaseFontSize}
                            className="flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-blue-50 w-full text-left transition-colors duration-200 text-sm"
                            aria-label="Increase font size"
                            disabled={fontSize >= 24}
                        >
                            <span>Increase Font Size (A+)</span>
                            <span className="text-xs text-gray-500">{fontSize}px</span>
                        </button>
                        <button
                            onClick={decreaseFontSize}
                            className="flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-blue-50 w-full text-left transition-colors duration-200 text-sm"
                            aria-label="Decrease font size"
                            disabled={fontSize <= 12}
                        >
                            <span>Decrease Font Size (A-)</span>
                            <span className="text-xs text-gray-500">{fontSize}px</span>
                        </button>
                        <button
                            onClick={toggleHighContrast}
                            className={`flex items-center justify-between px-4 py-3 w-full text-left transition-colors duration-200 text-sm font-medium ${
                                isHighContrast 
                                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                                    : 'text-gray-700 hover:bg-blue-50'
                            }`}
                            aria-label="Toggle high contrast mode"
                            aria-pressed={isHighContrast}
                        >
                            <span>{isHighContrast ? '✓ High Contrast Active' : 'Enable High Contrast'}</span>
                            {isHighContrast && (
                                <span className="inline-flex items-center justify-center w-6 h-6 text-blue-600 bg-white rounded-full">
                                    ✓
                                </span>
                            )}
                        </button>
                        <button
                            onClick={toggleColorBlindMode}
                            className={`flex items-center justify-between px-4 py-3 w-full text-left transition-colors duration-200 text-sm font-medium ${
                                isColorBlindMode 
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                    : 'text-gray-700 hover:bg-blue-50'
                            }`}
                            aria-label="Toggle color blind friendly mode"
                            aria-pressed={isColorBlindMode}
                        >
                            <span>{isColorBlindMode ? '✓ Color Blind Mode Active' : 'Color Blind Mode'}</span>
                            {isColorBlindMode && (
                                <span className="inline-flex items-center justify-center w-6 h-6 text-green-600 bg-white rounded-full">
                                    ✓
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Log Out Section */}
                    <button
                        onClick={() => {
                            signOut();
                            setIsOpen(false);
                        }}
                        className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-red-50 transition-colors duration-200 font-medium"
                        aria-label="Log out of EduData Insight"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Log Out
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserMenuDropdown;
