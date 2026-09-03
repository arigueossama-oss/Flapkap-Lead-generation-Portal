const EMAILJS_PUBLIC_KEY = '7UvSbXxegKQ-Yvoqy';
const EMAILJS_SERVICE_ID = 'service_oru5nm2';
const EMAILJS_TEMPLATE_ID = 'template_9wqtszq';

if (!EMAILJS_PUBLIC_KEY.startsWith('PASTE_')) {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

let requests = [];

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

function messageRow(text) {
  const row = document.createElement('tr');
  row.innerHTML = '<td class="empty" colspan="8">' + escapeHtml(text) + '</td>';
  return row;
}

function render() {
  rowsEl.innerHTML = '';

  if (requests.length === 0) {
    rowsEl.appendChild(messageRow('No requests yet. Submissions from the Flapkap Data request page will appear here.'));
    renderStats();
    return;
  }

  requests.forEach((item, index) => {
    const row = document.createElement('tr');
    const isFulfilled = Boolean(item.link && item.fulfilled_at);

    const linkCell = isFulfilled
      ? '<a href="' + escapeHtml(item.link) + '" target="_blank" rel="noopener">Open link</a>'
      : '<div class="link-form">'
          + '<input type="url" placeholder="Paste the sheet link" aria-label="Sheet link for request ' + (index + 1) + '">'
          + '<button type="button" class="save-btn">Save</button>'
        + '</div>';

    const timeCell = isFulfilled
      ? '<span class="pill pill--done">' + formatDuration(item.requested_at, item.fulfilled_at) + '</span>'
      : '<span class="pill pill--pending">Pending</span>';

    const sourceCell = item.source_link
      ? '<a href="' + escapeHtml(item.source_link) + '" target="_blank" rel="noopener">View data</a>'
      : '<span class="muted">None attached</span>';

    row.innerHTML =
      '<td class="num">' + (index + 1) + '</td>'
      + '<td>' + escapeHtml(item.bdr_email) + '</td>'
      + '<td>' + escapeHtml(item.industry) + '</td>'
      + '<td>' + escapeHtml(item.request) + '</td>'
      + '<td>' + sourceCell + '</td>'
      + '<td>' + formatTimestamp(item.requested_at) + '</td>'
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
  const fulfilled = requests.filter((item) => item.link && item.fulfilled_at).length;
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

  try {
    const updated = await attachLink(item.id, link);
    item.link = updated.link;
    item.fulfilled_at = updated.fulfilled_at;
  } catch (err) {
    console.error('Could not save the link:', err);
    button.disabled = false;
    button.textContent = 'Save';
    noteEl.textContent = 'Could not save that link. Check your connection and try again.';
    return;
  }

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: item.bdr_email,
      industry: item.industry,
      request: item.request,
      file_link: link,
    });
    noteEl.textContent = 'Link saved and emailed to ' + item.bdr_email + '.';
  } catch (err) {
    console.error('Email send failed:', err);
    noteEl.textContent = 'Link saved, but the email to ' + item.bdr_email + ' could not be sent.';
  }

  render();
}

async function load() {
  rowsEl.appendChild(messageRow('Loading requests...'));

  try {
    requests = await listRequests();
  } catch (err) {
    console.error('Could not load requests:', err);
    rowsEl.innerHTML = '';
    rowsEl.appendChild(messageRow('Could not load requests. Check the connection settings and refresh.'));
    return;
  }

  render();
}

load();
