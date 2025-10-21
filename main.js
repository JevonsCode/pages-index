/*
 * Client-side script to render the GitHub Pages index.
 *
 * This script fetches the project list from projects.json, builds the UI,
 * and supports searching, filtering by tag, and sorting by update date.
 */

// Format a date string (ISO 8601) into YYYY-MM-DD format.
function formatDate(isoString) {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Load the projects data from the JSON file and initialize the app.
async function loadProjects() {
  try {
    const res = await fetch('projects.json');
    if (!res.ok) throw new Error(`加载项目列表失败：HTTP ${res.status}`);
    const data = await res.json();
    initApp(data);
  } catch (err) {
    console.error(err);
  }
}

// Initialize the app: populate controls and render cards.
function initApp(projects) {
  const searchInput = document.getElementById('search-input');
  const tagFilter = document.getElementById('tag-filter');
  const sortOrder = document.getElementById('sort-order');
  const grid = document.getElementById('grid');
  const template = document.getElementById('card-template');

  // Compute unique list of all topics across projects.
  const topicSet = new Set();
  projects.forEach(p => {
    if (Array.isArray(p.topics)) {
      p.topics.forEach(t => topicSet.add(t));
    }
  });
  // Populate tag filter options.
  const topics = Array.from(topicSet).sort();
  topics.forEach(topic => {
    const opt = document.createElement('option');
    opt.value = topic;
    opt.textContent = topic;
    tagFilter.appendChild(opt);
  });

  // Render projects initially and whenever controls change.
  function render() {
    // Get current control values.
    const query = searchInput.value.trim().toLowerCase();
    const selectedTag = tagFilter.value;
    const sortVal = sortOrder.value;
    // Filter and sort projects.
    let filtered = projects.filter(p => {
      const inName = p.name && p.name.toLowerCase().includes(query);
      const inDesc = p.description && p.description.toLowerCase().includes(query);
      const matchesSearch = !query || inName || inDesc;
      const matchesTag = !selectedTag || (Array.isArray(p.topics) && p.topics.includes(selectedTag));
      return matchesSearch && matchesTag;
    });
    filtered.sort((a, b) => {
      const aDate = new Date(a.date);
      const bDate = new Date(b.date);
      if (sortVal === 'asc') {
        return aDate - bDate;
      } else {
        return bDate - aDate;
      }
    });
    // Clear existing cards.
    grid.innerHTML = '';
    // Render each project as a card.
    filtered.forEach(p => {
      const card = template.content.cloneNode(true);
      const link = card.querySelector('.card-link');
      link.href = p.url || '#';
      const img = card.querySelector('.screenshot');
      if (p.screenshot) {
        img.src = p.screenshot;
      } else {
        img.src = 'placeholder_light_gray_block.png';
      }
      const titleEl = card.querySelector('.card-title');
      titleEl.textContent = p.name || '未命名项目';
      const descEl = card.querySelector('.card-desc');
      descEl.textContent = p.description || '';
      const tagsEl = card.querySelector('.tags');
      // Populate tags.
      if (Array.isArray(p.topics) && p.topics.length > 0) {
        p.topics.forEach(tag => {
          const span = document.createElement('span');
          span.className = 'tag';
          span.textContent = tag;
          tagsEl.appendChild(span);
        });
      }
      const dateEl = card.querySelector('.update-date');
      dateEl.textContent = p.date ? `更新于 ${formatDate(p.date)}` : '';
      grid.appendChild(card);
    });
  }

  // Attach event listeners.
  searchInput.addEventListener('input', render);
  tagFilter.addEventListener('change', render);
  sortOrder.addEventListener('change', render);
  // Initial render.
  render();
}

// Kick off the application once DOM is ready.
document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
});