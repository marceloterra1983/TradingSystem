import React, { useState, useEffect } from 'react';

const CookiesBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const cookiesAccepted = localStorage.getItem('cookies-accepted');
    if (!cookiesAccepted) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookies-accepted', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="cookies-banner">
      <div className="cookies-banner-text">
        This website uses cookies from Google to deliver and enhance the quality of its services and
        to analyze traffic.
      </div>
      <button className="cookies-banner-button" onClick={handleAccept}>
        I understand.
      </button>
    </div>
  );
};

export default CookiesBanner;




