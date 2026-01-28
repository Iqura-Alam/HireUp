
const TRAINER_API = 'http://localhost:5000/api/trainer';

let selectedSkills = []; // Array of { id, name }
let allCourses = []; // Store fetched courses globally
let allEnrollments = []; // Store fetched enrollments globally

async function createCourse(event) {
    event.preventDefault();
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const duration_days = document.getElementById('duration_days').value;
    const mode = document.getElementById('mode').value;
    const fee = document.getElementById('fee').value;

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
            loadCourses();
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

        selector.innerHTML = '<option value="">-- Select a Skill --</option><option value="NEW">-- Create New Skill --</option>';
        skills.forEach(skill => {
            const option = document.createElement('option');
            option.value = skill.skill_id;
            option.textContent = skill.skill_name;
            selector.appendChild(option);
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
                await loadSkills();
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
        tag.className = 'skill-tag';
        tag.innerHTML = `${skill.name} <span style="cursor:pointer; font-weight:bold; margin-left: 5px;" onclick="removeSkill(${index})">×</span>`;
        container.appendChild(tag);
    });
}

function removeSkill(index) {
    selectedSkills.splice(index, 1);
    updateSkillTags();
}

document.getElementById('skill-selector').addEventListener('change', function () {
    const container = document.getElementById('new-skill-container');
    if (this.value === 'NEW') {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
});

async function loadCourses() {
    const coursesDiv = document.getElementById('courses-list');
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${TRAINER_API}/courses`, {
            headers: { 'x-auth-token': token }
        });
        const courses = await response.json();

        if (response.ok) {
            allCourses = courses;
            document.getElementById('stat-courses').textContent = courses.length;
            if (courses.length === 0) {
                coursesDiv.innerHTML = '<p style="color: var(--text-muted);">No courses published yet.</p>';
                return;
            }

            coursesDiv.innerHTML = courses.map(c => `
                <div class="course-card">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <h4 style="margin: 0 0 0.5rem 0; color: #a855f7; cursor: pointer; text-decoration: underline;" 
                                onclick="seeApplicants('${c.title}')">${c.title}</h4>
                            <p style="font-size: 0.9rem; margin: 0; color: var(--text-muted);">${c.description || 'No description'}</p>
                        </div>
                        <div style="text-align: right;">
                            <span style="display: block; font-weight: bold; color: #10b981;">${c.fee} BDT</span>
                            <small style="color: var(--text-muted);">${c.duration_days} Days • ${c.mode}</small>
                            <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
                                <button onclick="openEditModal(${c.course_id})" style="background: none; border: none; cursor: pointer; color: #6366f1;">Edit</button>
                                <button onclick="deleteCourse(${c.course_id})" style="background: none; border: none; cursor: pointer; color: #ef4444;">Delete</button>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="font-size: 0.8rem; color: var(--text-muted); margin-right: 0.5rem;">Students:</span>
                            <span style="font-weight: 600;">${c.enrolled_count}</span>
                        </div>
                        <button class="btn" onclick="seeApplicants('${c.title}')" 
                                style="width: auto; padding: 0.3rem 0.8rem; font-size: 0.8rem; background: rgba(168, 85, 247, 0.2); border: 1px solid var(--primary-color);">View Applicants</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error(error);
        coursesDiv.innerHTML = '<p style="color: red;">Error loading courses.</p>';
    }
}

function openEditModal(courseId) {
    const course = allCourses.find(c => c.course_id == courseId);
    if (!course) return;

    document.getElementById('edit-course-id').value = course.course_id;
    document.getElementById('edit-title').value = course.title;
    document.getElementById('edit-description').value = course.description || '';
    document.getElementById('edit-duration_days').value = course.duration_days;
    document.getElementById('edit-mode').value = course.mode;
    document.getElementById('edit-fee').value = course.fee;
    document.getElementById('editCourseModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editCourseModal').style.display = 'none';
}

async function saveCourseEdit(event) {
    event.preventDefault();
    const id = document.getElementById('edit-course-id').value;

    const body = {
        title: document.getElementById('edit-title').value,
        description: document.getElementById('edit-description').value,
        duration_days: document.getElementById('edit-duration_days').value,
        mode: document.getElementById('edit-mode').value,
        fee: document.getElementById('edit-fee').value
    };

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${TRAINER_API}/courses/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            alert('Course updated successfully');
            closeEditModal();
            loadCourses();
        } else {
            const data = await response.json();
            alert(data.message || 'Error updating course');
        }
    } catch (err) {
        console.error(err);
        alert('Server Error');
    }
}

async function deleteCourse(id) {
    if (!confirm('Are you sure you want to delete this course? This will remove all enrollments.')) return;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${TRAINER_API}/courses/${id}`, {
            method: 'DELETE',
            headers: { 'x-auth-token': token }
        });
        if (response.ok) {
            alert('Course deleted');
            loadCourses();
            loadEnrollments();
        } else {
            const data = await response.json();
            alert(data.message || 'Error deleting course');
        }
    } catch (err) {
        console.error(err);
        alert('Server Error');
    }
}

function seeApplicants(courseTitle) {
    renderEnrollments(allEnrollments.filter(e => e.course_title === courseTitle), `Applicants for "${courseTitle}"`);
    window.location.hash = 'enrollments-list';
}

async function loadEnrollments() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${TRAINER_API}/enrollments`, {
            headers: { 'x-auth-token': token }
        });
        const data = await response.json();

        if (response.ok) {
            allEnrollments = data;
            document.getElementById('stat-students').textContent = data.length;
            renderEnrollments(data);
        } else {
            document.getElementById('enrollments-list').innerHTML = '<p>Error loading enrollments.</p>';
        }
    } catch (error) {
        console.error(error);
        document.getElementById('enrollments-list').innerHTML = '<p>Error loading enrollments.</p>';
    }
}

function renderEnrollments(data, title = 'Recent Enrollments') {
    const listDiv = document.getElementById('enrollments-list');

    // Update title if provided (we might need to add an ID to the h3 in HTML)
    const cardHeader = listDiv.previousElementSibling;
    if (cardHeader && cardHeader.tagName === 'H3') {
        cardHeader.textContent = title;
    }

    if (data.length === 0) {
        listDiv.innerHTML = '<div style="display:flex; justify-content:space-between; align-items:center;"><p style="color: var(--text-muted);">No candidates found.</p>' +
            (title !== 'Recent Enrollments' ? '<button class="btn" onclick="loadEnrollments()" style="width:auto; padding:0.2rem 0.5rem; font-size:0.7rem;">Show All</button>' : '') + '</div>';
        return;
    }

    let html = '';
    if (title !== 'Recent Enrollments') {
        html += `<div style="margin-bottom: 1rem;"><button class="btn" onclick="loadEnrollments()" style="width:auto; padding:0.4rem 1rem; font-size:0.8rem; background: var(--secondary-color);">← Show All Enrollments</button></div>`;
    }

    html += `<table>
        <thead>
            <tr>
                <th>Course</th>
                <th>Candidate Info</th>
                <th>Status</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>`;

    data.forEach(row => {
        let statusClass = 'status-in-progress';
        let statusLabel = row.status;
        if (row.status === 'Shortlisted') {
            statusClass = 'status-completed';
            statusLabel = 'Accepted';
        }
        if (row.status === 'Rejected') statusClass = 'status-rejected';

        html += `<tr>
            <td>${row.course_title}</td>
            <td>
                <strong>${row.candidate_name}</strong><br>
                <small style="color: var(--text-muted);">${row.candidate_email}</small><br>
                <small style="color: var(--text-muted);">${row.candidate_phone || 'No phone'}</small>
            </td>
            <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
            <td>
                <div style="display: flex; gap: 0.5rem;">
                    ${row.status === 'Applied' ? `
                        <button onclick="updateEnrollment(${row.enrollment_id}, 'Shortlisted')" class="btn" style="width: auto; padding: 0.3rem 0.6rem; font-size: 0.75rem; background: #10b981;">Accept</button>
                        <button onclick="updateEnrollment(${row.enrollment_id}, 'Rejected')" class="btn" style="width: auto; padding: 0.3rem 0.6rem; font-size: 0.75rem; background: #ef4444;">Reject</button>
                    ` : row.status === 'Shortlisted' ? `
                        ${row.completion_status !== 'Completed' ?
                    `<button onclick="completeCourse(${row.enrollment_id})" class="btn" style="width: auto; padding: 0.3rem 0.6rem; font-size: 0.75rem;">Mark Completed</button>` :
                    '<span style="color: #10b981; font-weight:bold;">Graduated</span>'}
                    ` : '<span style="color: var(--text-muted);">Process Closed</span>'}
                </div>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    listDiv.innerHTML = html;
}

async function updateEnrollment(id, status) {
    if (!confirm(`Are you sure you want to ${status === 'Shortlisted' ? 'Accept' : 'Reject'} this enrollment?`)) return;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${TRAINER_API}/enrollments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify({ status })
        });
        if (response.ok) {
            alert(`Candidate ${status === 'Shortlisted' ? 'Accepted' : 'Rejected'}`);
            loadEnrollments();
        }
    } catch (err) {
        console.error(err);
    }
}

async function completeCourse(enrollmentId) {
    if (!confirm('Mark this course as completed for the candidate?')) return;
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

async function loadProfile() {
    const token = localStorage.getItem('token');
    try {
        const user = JSON.parse(atob(token.split('.')[1]));
        document.getElementById('nav-username').textContent = user.username;
        document.getElementById('avatar-initial').textContent = user.username.charAt(0).toUpperCase();

        // Fetch specific profile info if needed
        const trainerRes = await fetch(`${TRAINER_API}/courses`, { headers: { 'x-auth-token': token } });
        const courses = await trainerRes.json();
        if (courses.length > 0) {
            // Organization info could be here or in another profile endpoint
            // For now, let's just use what's available
        }
    } catch (e) { }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

function checkAuth() {
    if (!localStorage.getItem('token')) {
        window.location.href = 'index.html';
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadProfile();
    loadCourses();
    loadEnrollments();
    loadSkills();
});



