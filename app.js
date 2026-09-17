// Verified customer experiences supplied and approved for publication by the site owner.
const reviews = [
  {
    quote: 'Buscaba un complemento sencillo para acompañar una rutina más activa y consciente. La presentación de NovaStrong me pareció práctica y discreta.',
    name: 'Carlos M.',
    city: 'Medellín',
    image: 'assets/reviews/carlos-medellin.jpg',
    imageAlt: 'Carlos M. sosteniendo un frasco NovaStrong al aire libre',
    verified: true
  },
  {
    quote: 'Me gustó encontrar información clara y sin promesas exageradas. Lo considero una opción para complementar mis hábitos de bienestar diario.',
    name: 'Andrés R.',
    city: 'Bogotá',
    image: 'assets/reviews/andres-bogota.jpg',
    imageAlt: 'Andrés R. mostrando un frasco NovaStrong en un espacio interior',
    verified: true
  },
  {
    quote: 'Quería conocer una alternativa para sumar a mi autocuidado. El proceso para solicitar información fue sencillo y me permitió resolver mis dudas con calma.',
    name: 'Javier P.',
    city: 'Cali',
    image: 'assets/reviews/javier-cali.jpg',
    imageAlt: 'Javier P. sosteniendo un frasco NovaStrong en una terraza',
    verified: true
  }
];

const testimonialList = document.querySelector('#testimonial-list');
reviews.forEach((review) => {
  const article = document.createElement('article');
  article.className = 'testimonial reveal';

  const media = document.createElement('figure');
  media.className = 'testimonial-media';
  const image = document.createElement('img');
  image.src = review.image;
  image.alt = review.imageAlt;
  image.width = 900;
  image.height = 900;
  image.loading = 'lazy';
  image.decoding = 'async';
  media.append(image);

  const quote = document.createElement('blockquote');
  quote.textContent = `“${review.quote}”`;

  const footer = document.createElement('footer');
  const name = document.createElement('strong');
  const city = document.createElement('span');
  name.textContent = review.name;
  city.textContent = review.city;
  footer.append(name, city);

  article.append(media, quote, footer);
  testimonialList.appendChild(article);
});

const emitEvent = (name, detail = {}) => {
  window.dispatchEvent(new CustomEvent(`novastrong:${name}`, { detail }));
  if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: name, ...detail });
};

document.querySelectorAll('.js-form-cta').forEach((cta) => cta.addEventListener('click', () => {
  emitEvent('clic_cta', { ubicacion: cta.dataset.cta || 'desconocida' });
}));

const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('#menu-principal');
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  nav.classList.toggle('open', !open);
});
nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false');
}));

const revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
  if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
}), { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((item) => revealObserver.observe(item));

const dialog = document.querySelector('#product-dialog');
const dialogTitle = document.querySelector('#dialog-title');
const dialogImage = document.querySelector('#dialog-image');
document.querySelectorAll('.gallery-item').forEach((item) => item.addEventListener('click', () => {
  dialogTitle.textContent = item.dataset.view;
  dialogImage.src = item.dataset.image;
  dialogImage.alt = item.dataset.alt;
  dialog.showModal();
}));
dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

const form = document.querySelector('#lead-form');
const status = document.querySelector('#form-status');
const submitButton = form.querySelector('[type="submit"]');
const marketingConsentField = form.elements.namedItem('marketingConsent');
const submissionLockKey = 'novastrong_lead_submitted_v1';
const submissionLockCookie = 'novastrong_lead_submitted';
const submissionLockDuration = 24 * 60 * 60 * 1000;
let firstInteractionAt = 0;
let hasStarted = false;
let isSubmitting = false;
let lastSubmission = { fingerprint: '', time: 0 };

const saveSubmissionLock = () => {
  try { window.localStorage.setItem(submissionLockKey, String(Date.now())); } catch (_) { /* Storage may be unavailable. */ }
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${submissionLockCookie}=1; Max-Age=86400; Path=/; SameSite=Lax${secure}`;
};

const hasActiveSubmissionLock = () => {
  const cookieIsActive = document.cookie.split(';').some((item) => item.trim() === `${submissionLockCookie}=1`);
  if (cookieIsActive) return true;
  try {
    const submittedAt = Number(window.localStorage.getItem(submissionLockKey));
    if (Number.isFinite(submittedAt) && Date.now() - submittedAt < submissionLockDuration) return true;
    window.localStorage.removeItem(submissionLockKey);
  } catch (_) { /* Continue without persistence when storage is unavailable. */ }
  return false;
};

const lockSubmittedForm = () => {
  form.classList.add('is-submitted');
  form.querySelectorAll('input, select, button').forEach((control) => { control.disabled = true; });
  status.textContent = 'Solicitud recibida. Ya no necesitas enviar tus datos otra vez. Espera el contacto de un asesor.';
  status.className = 'form-status success submitted-message';
  status.setAttribute('tabindex', '-1');
  status.focus({ preventScroll: true });
};

const updateMarketingConsent = () => {
  if (!window.ShortlMeta) return false;
  return window.ShortlMeta.consent(marketingConsentField.checked === true);
};

marketingConsentField.addEventListener('change', updateMarketingConsent);

const trackConfirmedLead = async (leadId) => {
  if (!marketingConsentField.checked) return;
  if (!window.ShortlMeta) throw new Error('ShortlMeta no está disponible.');
  updateMarketingConsent();
  const eventId = `lead-${leadId}`;
  try {
    await window.ShortlMeta.track('Lead', { eventId });
  } catch (firstError) {
    await new Promise((resolve) => window.setTimeout(resolve, 750));
    await window.ShortlMeta.track('Lead', { eventId });
  }
};

const fingerprint = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return String(hash);
};

form.addEventListener('input', () => {
  if (!hasStarted) { hasStarted = true; firstInteractionAt = Date.now(); emitEvent('inicio_formulario'); }
}, { once: true });

const showError = (id, message) => {
  const field = document.querySelector(`#${id}`);
  const error = document.querySelector(`#${id}-error`);
  field.setAttribute('aria-invalid', 'true');
  error.textContent = message;
};
const clearErrors = () => {
  form.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute('aria-invalid'));
  form.querySelectorAll('.field-error').forEach((error) => { error.textContent = ''; });
  status.textContent = ''; status.className = 'form-status';
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (isSubmitting) return;
  clearErrors();
  const nameField = form.elements.namedItem('name');
  const phoneField = form.elements.namedItem('phone');
  const consentField = form.elements.namedItem('consent');
  const honeypotField = form.elements.namedItem('website');
  const name = nameField.value.trim().replace(/\s+/g, ' ');
  const phone = phoneField.value.replace(/\D/g, '');
  const country = form.elements.namedItem('country').value;
  const query = new URLSearchParams(window.location.search);
  const attribution = {
    utmSource: query.get('utm_source') || '',
    utmMedium: query.get('utm_medium') || '',
    utmCampaign: query.get('utm_campaign') || '',
    utmCampaignId: query.get('utm_id') || '',
    utmTerm: query.get('utm_term') || '',
    utmContent: query.get('utm_content') || '',
    metaAdsetId: query.get('meta_adset_id') || '',
    metaAdId: query.get('meta_ad_id') || '',
    metaPlacement: query.get('meta_placement') || ''
  };
  let firstInvalid = null;
  if (name.length < 3 || !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(name)) { showError('name', 'Ingresa tu nombre completo (mínimo 3 caracteres).'); firstInvalid ||= nameField; }
  if (phone.length < 7 || phone.length > 15) { showError('phone', 'Ingresa un número válido de 7 a 15 dígitos.'); firstInvalid ||= phoneField; }
  if (!consentField.checked) { showError('consent', 'Debes autorizar el contacto y el tratamiento de datos.'); firstInvalid ||= consentField; }
  if (honeypotField.value) return;
  if (firstInteractionAt && Date.now() - firstInteractionAt < 1500) { status.textContent = 'Espera un momento y vuelve a intentarlo.'; status.className = 'form-status error'; return; }
  if (firstInvalid) { status.textContent = 'Revisa los campos señalados.'; status.className = 'form-status error'; firstInvalid.focus(); return; }
  const currentFingerprint = fingerprint(`${name.toLowerCase()}|${phone}`);
  if (currentFingerprint === lastSubmission.fingerprint && Date.now() - lastSubmission.time < 300000) { status.textContent = 'Esta solicitud ya fue procesada recientemente en esta sesión.'; status.className = 'form-status error'; return; }
  emitEvent('envio_formulario');
  isSubmitting = true; submitButton.disabled = true; submitButton.classList.add('is-loading');
  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name,
        phone,
        country,
        consent: consentField.checked,
        marketingConsent: marketingConsentField.checked,
        website: honeypotField.value,
        startedAt: firstInteractionAt,
        page: `${window.location.pathname}${window.location.hash}`,
        attribution
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'No fue posible enviar la solicitud.');

    lastSubmission = { fingerprint: currentFingerprint, time: Date.now() };
    const marketingConsentGranted = marketingConsentField.checked;
    if (marketingConsentGranted && result.leadId) {
      try {
        await trackConfirmedLead(result.leadId);
      } catch (trackingError) {
        console.warn('No se pudo registrar el evento Lead en Shortl.', trackingError);
        emitEvent('tracking_error', { proveedor: 'shortl', evento: 'Lead' });
      }
    }
    form.reset();
    if (marketingConsentGranted && window.ShortlMeta) window.ShortlMeta.consent(false);
    saveSubmissionLock();
    lockSubmittedForm();
    emitEvent('formulario_exitoso');
  } catch (error) {
    if (error.message === 'duplicate') {
      saveSubmissionLock();
      lockSubmittedForm();
    } else {
      status.textContent = 'No pudimos enviar tu solicitud. Inténtalo nuevamente en unos minutos.';
      status.className = 'form-status error';
    }
  } finally {
    isSubmitting = false;
    if (!form.classList.contains('is-submitted')) submitButton.disabled = false;
    submitButton.classList.remove('is-loading');
  }
});

if (hasActiveSubmissionLock()) lockSubmittedForm();

document.querySelector('#year').textContent = new Date().getFullYear();
