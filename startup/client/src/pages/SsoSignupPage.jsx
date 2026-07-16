import { motion } from 'framer-motion';
import { AnimatedBackground } from '@startup/components/AnimatedBackground';
import { SsoSignup } from '@startup/components/auth/sso_signup';
import { PageMeta } from '@startup/seo/PageMeta';

function SsoSignupPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <PageMeta
        title="Sign up with Wallet"
        description="Create your NBNext Wallet account to sign in."
        path="/signup/sso"
        noIndex
      />
      <AnimatedBackground />
      <div className="md:w-1/2 flex items-center justify-center p-8 bg-gray-100">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <SsoSignup />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export { SsoSignupPage };
