(() => {
  // Capture JSON-LD structured data before stripping scripts
  let jsonLd = '';
  const ldScript = document.querySelector('script[type="application/ld+json"]');
  if (ldScript) {
    jsonLd = `<script type="application/ld+json">${ldScript.textContent}</script>`;
  }

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

  const visibleText = (bodyClone.innerText || bodyClone.textContent || '')
    .replace(/\s{3,}/g, '\n\n')
    .trim();

  // Prepend JSON-LD so parsers can access structured data
  const rawText = jsonLd ? `${jsonLd}\n${visibleText}` : visibleText;

  return {
    url: window.location.href,
    rawText: rawText || '',
    domData: {
      title: document.title || '',
    }
  };
})();
