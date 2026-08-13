// ============================================
// Makbel Portfolio
// Main JavaScript File
// ============================================

const year = document.getElementById('year');
if (year) {
  year.textContent = new Date().getFullYear();
}

const adminButton = document.getElementById('adminBtn');
const adminPanel = document.getElementById('adminPanel');
const adminForm = document.getElementById('adminProjectForm');
const adminStatus = document.getElementById('adminStatus');
const adminTitle = document.getElementById('adminTitle');
const adminDescription = document.getElementById('adminDescription');
const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');
const projectContainer = document.getElementById('projectContainer');

const fallbackProjects = [
  {
    id: 'project-1',
    title: 'AI Study Assistant',
    description: 'A web app that helps learners review topics with guided prompts and summaries.'
  },
  {
    id: 'project-2',
    title: 'Portfolio CMS',
    description: 'A simple content management flow for updating portfolio projects from the admin panel.'
  }
];

let adminPassword = '';

function renderProjects(projects) {
  if (!projectContainer) {
    return;
  }

  if (!projects.length) {
    projectContainer.innerHTML = '<div class="empty-state">Projects will appear here once content is added.</div>';
    return;
  }

  projectContainer.innerHTML = projects
    .map((project) => `
      <article class="project-card">
        <h3>${project.title}</h3>
        <p>${project.description}</p>
      </article>
    `)
    .join('');
}

async function loadProjects() {
  try {
    const response = await fetch('/api/items');
    if (!response.ok) {
      throw new Error('Unable to load projects');
    }

    const projects = await response.json();
    renderProjects(Array.isArray(projects) ? projects : []);
  } catch (error) {
    console.warn('Using fallback portfolio content.', error);
    renderProjects(fallbackProjects);
  }
}

adminButton?.addEventListener('click', async () => {
  const password = window.prompt('Enter admin password');

  if (!password) {
    return;
  }

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      throw new Error('Invalid password');
    }

    adminPassword = password;
    adminPanel?.classList.remove('hidden');
    await loadProjects();
    if (adminStatus) {
      adminStatus.textContent = 'Admin access confirmed. You can add a new project.';
    }
    if (adminButton) {
      adminButton.textContent = 'Admin ✓';
    }
  } catch (error) {
    if (adminStatus) {
      adminStatus.textContent = 'Login failed. Please try again.';
    }
    console.error(error);
  }
});

adminForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!adminPassword) {
    if (adminStatus) {
      adminStatus.textContent = 'Please log in as admin first.';
    }
    return;
  }

  const title = adminTitle?.value.trim() || '';
  const description = adminDescription?.value.trim() || '';

  if (!title || !description) {
    if (adminStatus) {
      adminStatus.textContent = 'Please fill both title and description.';
    }
    return;
  }

  try {
    const response = await fetch('/api/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': adminPassword
      },
      body: JSON.stringify({
        title,
        description
      })
    });

    if (!response.ok) {
      throw new Error('Unable to create project');
    }

    adminForm.reset();
    if (adminStatus) {
      adminStatus.textContent = 'Project added successfully.';
    }
    await loadProjects();
  } catch (error) {
    if (adminStatus) {
      adminStatus.textContent = 'Project could not be added.';
    }
    console.error(error);
  }
});

contactForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  if (formStatus) {
    formStatus.textContent = 'Thanks for reaching out. Your message is ready to send.';
  }

  contactForm.reset();
});

loadProjects();
