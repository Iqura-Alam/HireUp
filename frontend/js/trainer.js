
const TRAINER_API = 'http://localhost:5000/api/trainer';

let selectedSkills = []; // Array of { id, name }

async function createCourse(event) {
    event.preventDefault();
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const duration_days = document.getElementById('duration_days').value;
    const mode = document.getElementById('mode').value;
    const fee = document.getElementById('fee').value;

    // Get IDs from selectedSkills
    const skill_ids = selectedSkills.map(s => s.id);

    if (skill_ids.length === 0) {
        alert('Please select at least one skill.');
        return;
    }

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${TRAINER_API}/add-course`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ title, description, duration_days, mode, fee, skill_ids })
        });

        if (response.ok) {
            alert('Course created successfully!');
            event.target.reset();
            selectedSkills = [];
            updateSkillTags();
            loadEnrollments();
        } else {
            const data = await response.json();
            alert(data.message || 'Failed to create course');
        }
    } catch (error) {
        console.error(error);
        alert('Error creating course');
    }
}

async function loadSkills() {
    const selector = document.getElementById('skill-selector');
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${TRAINER_API}/skills`, {
            headers: { 'x-auth-token': token }
        });
        const skills = await response.json();

        // Keep NEW option
        selector.innerHTML = '<option value="">-- Select a Skill --</option><option value="NEW">-- Create New Skill --</option>';
        skills.forEach(skill => {
            selector.innerHTML += `<option value="${skill.skill_id}">${skill.skill_name}</option>`;
        });
    } catch (error) {
        console.error('Error loading skills:', error);
    }
}

async function addSelectedSkill() {
    const selector = document.getElementById('skill-selector');
    const skillId = selector.value;
    const token = localStorage.getItem('token');

    if (skillId === 'NEW') {
        const newName = document.getElementById('new-skill-name').value.trim();
        if (!newName) {
            alert('Please enter a skill name.');
            return;
        }

        try {
            const response = await fetch(`${TRAINER_API}/skills`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ skill_name: newName })
            });
            const data = await response.json();

            if (response.ok) {
                selectedSkills.push({ id: data.skill_id, name: data.skill_name });
                document.getElementById('new-skill-name').value = '';
                document.getElementById('new-skill-container').classList.add('hidden');
                selector.value = '';
                await loadSkills(); // Refresh dropdown
                updateSkillTags();
            } else {
                alert(data.message || 'Error creating skill');
            }
        } catch (error) {
            console.error(error);
            alert('Error creating skill');
        }
    } else if (skillId) {
        const skillName = selector.options[selector.selectedIndex].text;
        if (!selectedSkills.find(s => s.id == skillId)) {
            selectedSkills.push({ id: parseInt(skillId), name: skillName });
            updateSkillTags();
        }
        selector.value = '';
    }
}

function updateSkillTags() {
    const container = document.getElementById('selected-skills-tags');
    container.innerHTML = '';
    selectedSkills.forEach((skill, index) => {
        const tag = document.createElement('span');
        tag.className = 'skill-tag'; // Assuming CSS has some style or adding inline
        tag.style = 'background: #e0e0e0; padding: 2px 8px; border-radius: 12px; font-size: 0.9em; display: flex; align-items: center; gap: 5px;';
        tag.innerHTML = `${skill.name} <span style="cursor:pointer; font-weight:bold;" onclick="removeSkill(${index})">×</span>`;
        container.appendChild(tag);
    });
}

function removeSkill(index) {
    selectedSkills.splice(index, 1);
    updateSkillTags();
}

// Handle NEW skill visibility
document.getElementById('skill-selector').addEventListener('change', function () {
    const container = document.getElementById('new-skill-container');
    if (this.value === 'NEW') {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
});

async function loadEnrollments() {
    const listDiv = document.getElementById('enrollments-list');
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${TRAINER_API}/enrollments`, {
            headers: { 'x-auth-token': token }
        });
        const data = await response.json();

        if (response.ok) {
            if (data.length === 0) {
                listDiv.innerHTML = '<p>No enrollments found.</p>';
                return;
            }

            let html = '<table border="1" style="width:100%; border-collapse: collapse;">';
            html += '<tr><th>Course</th><th>Candidate</th><th>Status</th><th>Enrolled At</th><th>Action</th></tr>';

            data.forEach(row => {
                html += `<tr>
                    <td>${row.title}</td>
                    <td>${row.candidate_name}</td>
                    <td>${row.completion_status}</td>
                    <td>${new Date(row.enrolled_at).toLocaleDateString()}</td>
                    <td>
                        ${row.completion_status !== 'Completed' ?
                        `<button onclick="completeCourse(${row.enrollment_id})">Mark Complete</button>` :
                        'Done'}
                    </td>
                </tr>`;
            });
            html += '</table>';
            listDiv.innerHTML = html;
        } else {
            listDiv.innerHTML = '<p>Error loading enrollments.</p>';
        }
    } catch (error) {
        console.error(error);
        listDiv.innerHTML = '<p>Error loading enrollments.</p>';
    }
}

async function completeCourse(enrollmentId) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${TRAINER_API}/complete-course`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ enrollment_id: enrollmentId })
        });

        if (response.ok) {
            alert('Course marked as completed!');
            loadEnrollments();
        } else {
            alert('Failed to update status');
        }
    } catch (error) {
        console.error(error);
        alert('Error updating status');
    }
}

// Load on start
loadEnrollments();
loadSkills();
