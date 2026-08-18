import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import LoginCard from '../components/auth/LoginCard';
import SignUpCard from '../components/auth/SignUpCard';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

const Auth: React.FC = () => {

  const { user, isLoading } = useAuth();

  const [isFlipped, setIsFlipped] = useState(false);

  const [cardHeights, setCardHeights] = useState({
    login: 520,
    signup: 640,
  });


  const frontRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);



  useEffect(() => {

    document.title = isFlipped
      ? 'Sign Up | ExamReal'
      : 'Log In | ExamReal';

  }, [isFlipped]);



  /*
    Measure initial heights before browser paint
  */
  useLayoutEffect(() => {

    const loginHeight =
      frontRef.current?.scrollHeight ?? 520;

    const signupHeight =
      backRef.current?.scrollHeight ?? 640;


    setCardHeights({
      login: loginHeight,
      signup: signupHeight,
    });


  }, []);




  /*
    Keep watching height changes:
    - validation messages
    - password requirements
    - responsive changes
  */
  useEffect(() => {


    const frontEl = frontRef.current;
    const backEl = backRef.current;


    if (!frontEl || !backEl) return;



    const observer = new ResizeObserver(() => {


      setCardHeights({

        login: frontEl.scrollHeight,

        signup: backEl.scrollHeight,

      });


    });



    observer.observe(frontEl);
    observer.observe(backEl);



    return () => {

      observer.disconnect();

    };


  }, []);





  const activeHeight =
    isFlipped
      ? cardHeights.signup
      : cardHeights.login;





  const handleToggle = () => {

    setIsFlipped(previous => !previous);

  };





  const cardInnerClass = [

    styles.cardInner,

    isFlipped && styles.flipped

  ]

  .filter(Boolean)

  .join(' ');





  if (!isLoading && user) {
    return <Navigate to="/courses" replace />;
  }


  return (

    <div
      className={`
        ${styles.pageContainer}
        ${isFlipped ? styles.bgSignUp : styles.bgLogin}
      `}
    >


      {/* Ambient background */}

      <div className={styles.ambient} aria-hidden="true">

        <span
          className={`${styles.blob} ${styles.blobOne}`}
        />


        <span
          className={`${styles.blob} ${styles.blobTwo}`}
        />


        <span
          className={`${styles.blob} ${styles.blobThree}`}
        />

      </div>





      <div className={styles.cardContainer}>


        <div
          className={styles.heightWrapper}
          style={{
            height: `${activeHeight}px`
          }}
        >


          <div className={cardInnerClass}>


            {/* LOGIN SIDE */}

            <div
              className={styles.cardFront}
              aria-hidden={isFlipped}
            >

              <div
                ref={frontRef}
                className={styles.cardContent}
              >

              <LoginCard
                onToggle={handleToggle}
              />

              </div>

            </div>





            {/* SIGNUP SIDE */}

            <div
              className={styles.cardBack}
              aria-hidden={!isFlipped}
            >

              <div
                ref={backRef}
                className={styles.cardContent}
              >

              <SignUpCard
                onToggle={handleToggle}
              />

              </div>

            </div>



          </div>


        </div>


      </div>


    </div>

  );

};


export default Auth;