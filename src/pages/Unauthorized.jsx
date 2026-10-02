import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Unauthorized() {
  const { isFaculty } = useAuth();

  return (
    <div className="centered-page">
      <div className="status-card">
        <div className="status-icon">🚫</div>
        <h2>Access Restricted</h2>
        <p>
          You do not have the required permissions to view this page. Access is controlled via Cloud Firestore Security Rules based on your designated user role.
        </p>
        <div className="card-actions">
          <Link to={isFaculty ? "/faculty" : "/"} className="btn btn-primary">
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
