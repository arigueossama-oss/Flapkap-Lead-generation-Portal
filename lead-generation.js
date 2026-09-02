const form = document.getElementById('leadGenForm');
const formView = document.getElementById('formView');
const thankYouView = document.getElementById('thankYouView');
const card = document.querySelector('.card');

// From your EmailJS account: Account > General (public key), Email Services (service ID),
// and the template you create for delivering data back to the BDR (template ID).
const EMAILJS_PUBLIC_KEY = '7UvSbXxegKQ-Yvoqy';
const EMAILJS_SERVICE_ID = 'service_oru5nm2';
const EMAILJS_TEMPLATE_ID = 'template_9wqtszq';

if (!EMAILJS_PUBLIC_KEY.startsWith('PASTE_')) {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

const params = new URLSearchParams(window.location.search);
if (params.has('bdrEmail')) document.getElementById('bdrEmail').value = params.get('bdrEmail');
if (params.has('industry')) document.getElementById('industry').value = params.get('industry');
if (params.has('request')) document.getElementById('request').value = params.get('request');

function setFieldError(name, message) {
  const el = document.querySelector(`.error-msg[data-for="${name}"]`);
  if (el) el.textContent = message;
  const field = document.getElementById(name);
  if (field) field.closest('.field')?.classList.add('invalid');
}

function clearFieldError(name) {
  const el = document.querySelector(`.error-msg[data-for="${name}"]`);
  if (el) el.textContent = '';
  const field = document.getElementById(name);
  if (field) field.closest('.field')?.classList.remove('invalid');
}

function validateForm() {
  let valid = true;
  ['bdrEmail', 'industry', 'request'].forEach(clearFieldError);

  const bdrEmail = document.getElementById('bdrEmail').value.trim();
  const industry = document.getElementById('industry').value.trim();
  const request = document.getElementById('request').value.trim();

  if (!bdrEmail) { setFieldError('bdrEmail', 'Please enter the BDR email.'); valid = false; }
  if (!industry) { setFieldError('industry', 'Please enter the industry.'); valid = false; }
  if (!request) { setFieldError('request', 'Please enter the specific request.'); valid = false; }

  return valid;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  const submitBtn = form.querySelector('.confirm-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  const fileLink = document.getElementById('fileLink').value.trim();
  const templateParams = {
    to_email: document.getElementById('bdrEmail').value.trim(),
    industry: document.getElementById('industry').value.trim(),
    request: document.getElementById('request').value.trim(),
    file_link: fileLink || 'No link provided',
  };

  if (EMAILJS_PUBLIC_KEY.startsWith('PASTE_')) {
    console.warn('EmailJS is not configured yet — see the setup steps for the required account values.');
    console.log('Lead Gen response (not sent):', templateParams);
  } else {
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
    } catch (err) {
      console.error('Submission failed:', err);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm';
      setFieldError('request', 'Something went wrong sending your response. Please try again.');
      return;
    }
  }

  formView.hidden = true;
  thankYouView.hidden = false;
  card.classList.add('card--thankyou');
});
