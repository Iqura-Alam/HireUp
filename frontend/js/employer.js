const API_BASE = 'http://localhost:5000/api/employer';

async function loadEmployerProfile() {
    try {
        const response = await fetch(`${API_BASE}/profile`, {
            headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        const data = await response.json();

        if (response.ok) {
            document.getElementById('comp-name').textContent = data.company_name;
            document.getElementById('comp-industry').textContent = data.industry;
            document.getElementById('comp-location').textContent = data.location;
            document.getElementById('comp-website').textContent = data.website || 'N/A';
            document.getElementById('comp-website').href = data.website || '#';
            document.getElementById('nav-username').textContent = data.company_name;

            // Pre-fill edit form
            document.getElementById('edit-name').value = data.company_name;
            document.getElementById('edit-industry').value = data.industry;
            document.getElementById('edit-location').value = data.location;
            document.getElementById('edit-contact').value = data.contact_number;
            document.getElementById('edit-website').value = data.website;
        }
    } catch (err) {
        console.error(err);
    }
}

async function updateProfile(e) {
    e.preventDefault();
    const payload = {
        company_name: document.getElementById('edit-name').value,
        industry: document.getElementById('edit-industry').value,
        location: document.getElementById('edit-location').value,
        contact_number: document.getElementById('edit-contact').value,
        website: document.getElementById('edit-website').value
    };

    try {
        const res = await fetch(`${API_BASE}/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': localStorage.getItem('token')
            },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert('Profile updated!');
            closeModal('editProfileModal');
            loadEmployerProfile();
        } else {
            alert('Failed to update profile');
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadJobs() {
    try {
        const res = await fetch(`${API_BASE}/jobs`, {
            headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        const jobs = await res.json();

        const list = document.getElementById('jobs-list');
        list.innerHTML = '';

        if (jobs.length === 0) {
            list.innerHTML = '<p style="color: var(--text-muted);">No jobs posted yet.</p>';
            return;
        }

        jobs.forEach(job => {
            const div = document.createElement('div');
            div.className = 'job-card';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <div>
                        <h4>${job.title}</h4>
                        <p style="font-size: 0.9rem; color: var(--text-muted);">${job.location} | ${job.salary_range || 'Salary Neg.'}</p>
                        <p style="font-size: 0.9rem; margin-top: 0.5rem;">${job.description.substring(0, 100)}...</p>
                        <small style="color: ${new Date(job.expires_at) < new Date() ? 'red' : 'green'}">
                            Expires: ${new Date(job.expires_at).toLocaleDateString()}
                        </small>
                    </div>
                    <div style="text-align: right;">
                        <span style="display:block; font-size: 1.5rem; font-weight: bold;">${job.application_count}</span>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">Applicants</span>
                        <button onclick="viewApplications(${job.job_id})" class="btn" style="margin-top: 0.5rem; font-size: 0.8rem; padding: 0.5rem 1rem;">View Applicants</button>
                    </div>
                </div>
            `;
            list.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}


let skillSelectInstance = null;

async function loadSkills() {
    try {
        const res = await fetch(`${API_BASE}/skills`, {
            headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        const skills = await res.json();

        const select = document.getElementById('job-skills');
        select.innerHTML = '';
        skills.forEach(skill => {
            const option = document.createElement('option');
            option.value = skill.skill_id;
            // Show type in small text if possible, or just name
            option.textContent = skill.skill_name;
            select.appendChild(option);
        });

        // Init Tom Select
        if (skillSelectInstance) {
            skillSelectInstance.destroy();
        }
        skillSelectInstance = new TomSelect('#job-skills', {
            plugins: ['remove_button'],
            create: false,
            placeholder: 'Select required skills...'
        });
    } catch (err) {
        console.error(err);
    }
}

async function postJob(e) {
    e.preventDefault();

    // Get values from Tom Select
    // .getValue() returns array of strings, we need integers
    const selectedValues = skillSelectInstance ? skillSelectInstance.getValue() : [];
    // If user only selects one, it might be a string, or an array depending on config. 
    // Tom Select with 'multiple' usually returns array.

    // Ensure it is an array
    const skillIdsRaw = Array.isArray(selectedValues) ? selectedValues : [selectedValues];
    const skillIds = skillIdsRaw.map(id => parseInt(id)).filter(id => !isNaN(id));

    // Default proficiencies to 'Beginner' for now
    const proficiencies = skillIds.map(() => 'Beginner');

    // Get Questions
    const questions = Array.from(document.querySelectorAll('.question-input'))
        .map(input => input.value.trim())
        .filter(val => val !== '');

    const payload = {
        title: document.getElementById('job-title').value,
        description: document.getElementById('job-desc').value,
        location: document.getElementById('job-location').value,
        salary_range: document.getElementById('job-salary').value,
        expires_at: document.getElementById('job-expiry').value,
        skill_ids: skillIds,
        min_proficiencies: proficiencies,
        questions: questions
    };

    try {
        const res = await fetch(`${API_BASE}/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': localStorage.getItem('token')
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('Job posted successfully!');
            closeModal('postJobModal');
            loadJobs();
            e.target.reset();
            if (skillSelectInstance) skillSelectInstance.clear();
            document.getElementById('questions-container').innerHTML = ''; // Clear questions
        } else {
            const data = await res.json();
            alert(data.message || 'Failed to post job');
        }
    } catch (err) {
        console.error(err);
    }
}

async function viewApplications(jobId) {
    try {
        const res = await fetch(`${API_BASE}/jobs/${jobId}/applications`, {
            headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        const apps = await res.json();

        const list = document.getElementById('applicants-list');
        list.innerHTML = '';

        if (apps.length === 0) {
            list.innerHTML = '<p>No applications yet.</p>';
        } else {
            apps.forEach(app => {
                console.log('App Data:', app); // DEBUG
                const div = document.createElement('div');
                div.className = 'applicant-item';

                let actions = '';
                if (app.status === 'Applied') {
                    actions = `
                        <button onclick="updateAppStatus(${app.application_id}, 'shortlist')" class="btn" style="background:var(--primary-color); padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 5px;">Shortlist</button>
                        <button onclick="updateAppStatus(${app.application_id}, 'reject')" class="btn" style="background:#ef4444; padding: 0.25rem 0.5rem; font-size: 0.8rem;">Reject</button>
                    `;
                } else if (app.status === 'Shortlisted') {
                    actions = `
                        <button onclick="updateAppStatus(${app.application_id}, 'hire')" class="btn" style="background:#22c55e; padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 5px;">Hire</button>
                        <button onclick="updateAppStatus(${app.application_id}, 'reject')" class="btn" style="background:#ef4444; padding: 0.25rem 0.5rem; font-size: 0.8rem;">Reject</button>
                    `;
                } else {
                    let color = 'var(--text-muted)';
                    if (app.status === 'Hired') color = '#22c55e';
                    if (app.status === 'Rejected') color = '#ef4444';
                    actions = `<span style="font-weight:bold; color: ${color}">${app.status}</span>`;
                }

                let answersHtml = '';
                if (app.answers && app.answers.length > 0) {
                    answersHtml = '<div style="margin-top: 0.5rem; background: rgba(255,255,255,0.05); padding: 0.5rem; border-radius: 4px; font-size: 0.85rem;">';
                    app.answers.forEach(ans => {
                        if (ans.question_text) {
                            answersHtml += `<strong>Q: ${ans.question_text}</strong><br>A: ${ans.answer_text}<br>`;
                        }
                    });
                    answersHtml += '</div>';
                }

                div.innerHTML = `
                    <div>
                        <strong>${app.full_name}</strong> (${app.email})<br>
                        <small>Exp: ${app.experience_years} Years</small><br>
                        <small>Applied: ${new Date(app.applied_at).toLocaleDateString()}</small><br>
                        <div style="margin-top: 0.5rem; display: flex; gap: 1rem;">
                            <a href="profile.html?type=candidate&id=${app.candidate_id}" style="color: var(--primary-color); font-size: 0.9rem; text-decoration: underline;">View Profile</a>
                            <a href="javascript:void(0)" onclick="downloadCV(${app.application_id})" style="color: var(--primary-color); font-size: 0.9rem; text-decoration: underline;">Download CV</a>
                        </div>
                        ${answersHtml}
                    </div>
                    <div>
                        ${actions}
                    </div>
                `;
                list.appendChild(div);
            });
        }

        document.getElementById('applicantsModal').style.display = 'block';
    } catch (err) {
        console.error(err);
    }
}

async function downloadCV(appId) {
    try {
        const res = await fetch(`${API_BASE}/applications/${appId}/cv`, {
            headers: { 'x-auth-token': localStorage.getItem('token') }
        });

        if (!res.ok) {
            const data = await res.json();
            alert(data.message || 'Download failed');
            return;
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `CV_App_${appId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error(err);
        alert('Error downloading CV');
    }
}

async function updateAppStatus(appId, action) {
    if (!confirm(`Are you sure you want to ${action} this candidate?`)) return;

    try {
        const res = await fetch(`${API_BASE}/applications/${appId}/${action}`, {
            method: 'PUT',
            headers: { 'x-auth-token': localStorage.getItem('token') }
        });

        if (res.ok) {
            alert(`Application ${action}ed!`);
            // Refresh the modal content is hard without context, 
            // easier to close for now or reload jobs list. 
            // We can just close modal to force refresh next open.
            document.getElementById('applicantsModal').style.display = 'none';
            loadJobs();
        } else {
            alert('Action failed');
        }
    } catch (err) {
        console.error(err);
    }
}

// Modal Helpers
function openEditProfile() {
    document.getElementById('editProfileModal').style.display = 'block';
}

function openPostJob() {
    document.getElementById('postJobModal').style.display = 'block';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

// Close modal if clicked outside
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}

function addQuestion() {
    const container = document.getElementById('questions-container');
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '0.5rem';
    div.style.marginBottom = '0.5rem';

    div.innerHTML = `
        <input type="text" class="question-input" placeholder="Enter your question here..." style="flex: 1;">
        <button type="button" onclick="this.parentElement.remove()" class="btn" style="background: #ef4444; width: auto; padding: 0.5rem;">X</button>
    `;
    container.appendChild(div);
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
