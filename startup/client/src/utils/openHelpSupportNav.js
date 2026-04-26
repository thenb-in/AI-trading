import { toast } from 'react-toastify';
import { captureCurrentScreen } from './captureCurrentScreen';
import { consoleLogBufferService } from './consoleLogBufferService';
import { helpSupportDraftService } from './helpSupportDraftService';
import { ROUTE_HELP_SUPPORT } from '../constants/routes';

async function openHelpSupportNav({ navigate, location }) {
  if (location.pathname === ROUTE_HELP_SUPPORT) {
    navigate(ROUTE_HELP_SUPPORT);
    return;
  }

  try {
    const sourceUrl =
      typeof window !== 'undefined'
        ? window.location.href
        : `${location.pathname}${location.search}${location.hash}`;
    const screenshotFile = await captureCurrentScreen();
    const logs = consoleLogBufferService.getLogsTextForPageUrl(sourceUrl);
    helpSupportDraftService.setDraft({
      sourceUrl,
      screenshotFile,
      logs
    });
    navigate(ROUTE_HELP_SUPPORT);
  } catch (error) {
    toast.error(error?.message || 'Unable to capture current screen.');
  }
}

export { openHelpSupportNav };
