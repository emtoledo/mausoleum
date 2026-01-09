import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import IntroFlowLayout from '../components/layout/IntroFlowLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from '../context/LocationContext';
import { buildLocationPath } from '../utils/navigation';

const LoginPage = () => {
  const navigate = useNavigate();
  const { locationSlug } = useParams();
  const { login, isAuthenticated } = useAuth();
  const { locationConfig, currentLocation, loading: locationLoading } = useLocation();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Redirect to projects if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const projectsPath = buildLocationPath('/projects', locationSlug);
      navigate(projectsPath);
    }
  }, [isAuthenticated, navigate, locationSlug]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        // Navigate directly to AllProjectsView after successful login
        const projectsPath = buildLocationPath('/projects', locationSlug);
        navigate(projectsPath);
      } else {
        setErrors({ general: result.error || 'Login failed' });
        setLoading(false);
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred' });
      setLoading(false);
    }
  };


  // Use location config if available, otherwise fallback to default
  const brandTitle = locationConfig?.brandTitle || 'ARLINGTON MEMORIAL';


  return (
    <IntroFlowLayout>
      <div className="login-container">
        <div className="brand-title">{brandTitle}</div>

        <form className="login-form" onSubmit={handleSubmit}>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Email"
            label="Email"
            error={errors.email}
            required
            autoFocus
          />

          <Input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Password"
            label="Password"
            error={errors.password}
            required
          />

          {errors.general && (
            <div className="error-message">{errors.general}</div>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>

          <div className="signup-link">
            <p>Don't have an account? <Link to={buildLocationPath('/signup', locationSlug)}>Create New Account</Link></p>
          </div>
        </form>
      </div>
    </IntroFlowLayout>
  );
};

export default LoginPage;
