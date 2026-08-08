import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import styles from '../../pages/Auth.module.css';
import { useAuth } from '../../context/AuthContext';


interface SignUpCardProps {
  onToggle: () => void;
}

const SignUpCard: React.FC<SignUpCardProps> = ({ onToggle }) => {
  const { signUp, loginWithGoogle } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirm: false,
  });

  const [nameValid, setNameValid] = useState<boolean | null>(null);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState('');
  const [pwFocused, setPwFocused] = useState(false);
  const [pwReqs, setPwReqs] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
  });
  const [matchValid, setMatchValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // ── Error parser ────────────────────────────────────────────────────────────
  const parseAuthError = (err: unknown): string => {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('user_exists') || message.includes('already registered') || message.includes('already exists')) {
      return 'This email is already registered. Please log in.';
    }
    if (message.includes('Popup closed') || message.includes('popup_closed')) {
      return 'Sign up was cancelled. Please try again.';
    }
    if (message.includes('Network') || message.includes('fetch')) {
      return 'Network error. Please check your connection.';
    }
    if (message.includes('Backend sync failed')) {
      return 'Account created but profile sync failed. Please try logging in.';
    }
    return 'Sign up failed. Please try again.';
  };


  const [showExtraFields,setShowExtraFields] = useState(false);

useEffect(()=>{

 const timer=setTimeout(()=>{

   setShowExtraFields(true);

 },350);


 return ()=>clearTimeout(timer);

},[]);


  useEffect(() => {
    if (fullName === '') {
      setNameValid(null);
      return;
    }

    setNameValid(fullName.trim().length >= 2);
  }, [fullName]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
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

    return () => window.clearTimeout(timer);
  }, [email]);

  useEffect(() => {
    setPwReqs({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    });
  }, [password]);

  useEffect(() => {
    if (confirmPassword === '') {
      setMatchValid(null);
      return;
    }

    setMatchValid(password === confirmPassword);
  }, [password, confirmPassword]);

  const isPasswordValid = Object.values(pwReqs).every(Boolean);
  const isSubmitDisabled = !termsAccepted || loading || success || !nameValid || !emailValid || !isPasswordValid || !matchValid;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    setTouched({
      name: true,
      email: true,
      password: true,
      confirm: true,
    });

    if (!nameValid) {
      setFormError('Please enter your full name');
      return;
    }

    if (!emailValid) {
      setEmailValid(false);
      setEmailError('Please enter a valid email address');
      return;
    }

    if (!isPasswordValid) {
      setFormError('Please fulfill all password requirements');
      return;
    }

    if (!matchValid) {
      setFormError('Passwords do not match');
      return;
    }

    if (!termsAccepted) {
      setFormError('Please agree to the Terms of Service');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, fullName, password);
      // AuthContext navigates to '/' on success
      setSuccess(true);
    } catch (err) {
      const parsed = parseAuthError(err);
      // If it's an email-taken error, show it on the email field
      if (parsed.includes('already registered')) {
        setEmailValid(false);
        setEmailError(parsed);
        setFormError('');
      } else {
        setFormError(parsed);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Google handler ──────────────────────────────────────────────────────────
  const handleGoogleSignUp = async () => {
    setFormError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setFormError(parseAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
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

      <button
        className={styles.googleBtn}
        type="button"
        aria-label="Continue with Google"
        onClick={handleGoogleSignUp}
        disabled={googleLoading || loading}
      >
        {googleLoading ? (
          <div className={styles.spinner} />
        ) : (
          <>
            <svg className={styles.googleIcon} viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </>
        )}
      </button>
      

      <div className={styles.divider}>or sign up with email</div>

      <form onSubmit={handleSubmit} noValidate>
        <div className={showExtraFields ? styles.visibleFields : styles.hiddenFields}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="signup-name">Full Name</label>
          <div className={styles.inputWrapper}>
            <input
              id="signup-name"
              type="text"
              className={`${styles.input} ${nameValid === true ? styles.valid : ''} ${nameValid === false && touched.name ? styles.invalid : ''}`}
              placeholder="Mahlet Solomon"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, name: true }))}
              autoComplete="name"
              aria-invalid={nameValid === false}
            />
            {nameValid === true && <Check className={`${styles.inputIconRight} ${styles.iconSuccess}`} size={18} />}
          </div>
          {nameValid === false && touched.name && <span className={styles.errorMsg}>Please enter your full name</span>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="signup-email">Email</label>
          <div className={styles.inputWrapper}>
            <input
              id="signup-email"
              type="email"
              className={`${styles.input} ${emailValid === true ? styles.valid : ''} ${emailValid === false && touched.email ? styles.invalid : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, email: true }))}
              autoComplete="email"
              aria-invalid={emailValid === false}
              aria-describedby={emailValid === false ? 'signup-email-error' : undefined}
            />
            {emailValid === true && <Check className={`${styles.inputIconRight} ${styles.iconSuccess}`} size={18} />}
            {emailValid === false && touched.email && <AlertCircle className={`${styles.inputIconRight} ${styles.iconError}`} size={18} />}
          </div>
          {emailValid === false && touched.email && <span id="signup-email-error" className={styles.errorMsg}>{emailError}</span>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="signup-password">Password</label>
          <div className={styles.inputWrapper}>
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              className={`${styles.input} ${password && isPasswordValid ? styles.valid : ''} ${password && !isPasswordValid && touched.password ? styles.invalid : ''}`}
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onFocus={() => setPwFocused(true)}
              onBlur={() => {
                setPwFocused(false);
                setTouched((current) => ({ ...current, password: true }));
              }}
              autoComplete="new-password"
              aria-invalid={Boolean(password && !isPasswordValid)}
            />
            <button
              type="button"
              className={styles.inputIconRight}
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {pwFocused && (
            <div className={styles.pwRequirements} role="list">
              <p className={styles.pwReqTitle}>Password requirements:</p>
              <ul className={styles.pwReqList}>
                <li className={`${styles.pwReqItem} ${pwReqs.length ? styles.met : ''}`}>
                  <span className={styles.pwReqIcon}>{pwReqs.length ? '✓' : '○'}</span> Minimum 8 characters
                </li>
                <li className={`${styles.pwReqItem} ${pwReqs.upper ? styles.met : ''}`}>
                  <span className={styles.pwReqIcon}>{pwReqs.upper ? '✓' : '○'}</span> At least 1 Uppercase letter
                </li>
                <li className={`${styles.pwReqItem} ${pwReqs.lower ? styles.met : ''}`}>
                  <span className={styles.pwReqIcon}>{pwReqs.lower ? '✓' : '○'}</span> At least 1 Lowercase letter
                </li>
                <li className={`${styles.pwReqItem} ${pwReqs.number ? styles.met : ''}`}>
                  <span className={styles.pwReqIcon}>{pwReqs.number ? '✓' : '○'}</span> At least 1 Number
                </li>
              </ul>
            </div>
          )}

          {password && !isPasswordValid && touched.password && !pwFocused && (
            <span className={styles.errorMsg}>Please fulfill all password requirements</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="signup-confirm">Confirm Password</label>
          <div className={styles.inputWrapper}>
            <input
              id="signup-confirm"
              type={showPassword ? 'text' : 'password'}
              className={`${styles.input} ${matchValid === true ? styles.valid : ''} ${matchValid === false && touched.confirm ? styles.invalid : ''}`}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, confirm: true }))}
              autoComplete="new-password"
              aria-invalid={matchValid === false}
            />
            {matchValid === true && <Check className={`${styles.inputIconRight} ${styles.iconSuccess}`} size={18} />}
            {matchValid === false && touched.confirm && <AlertCircle className={`${styles.inputIconRight} ${styles.iconError}`} size={18} />}
          </div>
          {matchValid === false && touched.confirm && <span className={styles.errorMsg}>Passwords do not match</span>}
        </div>

        <div className={styles.checkboxGroup}>
          <input
            type="checkbox"
            id="terms"
            className={styles.checkbox}
            checked={termsAccepted}
            onChange={(event) => setTermsAccepted(event.target.checked)}
            aria-describedby="terms-label"
          />
          <label id="terms-label" htmlFor="terms" className={styles.checkboxLabel}>
            I agree to the Terms of Service and Privacy Policy
          </label>
        </div>

        {formError && <span className={styles.formError}>{formError}</span>}

          <button type="submit" className={`${styles.submitBtn} ${success ? styles.success : ''}`} disabled={isSubmitDisabled}>
            {loading ? <div className={styles.spinner} /> : success ? <Check size={20} /> : 'Create Account'}
          </button>
        </div>

        <div className={styles.toggleText}>
          Already have an account?{' '}
          <button type="button" className={styles.toggleLink} onClick={onToggle}>
            Log In
          </button>
        </div>
      </form>
    </div>
  );
};

export default SignUpCard;
