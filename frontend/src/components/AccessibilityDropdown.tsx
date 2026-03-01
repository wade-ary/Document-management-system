"use client";
import { ChevronDown } from 'lucide-react';
import React, { useState, useEffect } from 'react';

const AccessibilityDropdown: React.FC = () => {
    const [fontSize, setFontSize] = useState<number>(16);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isHighContrast, setIsHighContrast] = useState<boolean>(false);
    const [isColorBlindMode, setIsColorBlindMode] = useState<boolean>(false);

    const increaseFontSize = () => {
        setFontSize((prev) => Math.min(prev + 2, 24));
    };

    const decreaseFontSize = () => {
        setFontSize((prev) => Math.max(prev - 2, 12));
    };

    const toggleHighContrast = () => {
        setIsHighContrast((prev) => !prev);
    };

    const toggleColorBlindMode = () => {
        setIsColorBlindMode((prev) => !prev);
    };

    const toggleDropdown = () => {
        setIsOpen((prev) => !prev);
    };

    useEffect(() => {
        document.documentElement.style.fontSize = `${fontSize}px`;
    }, [fontSize]);

    useEffect(() => {
        document.body.classList.toggle('high-contrast', isHighContrast);
    }, [isHighContrast]);

    useEffect(() => {
        document.body.classList.toggle('color-blind', isColorBlindMode);
    }, [isColorBlindMode]);

    return (
        <div className="">
            <button
                onClick={toggleDropdown}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors duration-200 shadow-lg"
                aria-label="Accessibility "
            >
                Accessibility 
                <ChevronDown className="inline-block ml-1" size={fontSize} />
            </button>
            {isOpen && (
                <div className="absolute right-0  mt-2 w-64 bg-white border border-blue-200 rounded-lg shadow-xl z-10 overflow-hidden">
                    <div className="p-2 bg-blue-100 text-blue-800 font-semibold">
                        Accessibility Settings
                    </div>
                    <button
                        onClick={increaseFontSize}
                        className="block px-4 py-3 text-blue-800 hover:bg-blue-50 w-full text-left transition-colors duration-200"
                        aria-label="Increase font size"
                    >
                        Increase Font Size (A+)
                    </button>
                    <button
                        onClick={decreaseFontSize}
                        className="block px-4 py-3 text-blue-800 hover:bg-blue-50 w-full text-left transition-colors duration-200"
                        aria-label="Decrease font size"
                    >
                        Decrease Font Size (A-)
                    </button>
                    <button
                        onClick={toggleHighContrast}
                        className="block px-4 py-3 text-blue-800 hover:bg-blue-50 w-full text-left transition-colors duration-200"
                        aria-label="Toggle high contrast"
                    >
                        {isHighContrast ? 'Disable High Contrast' : 'Enable High Contrast'}
                    </button>
                    <button
                        onClick={toggleColorBlindMode}
                        className="block px-4 py-3 text-blue-800 hover:bg-blue-50 w-full text-left transition-colors duration-200"
                        aria-label="Toggle color blind mode"
                    >
                        {isColorBlindMode ? 'Normal Mode' : 'Color Blind Mode'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default AccessibilityDropdown;