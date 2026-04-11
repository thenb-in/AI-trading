import html2canvas from 'html2canvas';

async function captureCurrentScreen() {
  const target = document.getElementById('root') || document.body;
  if (!target) {
    throw new Error('Unable to find page content to capture.');
  }

  const canvas = await html2canvas(target, {
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: '#ffffff',
    scale: window.devicePixelRatio > 1 ? 2 : 1
  });

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) {
        resolve(value);
      } else {
        reject(new Error('Unable to capture screenshot.'));
      }
    }, 'image/png');
  });

  const fileName = `support-screenshot-${Date.now()}.png`;
  return new File([blob], fileName, { type: 'image/png' });
}

export { captureCurrentScreen };
