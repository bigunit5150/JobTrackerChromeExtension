(() => {
  // Clone body to avoid mutating the live DOM
  const bodyClone = document.body.cloneNode(true);

  // Remove elements that don't contribute to job content
  const removeSelectors = [
    'script', 'style', 'noscript', 'nav', 'header', 'footer',
    'iframe', 'svg', '[aria-hidden="true"]'
  ];
  removeSelectors.forEach(sel => {
    bodyClone.querySelectorAll(sel).forEach(el => el.remove());
  });

  const rawText = (bodyClone.innerText || bodyClone.textContent || '')
    .replace(/\s{3,}/g, '\n\n')
    .trim();

  return {
    url: window.location.href,
    rawText: rawText || '',
    domData: {
      title: document.title || '',
    }
  };
})();
