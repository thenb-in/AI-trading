import { AnimatedBackground } from '@startup/components/AnimatedBackground';
import { ForgotPassword } from '@startup/components/auth/forgot_password';
import { motion } from 'framer-motion';
import { PageMeta } from '@startup/seo/PageMeta';
function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
    <PageMeta
      title="Reset password"
      description="Recover access to your NB Next Wallet account."
      path="/forgot-password"
      noIndex
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
        <ForgotPassword />
        </motion.div>
      </div>
    </div>
  </div>
  );
}

export { ForgotPasswordPage };

