import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataContext } from '@context/useDataContext';
import { AppGuide as AppGuideComponent, defaultAppGuideConfig } from '@startup/components/app_guide';
import { getOnboardingMasters } from '../data/getMasterModules';
import { OnboardingMasterActions } from '../components/app_guide/components/OnboardingMasterActions';

function AppGuide() {
  const navigate = useNavigate();
  const { userData } = useDataContext();

  const handleComplete = () => {
    const redirectTo = userData?.isSupportUser ? '/admin/multi-company-setup' : '/admin';
    navigate(redirectTo, { replace: true });
  };

  const handleOpenMaster = useCallback((path, state) => {
    navigate(`/admin/master/${path}`, { state });
  }, [navigate]);

  const createOnboardingActions = useCallback((masterKey) => ({
    onOpen: () => handleOpenMaster(masterKey),
    onCreate: () => handleOpenMaster(masterKey, { openCreate: true }),
    onImport: () => handleOpenMaster(masterKey, { openImport: true }),
    onDownloadTemplate: () => handleOpenMaster(masterKey, { openDownloadTemplate: true })
  }), [handleOpenMaster]);

  const steps = useMemo(() => {
    const onboardingModules = getOnboardingMasters(handleOpenMaster);
    const theme = defaultAppGuideConfig.theme;
    const onboardingSteps = onboardingModules.map((m) => {
      const actions = createOnboardingActions(m.masterKey);
      return {
        id: m.masterKey,
        icon: m.icon,
        title: m.title,
        description: m.description,
        features: [],
        masterKey: m.masterKey,
        onClick: m.onClick,
        extraContent: (
          <OnboardingMasterActions
            title={m.title}
            masterKey={m.masterKey}
            theme={theme}
            actions={actions}
          />
        )
      };
    });
    return [...onboardingSteps, ...defaultAppGuideConfig.steps];
  }, [handleOpenMaster, createOnboardingActions]);

  return (
    <AppGuideComponent
      userName={userData?.name}
      onComplete={handleComplete}
      config={{ steps }}
    />
  );
}

export { AppGuide };
