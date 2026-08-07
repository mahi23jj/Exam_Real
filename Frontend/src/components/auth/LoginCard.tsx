import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import styles from '../../pages/Auth.module.css';

interface LoginCardProps {
  onToggle: () => void;
}

const LoginCard: React.FC<LoginCardProps> = ({ onToggle }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Validation states
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState('');
  
  // Form submission states
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });

  // Debounced Email Validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (email === '') {
        setEmailValid(null);
        setEmailError('');
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(email)) {
        setEmailValid(true);
        setEmailError('');
      } else {
        setEmailValid(false);
        setEmailError('Please enter a valid email address');
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setTouched({ email: true, password: true });
    
    if (!email) {
      setEmailValid(false);
      setEmailError('Please enter your email');
      return;
    }
    
    if (!password) {
      setFormError('Please enter your password');
      return;
    }
    
    if (emailValid === false) {
      return;
    }

    setLoading(true);
    
    // Simulate network request
    setTimeout(() => {
      setLoading(false);
      
      // Demo: Check if password is "password123" or meets requirements
      if (password === 'password123' || password === 'Password123!') {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          // Redirect to dashboard
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        // Check if email exists in our "database"
        if (email === 'test@example.com') {
          setFormError('Incorrect password. Please try again.');
        } else if (email === 'nonexistent@example.com') {
          setFormError('No account found with this email');
        } else {
          setFormError('No account found with this email');
        }
      }
    }, 1000);
  };

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.logoWrapper}>
          <span className={styles.logoIcon}>📚</span>
          <h1 className={styles.logoText}>ExamReal</h1>
        </div>
        <p className={styles.slogan}>"Your quiet study companion"</p>
      </div>

      <button className={styles.googleBtn} type="button" aria-label="Continue with Google">
        <svg className={styles.googleIcon} viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <div className={styles.divider}>or continue with email</div>

      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="login-email">Email</label>
          <div className={styles.inputWrapper}>
            <input
              id="login-email"
              type="email"
              className={`${styles.input} ${
                emailValid === true ? styles.valid : ''
              } ${
                emailValid === false && touched.email ? styles.invalid : ''
              }`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched({ ...touched, email: true })}
              autoComplete="email"
              aria-invalid={emailValid === false}
              aria-describedby={emailValid === false ? "email-error" : undefined}
            />
            {emailValid === true && <Check className={`${styles.inputIconRight} ${styles.iconSuccess}`} size={18} />}
            {emailValid === false && touched.email && <AlertCircle className={`${styles.inputIconRight} ${styles.iconError}`} size={18} />}
          </div>
          {emailValid === false && touched.email && (
            <span id="email-error" className={styles.errorMsg}>{emailError}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="login-password">Password</label>
          <div className={styles.inputWrapper}>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched({ ...touched, password: true })}
              autoComplete="current-password"
            />
            <button
              type="button"
              className={styles.inputIconRight}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button 
          type="button" 
          className={styles.forgotLink}
          onClick={() => alert('Password reset link sent to your email')}
        >
          Forgot password?
        </button>

        {formError && <span className={styles.formError}>{formError}</span>}

        <button 
          type="submit" 
          className={`${styles.submitBtn} ${success ? styles.success : ''}`}
          disabled={loading || success}
        >
          {loading ? <div className={styles.spinner}></div> : success ? <Check size={20} /> : 'Continue'}
        </button>

        <div className={styles.toggleText}>
          Don't have an account?{' '}
          <button type="button" className={styles.toggleLink} onClick={onToggle}>
            Sign Up
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginCard;