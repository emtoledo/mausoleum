import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import IntroFlowLayout from '../components/layout/IntroFlowLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

const SignUpPage = () => {
  const navigate = useNavigate();
  const { signUp, isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Redirect to projects if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/projects', { replace: true });
    }
  }, [isAuthenticated]); // Remove navigate from dependencies - it's stable

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
    
    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = 'Name is required';
    }
    
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
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      const result = await signUp(formData.email, formData.password, formData.name);
      
      if (result.success) {
        // Navigate directly to AllProjectsView after successful sign-up
        navigate('/projects');
      } else {
        setErrors({ general: result.error || 'Sign up failed' });
        setLoading(false);
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred' });
      setLoading(false);
    }
  };

  return (
    <IntroFlowLayout>
      <div className="login-container">
        <div className="brand-title">VALHALLA MEMORIAL</div>

        <form className="login-form" onSubmit={handleSubmit}>
          <Input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Full Name"
            label="Full Name"
            error={errors.name}
            required
            autoFocus
          />

          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Email"
            label="Email"
            error={errors.email}
            required
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

          <Input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder="Confirm Password"
            label="Confirm Password"
            error={errors.confirmPassword}
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
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>

          <div className="signup-link">
            <p>Already have an account? <Link to="/login">Login</Link></p>
          </div>
        </form>
      </div>
    </IntroFlowLayout>
  );
};

export default SignUpPage;

