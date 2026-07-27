import { useNavigate } from 'react-router-dom';
import { Login } from '@startup/components/auth/Login';
import { motion } from 'framer-motion';
import { AnimatedBackground } from '@startup/components/AnimatedBackground';
import { PageMeta, softwareApplicationJsonLd } from '@startup/seo/PageMeta';
import { useSsoInteraction, useSsoLogin } from '@startup/sso';

function Home() {
  const navigate = useNavigate();
  const { isSso, uid, signupPath, forgotPasswordPath } = useSsoInteraction();
  const ssoLogin = useSsoLogin(uid);
  const loginProps = isSso
    ? {
        onSubmit: ssoLogin,
        onForgotPassword: (state) => navigate(forgotPasswordPath, state ? { state } : undefined),
        onSignup: () => navigate(signupPath),
      }
    : {};

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Per-page SEO. The structured-data card lets Google render a
          rich-results "App" preview when this page comes up in search. */}
      <PageMeta
        title="Sign in"
        description="Sign in to NB Next Wallet. Installable on desktop and mobile."
        path="/"
        jsonLd={softwareApplicationJsonLd({})}
      />
      {/* Left Side: Animated Section */}
     <AnimatedBackground/>
      {/* Right Side: Login/Signup */}
      <div className="md:w-1/2 flex items-center justify-center p-8 bg-gray-100">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
             <Login {...loginProps} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export { Home };