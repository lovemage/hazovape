import React, { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  onComplete?: () => void;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 50,
  delay = 0,
  className = '',
  onComplete
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (delay > 0) {
      const delayTimeout = setTimeout(() => {
        setIsTyping(true);
      }, delay);
      return () => clearTimeout(delayTimeout);
    } else {
      setIsTyping(true);
    }
  }, [delay]);

  useEffect(() => {
    if (!isTyping || currentIndex >= text.length) {
      if (currentIndex >= text.length && onComplete) {
        onComplete();
      }
      return;
    }

    const timeout = setTimeout(() => {
      setDisplayedText(text.slice(0, currentIndex + 1));
      setCurrentIndex(currentIndex + 1);
    }, speed);

    return () => clearTimeout(timeout);
  }, [currentIndex, text, speed, isTyping, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {isTyping && currentIndex < text.length && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  );
};

interface AnnouncementCarouselProps {
  announcements: Array<{ title: string; content: string }>;
  className?: string;
}

export const AnnouncementCarousel: React.FC<AnnouncementCarouselProps> = ({
  announcements,
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const handleComplete = () => {
    setIsComplete(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
      setIsComplete(false);
    }, 2000); // 停留2秒後切換到下一條
  };

  if (announcements.length === 0) return null;

  const currentAnnouncement = announcements[currentIndex];

  return (
    <div className={`transition-opacity duration-500 ${className}`}>
      <TypewriterText
        key={`${currentIndex}-${currentAnnouncement.content}`}
        text={currentAnnouncement.content}
        speed={80}
        onComplete={handleComplete}
        className="text-gray-700"
      />
    </div>
  );
};
