// Fictional review examples. Replace only with documented, verified experiences before publication as real testimonials.
const reviews = [
  {
    quote: 'Buscaba un complemento sencillo para acompañar una rutina más activa y consciente. La presentación de NovaStrong me pareció práctica y discreta.',
    name: 'Carlos M.',
    city: 'Medellín',
    verified: false
  },
  {
    quote: 'Me gustó encontrar información clara y sin promesas exageradas. Lo considero una opción para complementar mis hábitos de bienestar diario.',
    name: 'Andrés R.',
    city: 'Bogotá',
    verified: false
  },
  {
    quote: 'Quería conocer una alternativa para sumar a mi autocuidado. El proceso para solicitar información fue sencillo y me permitió resolver mis dudas con calma.',
    name: 'Javier P.',
    city: 'Cali',
    verified: false
  }
];

const testimonialList = document.querySelector('#testimonial-list');
reviews.forEach((review) => {
  const article = document.createElement('article');
  article.className = 'testimonial reveal';
  const tag = document.createElement('span');
  tag.className = review.verified ? 'review-tag verified' : 'demo-tag';
  tag.textContent = review.verified ? 'Experiencia verificada' : 'Ejemplo ficticio';

  const quote = document.createElement('blockquote');
  quote.textContent = `“${review.quote}”`;

  const footer = document.createElement('footer');
  const name = document.createElement('strong');
  const city = document.createElement('span');
  name.textContent = review.name;
  city.textContent = review.city;
  footer.append(name, city);

  article.append(tag, quote, footer);
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
let firstInteractionAt = 0;
let hasStarted = false;
let isSubmitting = false;
let lastSubmission = { fingerprint: '', time: 0 };

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
  await new Promise((resolve) => window.setTimeout(resolve, 650));
  // DEMO INTEGRATION POINT: replace this delay with an authorized HTTPS POST to your backend/CRM.
  lastSubmission = { fingerprint: currentFingerprint, time: Date.now() };
  isSubmitting = false; submitButton.disabled = false; submitButton.classList.remove('is-loading');
  status.innerHTML = '¡Gracias! Recibimos tu solicitud. Un asesor se comunicará contigo.<br><small>Modo demostración: tus datos no fueron transmitidos ni almacenados.</small>';
  status.className = 'form-status success';
  emitEvent('formulario_exitoso', { modo: 'demostracion' });
});

document.querySelector('#year').textContent = new Date().getFullYear();
