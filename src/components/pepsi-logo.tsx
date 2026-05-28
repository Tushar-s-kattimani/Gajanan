
'use client';

export const PepsiBottleLogo = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(2px 4px 3px rgba(0,0,0,0.3))' }}>
        <defs>
            <linearGradient id="bottleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: '#cae4fb' }} />
                <stop offset="50%" style={{ stopColor: '#ffffff' }} />
                <stop offset="100%" style={{ stopColor: '#cae4fb' }} />
            </linearGradient>
            <linearGradient id="capGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#A0A0A0' }} />
                <stop offset="100%" style={{ stopColor: '#606060' }} />
            </linearGradient>
        </defs>
        
        {/* Bottle Body */}
        <path d="M35 15 L 65 15 C 70 20, 72 25, 70 35 L 70 90 L 30 90 L 30 35 C 28 25, 30 20, 35 15 Z" fill="url(#bottleGradient)" stroke="#5A7D9B" strokeWidth="2"/>
        
        {/* Bottle Cap */}
        <path d="M38 15 L 62 15 L 62 5 L 38 5 Z" fill="url(#capGradient)" stroke="#404040" strokeWidth="1"/>
        
        {/* Pepsi Logo */}
        <circle cx="50" cy="55" r="20" fill="#FFFFFF" stroke="#0039A6" strokeWidth="1.5"/>
        <path d="M30 55 A 20 20 0 0 1 70 55" fill="#D52B1E"/>
        <path d="M30 55 C 40 62, 60 48, 70 55 A 20 20 0 0 0 30 55 Z" fill="#0039A6"/>

        {/* Shine */}
        <path d="M38 20 C 42 40, 42 70, 38 90" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeLinecap="round"/>
    </svg>
);
