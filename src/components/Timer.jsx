import React, { useState, useEffect, useRef } from 'react';

export default function Timer({ durationMinutes, onExpire }) {
  const totalSeconds = Math.max(0, Math.floor(durationMinutes * 60));
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (onExpireRef.current) {
        onExpireRef.current();
      }
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onExpireRef.current) {
            onExpireRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [totalSeconds]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isUrgent = secondsLeft <= 60; // Under 1 minute
  const isWarning = secondsLeft <= 180 && !isUrgent; // Under 3 minutes

  const formatNumber = (num) => String(num).padStart(2, '0');

  return (
    <div className={`quiz-timer ${isUrgent ? 'timer-urgent' : isWarning ? 'timer-warning' : 'timer-normal'}`}>
      <span className="timer-icon">⏱</span>
      <div className="timer-text">
        <span className="timer-label">Time Remaining:</span>
        <span className="timer-digits">
          {formatNumber(minutes)}:{formatNumber(seconds)}
        </span>
      </div>
    </div>
  );
}
