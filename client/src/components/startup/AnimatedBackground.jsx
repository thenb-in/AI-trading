import { motion } from 'framer-motion';
import { FaUser, FaLock } from 'react-icons/fa';
import PropTypes from 'prop-types';

const AnimatedBackground = ({ setShowRoleDropdown = () => {} }) => {
  let clickCount = 0;
  let clickTimeout = null;

  const handleLockClick = () => {
    clickCount++;
    if (clickCount === 3) {
      if (setShowRoleDropdown) {
        setShowRoleDropdown(true);
      }
      clickCount = 0;
      clearTimeout(clickTimeout);
    } else {
      clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => {
        clickCount = 0;
      }, 500); // Reset after 500ms if not triple-clicked
    }
  };

  return (
    <div className="md:w-1/2 bg-gradient-to-br from-blue-600 to-teal-600 flex items-center justify-center p-8">
    <div className="text-center text-white">
      <motion.div
        animate={{
          y: [0, -20, 0],
          rotate: [0, 10, -10, 0],
        }}
        transition={{
          y: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
          rotate: { repeat: Infinity, duration: 5, ease: 'easeInOut' },
        }}
        className="mb-6"
      >
        <FaUser className="text-6xl mx-auto" />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-4xl font-bold mb-4"
      >
        Welcome to {import.meta.env.VITE_APP_NAME_CLIENT}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2 }}
        className="text-lg"
      >
        Customize according to your needs
      </motion.p>
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          scale: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
        }}
        className="mt-6"
      >
        <FaLock className="text-4xl mx-auto cursor-pointer" onClick={handleLockClick} />
      </motion.div>
    </div>
  </div>
  );
};

AnimatedBackground.propTypes = {
  setShowRoleDropdown: PropTypes.func,
};

export { AnimatedBackground };