const form = document.getElementById('dataRequestForm');
const formView = document.getElementById('formView');
const thankYouView = document.getElementById('thankYouView');
const card = document.querySelector('.card');
const requestSelect = document.getElementById('request');
const linkedinField = document.getElementById('linkedinField');
const linkedinInput = document.getElementById('linkedinUrl');

const REQUEST_LABELS = {
  'find-contact': 'Find me this contact',
  'enrich-list': 'Enrich for me a list',
};

// From your EmailJS account: Account > General (public key), Email Services (service ID),
// and the template you create for the BDR-request notification (template ID).
const EMAILJS_PUBLIC_KEY = '7UvSbXxegKQ-Yvoqy';
const EMAILJS_SERVICE_ID = 'service_oru5nm2';
const EMAILJS_TEMPLATE_ID = 'template_r1feoxe';

// Absolute URL built from the current host, so the emailed button works wherever this is deployed.
const LEAD_GEN_PAGE_URL = new URL('dashboard.html', window.location.href).href;

if (!EMAILJS_PUBLIC_KEY.startsWith('PASTE_')) {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}


requestSelect.addEventListener('change', () => {
  const isFindContact = requestSelect.value === 'find-contact';
  linkedinField.hidden = !isFindContact;
  if (!isFindContact) {
    linkedinInput.value = '';
    clearFieldError('linkedinUrl');
  }
});

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
  ['name', 'industry', 'request', 'linkedinUrl'].forEach(clearFieldError);

  const name = document.getElementById('name').value.trim();
  const industry = document.getElementById('industry').value;
  const request = requestSelect.value;

  if (!name) { setFieldError('name', 'Please enter your email.'); valid = false; }
  if (!industry) { setFieldError('industry', 'Please choose an industry.'); valid = false; }
  if (!request) { setFieldError('request', 'Please choose a request type.'); valid = false; }

  if (request === 'find-contact' && !linkedinInput.value.trim()) {
    setFieldError('linkedinUrl', 'Please paste the LinkedIn profile URL.');
    valid = false;
  }

  return valid;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  const submitBtn = form.querySelector('.confirm-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  const requestValue = requestSelect.value;
  const bdrEmail = document.getElementById('name').value.trim();
  const industrySelect = document.getElementById('industry');
  const industry = industrySelect.options[industrySelect.selectedIndex].text;
  const requestLabel = REQUEST_LABELS[requestValue] || requestValue;
  const linkedinUrl = requestValue === 'find-contact' ? linkedinInput.value.trim() : null;
  const requestSummary = linkedinUrl ? requestLabel + ' — ' + linkedinUrl : requestLabel;
  const fileLink = document.getElementById('fileLink').value.trim();

  const acceptUrl = LEAD_GEN_PAGE_URL
    + '?bdrEmail=' + encodeURIComponent(bdrEmail)
    + '&industry=' + encodeURIComponent(industry)
    + '&request=' + encodeURIComponent(requestSummary);

  const templateParams = {
    bdr_email: bdrEmail,
    industry,
    request: requestSummary,
    file_link: fileLink || 'No link provided',
    accept_url: acceptUrl,
  };

  try {
    await createRequest({
      bdrEmail,
      industry,
      request: requestSummary,
      sourceLink: fileLink || null,
    });
  } catch (err) {
    console.error('Could not save the request:', err);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm';
    setFieldError('request', 'Something went wrong saving your request. Please try again.');
    return;
  }

  if (EMAILJS_PUBLIC_KEY.startsWith('PASTE_')) {
    console.warn('EmailJS is not configured yet — see the setup steps for the required account values.');
    console.log('Data request (not sent):', templateParams);
  } else {
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
    } catch (err) {
      console.error('Could not send the notification email:', err);
    }
  }

  formView.hidden = true;
  thankYouView.hidden = false;
  card.classList.add('card--thankyou');
});
