import { useNavigate } from 'react-router-dom';
import { useDataContext } from '@context/startup/useDataContext';
import { AppGuide as AppGuideComponent } from '@/components/startup/app_guide';

function AppGuide() {
  const navigate = useNavigate();
  const { userData } = useDataContext();

  const handleComplete = () => {
    const redirectTo = userData?.isSupportUser ? '/admin/multi-company-setup' : '/admin';
    navigate(redirectTo, { replace: true });
  };

  return (
    <AppGuideComponent
      userName={userData?.name}
      onComplete={handleComplete}
    />
  );
}

export { AppGuide };
