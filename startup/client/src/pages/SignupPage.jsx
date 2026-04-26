import { useState } from 'react';
import { AnimatedBackground } from '@startup/components/AnimatedBackground';
import { Signup } from '@startup/components/auth/Signup';
import { motion } from 'framer-motion';
function SignupPage() {
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
    {/* Left Side: Animated Section */}
   <AnimatedBackground setShowRoleDropdown={setShowRoleDropdown} />
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
        <Signup showRoleDropdown={showRoleDropdown} />
        </motion.div>
      </div>
    </div>
  </div>
  );
}

export { SignupPage };