import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AnimatedBackground } from '@startup/components/AnimatedBackground';
import { Signup } from '@startup/components/auth/Signup';
import { CompanyIdGate } from '@startup/components/auth/CompanyIdGate';
import { motion } from 'framer-motion';
import { PageMeta } from '@startup/seo/PageMeta';
import { useSsoInteraction, useSsoSignup } from '@startup/sso';

function SignupPage() {
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const navigate = useNavigate();
  const { isSso, uid, loginPath, companyId: ssoCompanyId, companyExists } = useSsoInteraction();
  const ssoSignup = useSsoSignup(uid);
  const [searchParams] = useSearchParams();
  const queryCompanyId = searchParams.get('company_id') || '';
  const [confirmedCompanyId, setConfirmedCompanyId] = useState('');
  useEffect(() => {
    if (companyExists === true && ssoCompanyId) {
      setConfirmedCompanyId(ssoCompanyId);
    }
  }, [companyExists, ssoCompanyId]);

  const handleSsoSignup = async (data) => {
    const { pendingApproval } = await ssoSignup(data);
    toast.success(
      pendingApproval
        ? 'Account created — pending admin approval. You can sign in once approved.'
        : 'Account created. Please sign in to continue.'
    );
    navigate(loginPath);
  };

  const signupProps = isSso
    ? { onSubmit: handleSsoSignup, onBackToLogin: () => navigate(loginPath) }
    : {};

  const renderRightPanel = (children) => (
    <div className="min-h-screen flex flex-col md:flex-row">
      <PageMeta
        title="Sign up"
        description="Create your NB Next Wallet account. Free to get started."
        path="/signup"
      />
      {/* Left Side: Animated Section */}
      <AnimatedBackground setShowRoleDropdown={setShowRoleDropdown} />
      {/* Right Side */}
      <div className="md:w-1/2 flex items-center justify-center p-8 bg-gray-100">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );

  if (!confirmedCompanyId) {
    return renderRightPanel(
      <CompanyIdGate
        initialCompanyId={isSso ? (ssoCompanyId || '') : queryCompanyId}
        loginPath={isSso ? loginPath : '/login'}
        onConfirmed={(company) => setConfirmedCompanyId(company.id)}
      />
    );
  }

  return renderRightPanel(
    <Signup
      showRoleDropdown={showRoleDropdown}
      companyId={confirmedCompanyId}
      {...signupProps}
    />
  );
}

export { SignupPage };
