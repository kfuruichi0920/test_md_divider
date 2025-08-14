export function renderMarkdown(text: string): string {
  if (!text) return '';

  const escapeHtml = (str: string): string =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const processInline = (str: string): string => {
    let result = escapeHtml(str);
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
    result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
    result = result.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return result;
  };

  const lines = text.split(/\n/);
  let html = '';
  let inList = false;

  const closeList = () => {
    if (inList) {
      html += '</ul>';
      inList = false;
    }
  };

  for (const line of lines) {
    if (/^###\s+/.test(line)) {
      closeList();
      html += `<h3>${processInline(line.replace(/^###\s+/, ''))}</h3>`;
    } else if (/^##\s+/.test(line)) {
      closeList();
      html += `<h2>${processInline(line.replace(/^##\s+/, ''))}</h2>`;
    } else if (/^#\s+/.test(line)) {
      closeList();
      html += `<h1>${processInline(line.replace(/^#\s+/, ''))}</h1>`;
    } else if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${processInline(line.replace(/^[-*]\s+/, ''))}</li>`;
    } else if (line.trim() === '') {
      closeList();
      html += '<br />';
    } else {
      closeList();
      html += `<p>${processInline(line)}</p>`;
    }
  }

  closeList();
  return html;
}
