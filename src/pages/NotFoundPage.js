import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

const NotFoundPage = () => {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <div className="not-found-actions">
          <Link to="/projects">
            <Button variant="primary">Go to Projects</Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary">Go to Login</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
