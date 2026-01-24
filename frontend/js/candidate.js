const API_BASE = 'http://localhost:5000/api/candidate';
let tomSelectInstance;

async function loadProfile() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE}/profile`, {
            headers: { 'x-auth-token': token }
        });

        const data = await response.json();

        if (response.ok) {
            renderProfile(data);
        } else {
            console.error('Failed to load profile:', data.message);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function initSkillSelect() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_BASE}/list`, {
            headers: { 'x-auth-token': token }
        });
        const skills = await response.json();

        // Transform for Tom Select with a 'standard' flag
        const options = skills.map(s => ({ value: s.skill_id, text: s.skill_name, standard: true }));

        tomSelectInstance = new TomSelect("#skill-select", {
            options: options,
            create: true, // Allow custom skills
            sortField: {
                field: "text",
                direction: "asc"
            },
            placeholder: "Search for a skill...",
            maxItems: 1
        });

    } catch (error) {
        console.error('Error loading Master Skill List:', error);
    }
}

function renderProfile(data) {
    const cand = data.candidate;
    document.getElementById('profile-name').textContent = cand.full_name;
    document.getElementById('nav-username').textContent = cand.first_name || 'User';
    document.getElementById('profile-email').textContent = cand.email || '—';

    // Address
    const address = [cand.city, cand.division, cand.country].filter(Boolean).join(', ');
    document.getElementById('profile-location').textContent = address || 'Not set';
    document.getElementById('profile-experience').textContent = cand.experience_years;

    const enrollmentsList = document.getElementById('enrollments-list');
    if (data.enrollments && data.enrollments.length > 0) {
        enrollmentsList.innerHTML = data.enrollments.map(e => `
            <div style="margin-bottom: 1rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">
                <strong>${e.course_title}</strong> - <span style="color: ${e.status === 'Completed' ? 'green' : 'orange'}">${e.status}</span><br>
                <small>Skills: ${e.skills_covered ? e.skills_covered.join(', ') : 'None'}</small>
            </div>
        `).join('');
    } else {
        enrollmentsList.innerHTML = '<p>No active enrollments.</p>';
    }

    const skillsList = document.getElementById('skills-list');
    if (data.skills && data.skills.length > 0) {
        skillsList.innerHTML = data.skills.map(s => `
            <span class="skill-tag">
                 ${s.skill_name} 
                 <span>${s.proficiency}</span>
                 <span style="font-weight:normal; font-size:0.7em; color:#666">(${s.years || 0}y)</span>
            </span>
        `).join('');
    } else {
        skillsList.innerHTML = '<p>No skills added yet.</p>';
    }
}

async function addSkill(event) {
    event.preventDefault();
    const token = localStorage.getItem('token');

    // Get values
    const selectedVal = tomSelectInstance.getValue(); // ID (string) or custom text
    const proficiency = document.getElementById('proficiency').value;
    const years = document.getElementById('years_experience').value;
    const msgDiv = document.getElementById('skill-message');

    if (!selectedVal) {
        msgDiv.textContent = 'Please select or type a skill';
        msgDiv.style.color = 'red';
        return;
    }

    // Determine payload
    let payload = {
        proficiency,
        years_experience: parseFloat(years)
    };


    // Check if the selected option is a 'standard' one from our database
    const selectedOption = tomSelectInstance.options[selectedVal];

    if (selectedOption && selectedOption.standard) {
        // It's a known database ID
        payload.skill_id = parseInt(selectedVal);
    } else {
        // It's a new custom skill
        payload.skill_id = 0; // Convention for 'Other'
        payload.custom_name = selectedVal;
    }

    try {
        const response = await fetch(`${API_BASE}/skill`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify(payload)
        });

        const resData = await response.json();

        if (response.ok) {
            msgDiv.textContent = 'Skill added!';
            msgDiv.style.color = 'green';
            tomSelectInstance.clear();
            loadProfile();
        } else {
            msgDiv.textContent = resData.message || 'Failed to add skill';
            msgDiv.style.color = 'red';
        }
    } catch (error) {
        console.error('Error adding skill:', error);
        msgDiv.textContent = 'Server error';
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadProfile();
    initSkillSelect();
});
