const API_BASE = 'http://localhost:5000/api/candidate';
let tomSelectInstance;
let currentProfile = null;
let currentSections = {};

// ==========================================
// Initialization & Data Fetching
// ==========================================
async function loadDashboardData() {
    console.log('Loading dashboard...');
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('skeleton-loader').style.display = 'grid';
    document.getElementById('dashboard-content').style.display = 'none';

    try {
        const response = await fetch(`${API_BASE}/dashboard-context`, {
            headers: { 'x-auth-token': token }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Dashboard data received:', data);

            setTimeout(() => {
                // EMERGENCY UI SHOW: Hide skeleton first so user doesn't get stuck
                document.getElementById('skeleton-loader').style.display = 'none';
                document.getElementById('dashboard-content').style.display = 'contents';

                try {
                    renderDashboard(data);
                } catch (e) {
                    console.error('Crash in renderDashboard:', e);
                }
            }, 500);

        } else {
            console.error('Failed to load dashboard context');
            document.getElementById('skeleton-loader').innerHTML = '<p style="color:red; text-align:center; padding: 2rem;">Server Error. Ensure database is updated.</p>';
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('skeleton-loader').innerHTML = '<p style="color:red; text-align:center; padding: 2rem;">Connection Error.</p>';
    }
}

// ==========================================
// Rendering
// ==========================================
function renderDashboard(data) {
    if (!data || !data.profile) {
        console.error('Profile missing');
        return;
    }

    currentProfile = data.profile;
    const { profile, sections, missing_sections } = data;
    currentSections = sections;

    const safeRender = (label, fn) => {
        try { fn(); } catch (e) { console.error(`Failed to render ${label}:`, e); }
    };

    safeRender('Profile Info', () => {
        document.getElementById('profile-name').textContent = profile.full_name || 'Your Name';
        document.getElementById('profile-email').textContent = profile.email || '';
        document.getElementById('profile-headline').textContent = profile.headline || 'Add a headline...';
        const loc = [profile.city, profile.country].filter(Boolean).join(', ');
        document.getElementById('profile-location').textContent = loc || 'Add location...';
        document.getElementById('profile-contact').textContent = profile.contact_number || 'Add contact...';
        document.getElementById('profile-experience').textContent = profile.experience_years !== null ? profile.experience_years : '0';

        const nameForAvatar = profile.first_name || (profile.full_name ? profile.full_name.split(' ')[0] : 'U');
        document.getElementById('avatar-initial').textContent = nameForAvatar.charAt(0).toUpperCase();
    });

    safeRender('Strength Bar', () => {
        const percentage = profile.completion_percentage || 0;
        const pBar = document.getElementById('progress-bar');
        const pText = document.getElementById('progress-text');
        if (pBar) setTimeout(() => { pBar.style.width = `${percentage}%`; }, 100);
        if (pText) pText.textContent = `${percentage}%`;

        const missingDiv = document.getElementById('missing-sections');
        if (missingDiv) {
            if (percentage < 100 && missing_sections && missing_sections.length > 0) {
                missingDiv.innerHTML = '<strong>Missing:</strong> ' + missing_sections.join(', ');
            } else {
                missingDiv.innerHTML = '<span style="color: green;">All set! Profile is strong.</span>';
            }
        }
    });

    safeRender('Experience List', () => renderList('experience-list', sections.experience, renderExperienceItem));
    safeRender('Education List', () => renderList('education-list', sections.education, renderEducationItem));
    safeRender('Project List', () => renderList('project-list', sections.projects, renderProjectItem));
    safeRender('Skills List', () => renderSkills(profile.skills));

    console.log('Rendering complete');
}

function renderList(elementId, items, itemRenderer) {
    const container = document.getElementById(elementId);
    if (!container) return;
    if (!items || items.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); font-style: italic;">Nothing added yet.</p>';
        return;
    }
    container.innerHTML = items.map(itemRenderer).join('');
}

function renderExperienceItem(item) {
    const end = item.is_current ? 'Present' : (item.end_date ? new Date(item.end_date).toLocaleDateString() : '');
    const start = item.start_date ? new Date(item.start_date).toLocaleDateString() : '';
    return `
        <div class="list-item" onclick="openEditExperienceModal('${item.experience_id}')">
            <div style="font-weight: bold;">${item.title}</div>
            <div>${item.company_name}</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">${start} - ${end}</div>
        </div>
    `;
}

function renderEducationItem(item) {
    const start = item.start_date ? new Date(item.start_date).getFullYear() : '';
    const end = item.end_date ? new Date(item.end_date).getFullYear() : '';
    return `
        <div class="list-item" onclick="openEditEducationModal('${item.education_id}')">
            <div style="font-weight: bold;">${item.institution}</div>
            <div>${item.degree} ${item.field_of_study ? 'in ' + item.field_of_study : ''}</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">${start} - ${end}</div>
        </div>
    `;
}

function renderProjectItem(item) {
    return `
        <div class="list-item" onclick="openEditProjectModal('${item.project_id}')">
            <div style="font-weight: bold;">${item.title}</div>
             <div style="font-size: 0.85rem; color: var(--text-muted);">${item.project_url || ''}</div>
            <div style="font-size: 0.9rem; margin-top: 0.25rem;">${item.description || ''}</div>
        </div>
    `;
}

function renderSkills(skills) {
    const skillsList = document.getElementById('skills-list');
    if (!skillsList) return;
    if (skills && skills.length > 0) {
        skillsList.innerHTML = skills.map(s => `
            <span class="skill-tag">
                 ${s.skill_name} 
                 <span style="opacity: 0.7; margin-left:5px; font-size: 0.8em;">${s.proficiency}</span>
            </span>
        `).join('');
    } else {
        skillsList.innerHTML = '<p style="color: var(--text-muted);">No skills added.</p>';
    }
}

// ==========================================
// Modal & Form Logic
// ==========================================
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function openEditProfileModal() {
    if (!currentProfile) return;
    document.getElementById('edit-headline').value = currentProfile.headline || '';
    document.getElementById('edit-summary').value = currentProfile.summary || '';
    document.getElementById('edit-city').value = currentProfile.city || '';
    document.getElementById('edit-country').value = currentProfile.country || '';
    document.getElementById('edit-contact').value = currentProfile.contact_number || '';
    document.getElementById('edit-exp-years').value = currentProfile.experience_years || '';
    document.getElementById('edit-linkedin').value = currentProfile.linkedin_url || '';
    document.getElementById('edit-github').value = currentProfile.github_url || '';
    document.getElementById('edit-portfolio').value = currentProfile.portfolio_url || '';
    document.getElementById('modal-profile').classList.remove('hidden');
}

async function saveProfileDetails(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const payload = {
        headline: document.getElementById('edit-headline').value,
        summary: document.getElementById('edit-summary').value,
        city: document.getElementById('edit-city').value,
        country: document.getElementById('edit-country').value,
        contact_number: document.getElementById('edit-contact').value,
        experience_years: document.getElementById('edit-exp-years').value,
        linkedin_url: document.getElementById('edit-linkedin').value,
        github_url: document.getElementById('edit-github').value,
        portfolio_url: document.getElementById('edit-portfolio').value
    };

    try {
        const res = await fetch(`${API_BASE}/profile-details`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            closeModal('modal-profile');
            loadDashboardData();
        } else { alert('Failed to save'); }
    } catch (e) { console.error(e); }
}

function openAddExperienceModal() {
    document.getElementById('exp-modal-title').textContent = 'Add Experience';
    document.getElementById('exp-id').value = '';
    document.querySelector('#modal-experience form').reset();
    document.getElementById('btn-delete-exp').classList.add('hidden');
    document.getElementById('modal-experience').classList.remove('hidden');
}

function openEditExperienceModal(id) {
    const item = currentSections.experience.find(x => x.experience_id == id);
    if (!item) return;
    document.getElementById('exp-modal-title').textContent = 'Edit Experience';
    document.getElementById('exp-id').value = item.experience_id;
    document.getElementById('exp-title').value = item.title;
    document.getElementById('exp-company').value = item.company_name;
    document.getElementById('exp-start').value = item.start_date ? item.start_date.split('T')[0] : '';
    document.getElementById('exp-end').value = item.end_date ? item.end_date.split('T')[0] : '';
    document.getElementById('exp-current').checked = item.is_current;
    document.getElementById('exp-desc').value = item.description;
    document.getElementById('btn-delete-exp').classList.remove('hidden');
    document.getElementById('modal-experience').classList.remove('hidden');
}

async function saveExperience(e) {
    e.preventDefault();
    const payload = {
        experience_id: document.getElementById('exp-id').value || null,
        title: document.getElementById('exp-title').value,
        company_name: document.getElementById('exp-company').value,
        start_date: document.getElementById('exp-start').value,
        end_date: document.getElementById('exp-end').value,
        is_current: document.getElementById('exp-current').checked,
        description: document.getElementById('exp-desc').value
    };
    await saveGeneric('experience', payload, 'modal-experience');
}

async function deleteExperience() {
    const id = document.getElementById('exp-id').value;
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/experience/${id}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
    closeModal('modal-experience');
    loadDashboardData();
}

function openAddEducationModal() {
    document.getElementById('edu-modal-title').textContent = 'Add Education';
    document.getElementById('edu-id').value = '';
    document.querySelector('#modal-education form').reset();
    document.getElementById('btn-delete-edu').classList.add('hidden');
    document.getElementById('modal-education').classList.remove('hidden');
}

function openEditEducationModal(id) {
    const item = currentSections.education.find(x => x.education_id == id);
    if (!item) return;
    document.getElementById('edu-modal-title').textContent = 'Edit Education';
    document.getElementById('edu-id').value = item.education_id;
    document.getElementById('edu-school').value = item.institution;
    document.getElementById('edu-degree').value = item.degree;
    document.getElementById('edu-field').value = item.field_of_study;
    document.getElementById('edu-start').value = item.start_date ? item.start_date.split('T')[0] : '';
    document.getElementById('edu-end').value = item.end_date ? item.end_date.split('T')[0] : '';
    document.getElementById('btn-delete-edu').classList.remove('hidden');
    document.getElementById('modal-education').classList.remove('hidden');
}

async function saveEducation(e) {
    e.preventDefault();
    const payload = {
        education_id: document.getElementById('edu-id').value || null,
        institution: document.getElementById('edu-school').value,
        degree: document.getElementById('edu-degree').value,
        field_of_study: document.getElementById('edu-field').value,
        start_date: document.getElementById('edu-start').value,
        end_date: document.getElementById('edu-end').value
    };
    await saveGeneric('education', payload, 'modal-education');
}

async function deleteEducation() {
    const id = document.getElementById('edu-id').value;
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/education/${id}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
    closeModal('modal-education');
    loadDashboardData();
}

function openAddProjectModal() {
    document.getElementById('proj-modal-title').textContent = 'Add Project';
    document.getElementById('proj-id').value = '';
    document.querySelector('#modal-project form').reset();
    document.getElementById('btn-delete-proj').classList.add('hidden');
    document.getElementById('modal-project').classList.remove('hidden');
}

function openEditProjectModal(id) {
    const item = currentSections.projects.find(x => x.project_id == id);
    if (!item) return;
    document.getElementById('proj-modal-title').textContent = 'Edit Project';
    document.getElementById('proj-id').value = item.project_id;
    document.getElementById('proj-title').value = item.title;
    document.getElementById('proj-url').value = item.project_url;
    document.getElementById('proj-desc').value = item.description;
    document.getElementById('btn-delete-proj').classList.remove('hidden');
    document.getElementById('modal-project').classList.remove('hidden');
}

async function saveProject(e) {
    e.preventDefault();
    const payload = {
        project_id: document.getElementById('proj-id').value || null,
        title: document.getElementById('proj-title').value,
        project_url: document.getElementById('proj-url').value,
        description: document.getElementById('proj-desc').value
    };
    await saveGeneric('project', payload, 'modal-project');
}

async function deleteProject() {
    const id = document.getElementById('proj-id').value;
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/project/${id}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
    closeModal('modal-project');
    loadDashboardData();
}

async function saveGeneric(endpoint, payload, modalId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            closeModal(modalId);
            loadDashboardData();
        } else { alert('Failed'); }
    } catch (e) { console.error(e); }
}

// ==========================================
// Skills
// ==========================================
async function initSkillSelect() {
    const token = localStorage.getItem('token');
    if (!document.getElementById('skill-select')) return;
    try {
        const res = await fetch(`${API_BASE}/list`, { headers: { 'x-auth-token': token } });
        const skills = await res.json();
        const options = skills.map(s => ({ value: s.skill_id, text: s.skill_name, standard: true }));
        tomSelectInstance = new TomSelect("#skill-select", {
            options, create: true, placeholder: "Search skills...", maxItems: 1, dropdownParent: "body"
        });
    } catch (e) { console.error(e); }
}

function toggleSkillForm() {
    const form = document.getElementById('skill-form-container');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function addSkill(event) {
    event.preventDefault();
    const token = localStorage.getItem('token');
    const selectedVal = tomSelectInstance.getValue();
    const proficiency = document.getElementById('proficiency').value;
    const years = document.getElementById('years_experience').value;
    if (!selectedVal) return;

    let payload = { proficiency, years_experience: parseFloat(years) };
    const selectedOption = tomSelectInstance.options[selectedVal];
    if (selectedOption && selectedOption.standard) payload.skill_name = selectedOption.text;
    else { payload.skill_name = selectedVal; payload.custom_name = selectedVal; }

    try {
        const res = await fetch(`${API_BASE}/skill`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': token }, body: JSON.stringify(payload)
        });
        if (res.ok) { tomSelectInstance.clear(); loadDashboardData(); }
    } catch (e) { console.error(e); }
}

// ==========================================
// Lifecycle
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    try { if (typeof checkAuth === 'function') checkAuth(); } catch (e) { }
    try { initSkillSelect(); } catch (e) { }
    try { loadDashboardData(); } catch (e) { }
});
