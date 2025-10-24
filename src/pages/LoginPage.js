import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import IntroFlowLayout from '../components/layout/IntroFlowLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useProjectFlow } from '../context/ProjectFlowContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { openWizard } = useProjectFlow();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

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
        // Navigate to selection page after successful login
        navigate('/selection');
      } else {
        setErrors({ general: result.error || 'Login failed' });
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    openWizard();
  };

  const handleOpenExisting = () => {
    navigate('/projects');
  };

  return (
    <IntroFlowLayout>
      <div className="login-container">
        <div className="brand-title">VALHALLA MEMORIAL</div>

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
        </form>

        <div className="selection-container">
          <Button 
            variant="primary"
            onClick={handleCreateNew}
            className="selection-button"
          >
            <div className="button-icon">
              <img src="/images/new_icon.png" alt="Create new" className="icon-image" />
            </div>
            <div className="button-text">Create New Memorial</div>
          </Button>

          <Button 
            variant="secondary"
            onClick={handleOpenExisting}
            className="selection-button"
          >
            <div className="button-icon">
              <img src="/images/existing_icon.png" alt="Open existing" className="icon-image" />
            </div>
            <div className="button-text">Open Existing Memorial</div>
          </Button>
        </div>
      </div>
    </IntroFlowLayout>
  );
};

export default LoginPage;
