const API_BASE = 'http://localhost:5000/api/candidate';
let tomSelectInstance;
let currentProfile = null;
let currentSections = {};

// Initialization & Data Fetching
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
                    loadTopSkills(); // Fetch top skills
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

        // Render Summary if it exists
        const summaryEl = document.getElementById('profile-summary');
        if (summaryEl) {
            summaryEl.textContent = profile.summary || 'No summary provided.';
        }

        // Smart Location Rendering: Show (City, Division) or (City, Country)
        let loc = '';
        if (profile.city && profile.division) {
            loc = `${profile.city}, ${profile.division}`;
        } else {
            loc = [profile.city, profile.country].filter(Boolean).join(', ');
        }
        document.getElementById('profile-location').textContent = loc || 'Add location...';
        document.getElementById('profile-contact').textContent = profile.contact_number || 'Add contact...';
        document.getElementById('profile-experience').textContent = profile.experience_years !== null ? profile.experience_years : '0';

        // Social Links
        const lnkLI = document.getElementById('link-linkedin');
        const lnkGH = document.getElementById('link-github');

        if (profile.linkedin_url) {
            lnkLI.href = profile.linkedin_url;
            lnkLI.style.display = 'inline-block';
        } else { lnkLI.style.display = 'none'; }

        if (profile.github_url) {
            lnkGH.href = profile.github_url;
            lnkGH.style.display = 'inline-block';
        } else { lnkGH.style.display = 'none'; }

        // Job Preferences
        document.getElementById('pref-role').textContent = profile.desired_job_title || 'Not specified';
        document.getElementById('pref-type').textContent = profile.employment_type || 'Not specified';
        document.getElementById('pref-mode').textContent = profile.work_mode_preference || 'Not specified';

        let salaryText = 'Not specified';
        if (profile.expected_salary_min || profile.expected_salary_max) {
            const currency = profile.currency || 'BDT';
            const min = profile.expected_salary_min || '0';
            const max = profile.expected_salary_max || 'Any';
            salaryText = `${currency} ${min} - ${max}`;
        }
        document.getElementById('pref-salary').textContent = salaryText;
        document.getElementById('pref-notice').textContent = profile.notice_period_days !== null ? `${profile.notice_period_days} Days` : 'Not specified';
        document.getElementById('pref-relocate').textContent = profile.willing_to_relocate === true ? 'Yes' : (profile.willing_to_relocate === false ? 'No' : 'Not specified');

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
    document.getElementById('edit-division').value = currentProfile.division || '';
    document.getElementById('edit-country').value = currentProfile.country || '';
    document.getElementById('edit-contact').value = currentProfile.contact_number || '';
    document.getElementById('edit-exp-years').value = currentProfile.experience_years || '';
    document.getElementById('edit-linkedin').value = currentProfile.linkedin_url || '';
    document.getElementById('edit-github').value = currentProfile.github_url || '';
    document.getElementById('modal-profile').classList.remove('hidden');
}

async function saveProfileDetails(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const payload = {
        headline: document.getElementById('edit-headline').value,
        summary: document.getElementById('edit-summary').value,
        city: document.getElementById('edit-city').value,
        division: document.getElementById('edit-division').value,
        country: document.getElementById('edit-country').value,
        contact_number: document.getElementById('edit-contact').value,
        experience_years: document.getElementById('edit-exp-years').value,
        linkedin_url: document.getElementById('edit-linkedin').value,
        github_url: document.getElementById('edit-github').value
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

function openEditPreferencesModal() {
    if (!currentProfile) return;
    document.getElementById('edit-pref-title').value = currentProfile.desired_job_title || '';
    document.getElementById('edit-pref-type').value = currentProfile.employment_type || '';
    document.getElementById('edit-pref-mode').value = currentProfile.work_mode_preference || '';
    document.getElementById('edit-pref-sal-min').value = currentProfile.expected_salary_min || '';
    document.getElementById('edit-pref-sal-max').value = currentProfile.expected_salary_max || '';
    document.getElementById('edit-pref-notice').value = currentProfile.notice_period_days !== null ? currentProfile.notice_period_days : '';
    document.getElementById('edit-pref-relocate').checked = currentProfile.willing_to_relocate === true;

    document.getElementById('modal-preferences').classList.remove('hidden');
}

async function savePreferences(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const payload = {
        desired_job_title: document.getElementById('edit-pref-title').value,
        employment_type: document.getElementById('edit-pref-type').value,
        work_mode_preference: document.getElementById('edit-pref-mode').value,
        expected_salary_min: document.getElementById('edit-pref-sal-min').value,
        expected_salary_max: document.getElementById('edit-pref-sal-max').value,
        notice_period_days: document.getElementById('edit-pref-notice').value,
        willing_to_relocate: document.getElementById('edit-pref-relocate').checked
    };

    try {
        const res = await fetch(`${API_BASE}/job-preferences`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            closeModal('modal-preferences');
            loadDashboardData();
        } else {
            const errorData = await res.json();
            alert('Failed to save preferences: ' + (errorData.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error saving preferences:', err);
        alert('An error occurred while saving preferences.');
    }
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

async function deleteAccount() {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;

    try {
        const res = await fetch(`${API_BASE}/profile`, {
            method: 'DELETE',
            headers: { 'x-auth-token': localStorage.getItem('token') }
        });

        if (res.ok) {
            alert('Account deleted successfully.');
            logout();
        } else {
            const data = await res.json();
            alert(data.message || 'Failed to delete account');
        }
    } catch (err) {
        console.error('Delete Account Error:', err);
        alert('An error occurred while deleting the account.');
    }
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
// Enrollments & Notifications
// ==========================================
async function loadEnrollments() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('enrollments-list');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/my-enrollments`, {
            headers: { 'x-auth-token': token }
        });
        if (!res.ok) return;
        const enrollments = await res.json();

        if (enrollments.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); font-style: italic;">No active enrollments.</p>';
            return;
        }

        // Check for acceptance/rejection notifications
        const updates = enrollments.filter(e => e.status === 'Shortlisted' || e.status === 'Rejected');
        if (updates.length > 0) {
            const msgs = updates.map(e => {
                const label = e.status === 'Shortlisted' ? '✅ Accepted' : '❌ Rejected';
                return `${label}: ${e.course_title}`;
            });
            // Show notification once per session
            const notifKey = 'enrollment_notif_shown';
            if (!sessionStorage.getItem(notifKey)) {
                sessionStorage.setItem(notifKey, 'true');
                alert('Enrollment Updates:\\n\\n' + msgs.join('\\n'));
            }
        }

        // Render enrollment table
        let html = '<table style="width:100%; border-collapse:collapse;">';
        html += '<thead><tr><th style="text-align:left; padding:0.5rem; border-bottom:1px solid var(--glass-border); color:var(--text-muted);">Course</th><th style="text-align:left; padding:0.5rem; border-bottom:1px solid var(--glass-border); color:var(--text-muted);">Trainer</th><th style="text-align:left; padding:0.5rem; border-bottom:1px solid var(--glass-border); color:var(--text-muted);">Status</th></tr></thead><tbody>';

        enrollments.forEach(e => {
            let badgeColor = '#fbbf24'; // Applied - yellow
            let label = e.status;
            if (e.status === 'Shortlisted') { badgeColor = '#34d399'; label = 'Accepted'; }
            if (e.status === 'Rejected') { badgeColor = '#ef4444'; label = 'Rejected'; }
            if (e.completion_status === 'Completed') {
                badgeColor = '#10b981';
                label = 'Completed';
            }

            let reviewBtn = '';
            if (e.completion_status === 'Completed') {
                if (e.has_reviewed) {
                    reviewBtn = `<button onclick="openViewReviews('${e.course_id}', '${e.course_title.replace(/'/g, "\\'")}')" class="btn" style="width: auto; padding: 0.2rem 0.6rem; font-size: 0.75rem; background: rgba(168, 85, 247, 0.2); border: 1px solid var(--primary-color);">View Review</button>`;
                } else {
                    reviewBtn = `<button onclick="openReviewModal('${e.course_id}', '${e.course_title.replace(/'/g, "\\'")}')" class="btn" style="width: auto; padding: 0.2rem 0.6rem; font-size: 0.75rem; background: #10b981;">Review</button>`;
                }
            } else if (e.status === 'Shortlisted') {
                // Option to view general reviews even if not completed
                reviewBtn = `<button onclick="openViewReviews('${e.course_id}', '${e.course_title.replace(/'/g, "\\'")}')" class="btn" style="width: auto; padding: 0.2rem 0.6rem; font-size: 0.75rem; background: transparent; border: 1px solid var(--glass-border); color: var(--text-muted);">Reviews</button>`;
            }

            html += `<tr>
                <td style="padding:0.5rem; border-bottom:1px solid rgba(255,255,255,0.05);">${e.course_title}</td>
                <td style="padding:0.5rem; border-bottom:1px solid rgba(255,255,255,0.05); color:var(--text-muted);">${e.trainer_name || '—'}</td>
                <td style="padding:0.5rem; border-bottom:1px solid rgba(255,255,255,0.05);"><span style="background:rgba(${badgeColor === '#34d399' ? '52,211,153' : badgeColor === '#ef4444' ? '239,68,68' : badgeColor === '#10b981' ? '16,185,129' : '251,191,36'},0.2); color:${badgeColor}; padding:0.2rem 0.6rem; border-radius:12px; font-size:0.8rem; font-weight:600;">${label}</span></td>
                <td style="padding:0.5rem; border-bottom:1px solid rgba(255,255,255,0.05); text-align:right;">${reviewBtn}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;

    } catch (error) {
        console.error('Error loading enrollments:', error);
    }
}

// ==========================================
// ==========================================
// Top Skills
// ==========================================
async function loadTopSkills() {
    const listDiv = document.getElementById('top-skills-list');
    if (!listDiv) return;

    try {
        const response = await fetch(`${API_BASE}/top-skills`, {
            headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        const skills = await response.json();

        if (!skills || skills.length === 0) {
            listDiv.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 1rem;">No data available</div>';
            return;
        }

        listDiv.innerHTML = skills.map((s, index) => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 8px; transition: transform 0.2s ease;" 
                 onmouseover="this.style.transform='translateX(5px)'" onmouseout="this.style.transform='translateX(0)'">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span style="font-weight: bold; color: ${index < 3 ? 'var(--primary-color)' : 'var(--text-muted)'}; font-size: 0.9rem;">#${index + 1}</span>
                    <span style="font-size: 0.9rem; font-weight: 500;">${s.skill_name}</span>
                </div>
                <div style="background: rgba(52, 211, 153, 0.1); color: #34d399; padding: 0.1rem 0.5rem; border-radius: 10px; font-size: 0.7rem; font-weight: bold;">
                    ${s.demand_count} jobs
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Top skills error:', err);
        listDiv.innerHTML = '<div style="text-align: center; color: #fca5a5; padding: 1rem; font-size: 0.8rem;">Failed to load skills</div>';
    }
}

// Lifecycle
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    try { if (typeof checkAuth === 'function') checkAuth(); } catch (e) { }
    try { initSkillSelect(); } catch (e) { }
    try { loadDashboardData(); } catch (e) { }
    try { loadEnrollments(); } catch (e) { }
});
// Review Modal Logic (Reused from courses.html or similar)
function openReviewModal(courseId, title) {
    // We need the review modal to be present in candidate_dashboard.html too
    // Let's check if it's there. If not, we might need to add it or redirect.
    // For now, let's assume it's added to the HTML.
    const modal = document.getElementById('reviewModal');
    if (!modal) {
        alert('Please go to the Courses page to review this course.');
        window.location.href = 'courses.html';
        return;
    }
    document.getElementById('review-course-id').value = courseId;
    document.getElementById('review-course-title').textContent = title;
    modal.classList.remove('hidden');
}

async function openViewReviews(courseId, title) {
    const modal = document.getElementById('viewReviewsModal');
    if (!modal) {
        alert('Please go to the Courses page to view reviews.');
        window.location.href = 'courses.html';
        return;
    }
    document.getElementById('view-reviews-title').textContent = `Reviews for ${title}`;
    modal.classList.remove('hidden');
    const container = document.getElementById('reviews-container');
    container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">Loading reviews...</p>';

    try {
        const res = await fetch(`${API_BASE}/courses/${courseId}/reviews`, {
            headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        const reviews = await res.json();

        if (reviews.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No reviews yet.</p>';
            return;
        }

        container.innerHTML = reviews.map(r => `
            <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; border: 1px solid var(--glass-border); margin-bottom: 0.75rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <span style="font-weight: 600; color: var(--primary-color);">${r.username}</span>
                    <span style="color: #fbbf24;">${'★'.repeat(r.rating)}</span>
                </div>
                <p style="margin: 0; font-size: 0.95rem; line-height: 1.5;">${r.review_text || '<span style="color: var(--text-muted); font-style: italic;">No comment.</span>'}</p>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="color: #fca5a5; text-align: center; padding: 1rem;">Failed to load reviews.</p>';
    }
}

function closeViewReviewsModal() {
    document.getElementById('viewReviewsModal').classList.add('hidden');
}

function closeReviewModal() {
    document.getElementById('reviewModal').classList.add('hidden');
}
