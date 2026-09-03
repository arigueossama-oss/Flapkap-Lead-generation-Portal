const EMAILJS_PUBLIC_KEY = '7UvSbXxegKQ-Yvoqy';
const EMAILJS_SERVICE_ID = 'service_oru5nm2';
const EMAILJS_TEMPLATE_ID = 'template_9wqtszq';

if (!EMAILJS_PUBLIC_KEY.startsWith('PASTE_')) {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

// Shared with the request form in script.js. Swap these two functions for database
// calls when the pipeline needs to be shared across machines.
const STORAGE_KEY = 'flapkap_requests';

function loadRequests() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (err) {
    console.warn('Could not read stored requests:', err);
    return [];
  }
}

function persistRequests(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Could not store requests:', err);
  }
}

const requests = loadRequests();

const rowsEl = document.getElementById('rows');
const statSubEl = document.getElementById('statSub');
const ringEl = document.getElementById('ring');
const ringFillEl = document.getElementById('ringFill');
const ringValueEl = document.getElementById('ringValue');
const noteEl = document.getElementById('note');

const RING_CIRCUMFERENCE = 2 * Math.PI * 44;

function formatTimestamp(isoString) {
  return new Date(isoString).toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(fromIso, toIso) {
  const totalMinutes = Math.max(0, Math.round((new Date(toIso) - new Date(fromIso)) / 60000));
  if (totalMinutes < 60) return totalMinutes + ' min';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? hours + 'h' : hours + 'h ' + minutes + 'm';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function render() {
  rowsEl.innerHTML = '';

  if (requests.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td class="empty" colspan="7">No requests yet. '
      + 'Submissions from the Flapkap Data request page will appear here.</td>';
    rowsEl.appendChild(row);
    renderStats();
    return;
  }

  requests.forEach((item, index) => {
    const row = document.createElement('tr');
    const isFulfilled = Boolean(item.link && item.fulfilledAt);

    const linkCell = isFulfilled
      ? '<a href="' + escapeHtml(item.link) + '" target="_blank" rel="noopener">Open link</a>'
      : '<div class="link-form">'
          + '<input type="url" placeholder="Paste the sheet link" aria-label="Sheet link for request ' + (index + 1) + '">'
          + '<button type="button" class="save-btn">Save</button>'
        + '</div>';

    const timeCell = isFulfilled
      ? '<span class="pill pill--done">' + formatDuration(item.requestedAt, item.fulfilledAt) + '</span>'
      : '<span class="pill pill--pending">Pending</span>';

    row.innerHTML =
      '<td class="num">' + (index + 1) + '</td>'
      + '<td>' + escapeHtml(item.from) + '</td>'
      + '<td>' + escapeHtml(item.industry) + '</td>'
      + '<td>' + escapeHtml(item.request) + '</td>'
      + '<td>' + formatTimestamp(item.requestedAt) + '</td>'
      + '<td class="link-cell">' + linkCell + '</td>'
      + '<td>' + timeCell + '</td>';

    if (!isFulfilled) {
      const input = row.querySelector('input');
      const button = row.querySelector('.save-btn');
      button.addEventListener('click', () => saveLink(item, input, button));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveLink(item, input, button);
        }
      });
    }

    rowsEl.appendChild(row);
  });

  renderStats();
}

function renderStats() {
  const total = requests.length;
  const fulfilled = requests.filter((item) => item.link && item.fulfilledAt).length;
  const pending = total - fulfilled;
  const percent = total === 0 ? 0 : Math.round((fulfilled / total) * 100);

  if (total === 0) {
    statSubEl.textContent = 'No requests in your pipeline yet';
  } else if (pending === 0) {
    statSubEl.textContent = 'All ' + total + ' requests in your pipeline are fulfilled';
  } else {
    statSubEl.textContent = 'You have ' + pending + ' open request' + (pending === 1 ? '' : 's') + ' in your pipeline';
  }

  ringValueEl.textContent = percent + '%';
  ringFillEl.setAttribute('stroke-dashoffset', RING_CIRCUMFERENCE * (1 - percent / 100));
  ringEl.setAttribute('aria-label', percent + ' percent of requests fulfilled');
}

async function saveLink(item, input, button) {
  const link = input.value.trim();

  if (!link) {
    input.classList.add('invalid');
    input.focus();
    return;
  }

  input.classList.remove('invalid');
  button.disabled = true;
  button.textContent = 'Saving...';

  item.link = link;
  item.fulfilledAt = new Date().toISOString();
  persistRequests(requests);

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: item.from,
      industry: item.industry,
      request: item.request,
      file_link: link,
    });
    noteEl.textContent = 'Link saved and emailed to ' + item.from + '.';
  } catch (err) {
    console.error('Email send failed:', err);
    noteEl.textContent = 'Link and turnaround time saved, but the email to ' + item.from + ' could not be sent. '
      + 'Check the browser console for details.';
  }

  render();
}

render();
