import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Header() {
    const navigate = useNavigate();
    return (
        <div className="app-header" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <svg className="logo-svg" viewBox="0 0 300 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '220px', display: 'block', margin: '0 auto' }}>
                <defs>
                    <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#0B7A8F' }} />
                        <stop offset="100%" style={{ stopColor: '#6B5B73' }} />
                    </linearGradient>
                </defs>
                <rect x="55" y="5" width="50" height="50" rx="10" fill="url(#iconGradient)" />
                <text x="80" y="40" fontFamily="Arial Black, Arial, sans-serif" fontSize="22" fontWeight="900" fill="white" textAnchor="middle">BS</text>
                <line x1="62" y1="45" x2="98" y2="15" stroke="#D64F4F" strokeWidth="4" strokeLinecap="round" />
                <text x="115" y="30" fontFamily="Arial, sans-serif" fontSize="20" fontWeight="700" fill="#0B7A8F" letterSpacing="1">BIG SIS</text>
                <text x="115" y="48" fontFamily="Arial, sans-serif" fontSize="7" fill="#6B5B73" letterSpacing="1">CUTTING THROUGH THE BS</text>
            </svg>
            <nav>
                <Link to="/" className="nav-item">Diagnostic</Link>
                <Link to="/pdf" className="nav-item">Lecteur PDF</Link>
                <a href="#" className="nav-item">Routines</a>
            </nav>
        </div>
    );
}
