function getCookie(name) {
  console.log('🔍 Looking for cookie:', name);
  let cookieValue = null;

  if (document.cookie && document.cookie !== '') {
    console.log('📦 document.cookie:', document.cookie);

    const cookies = document.cookie.split(';');
    console.log('🍪 Split cookies:', cookies);

    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      console.log(`➡️ Checking cookie [${i}]:`, cookie);

      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        console.log(`✅ Match found for '${name}':`, cookieValue);
        break;
      }
    }

    if (!cookieValue) {
      console.warn(`⚠️ Cookie '${name}' not found`);
    }
  } else {
    console.warn('⚠️ No cookies found in document.cookie');
  }

  return cookieValue;
}

export { getCookie };
