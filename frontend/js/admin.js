
const ADMIN_API = 'http://localhost:5000/api/admin';

function showView(viewId, element) {
    // Hide all sections
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });

    // Deactivate all links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Show selected section
    document.getElementById(`view-${viewId}`).classList.add('active');

    // Activate clicked link
    if (element) {
        element.classList.add('active');
    }

    // Update Title
    const titles = {
        'overview': 'Dashboard Overview',
        'verification': 'Verification Queue',
        'users': 'User Management',
        'audit': 'System Audit Logs',
        'alerts': 'Low-Rated Course Alerts',
        'jobs': 'Job Management'
    };
    document.getElementById('view-title').innerText = titles[viewId] || 'Admin Dashboard';
}

async function loadTopSkills() {
    const div = document.getElementById('top-skills-list');
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${ADMIN_API}/top-skills`, { headers: { 'x-auth-token': token } });
        const data = await response.json();
        if (response.ok) {
            let html = '<table><tr><th>Skill Name</th><th>Job Demand</th><th>Candidate Supply</th></tr>';
            data.forEach(item => {
                html += `<tr><td>${item.skill_name}</td><td style="color:#a855f7; font-weight:bold;">${item.demand_count}</td><td style="color:#10b981; font-weight:bold;">${item.supply_count}</td></tr>`;
            });
            html += '</table>';
            div.innerHTML = html;
        } else {
            div.innerHTML = 'Error loading data';
        }
    } catch (e) { console.error(e); div.innerHTML = 'Error'; }
}

async function loadPopularCourses() {
    const div = document.getElementById('popular-courses-list');
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${ADMIN_API}/popular-courses`, { headers: { 'x-auth-token': token } });
        const data = await response.json();
        if (response.ok) {
            let html = '<table><tr><th>Course</th><th>Organization</th><th>Enrollments</th></tr>';
            data.forEach(item => {
                html += `<tr><td>${item.title}</td><td>${item.organization_name}</td><td>${item.enrollment_count}</td></tr>`;
            });
            html += '</table>';
            div.innerHTML = html;
        } else {
            div.innerHTML = 'Error loading data';
        }
    } catch (e) { console.error(e); div.innerHTML = 'Error'; }
}

async function loadAuditLogs() {
    const div = document.getElementById('audit-logs-list');
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${ADMIN_API}/audit-logs`, { headers: { 'x-auth-token': token } });
        const data = await response.json();
        if (response.ok) {
            let html = '<table><tr><th>Time</th><th>Table</th><th>Operation</th><th>Details</th></tr>';
            data.forEach(item => {
                html += `<tr>
                    <td>${new Date(item.timestamp).toLocaleString()}</td>
                    <td>${item.table_name}</td>
                    <td>${item.operation}</td>
                    <td><pre>${JSON.stringify(item.new_data || item.old_data, null, 2)}</pre></td>
                </tr>`;
            });
            html += '</table>';
            div.innerHTML = html;
        } else {
            div.innerHTML = 'Error loading data';
        }
    } catch (e) { console.error(e); div.innerHTML = 'Error'; }
}

async function loadVerificationQueue() {
    const div = document.getElementById('verification-queue-list');
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${ADMIN_API}/pending-users`, { headers: { 'x-auth-token': token } });
        const data = await response.json();
        if (response.ok) {
            if (data.length === 0) {
                div.innerHTML = '<p>No pending users.</p>';
                document.getElementById('btn-approve-all').style.display = 'none';
                return;
            }
            document.getElementById('btn-approve-all').style.display = 'inline-block';
            let html = '<table><tr><th>Role</th><th>Name</th><th>Email</th><th>Username</th><th>Joined</th><th>Actions</th></tr>';
            data.forEach(user => {
                html += `<tr>
                    <td>${user.role}</td>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${user.username}</td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                        <button onclick="verifyUser('${user.role}', ${user.id}, 'approve')" style="background-color: #22c55e; margin-right: 5px;">Approve</button>
                        <button onclick="verifyUser('${user.role}', ${user.id}, 'reject')" style="background-color: #ef4444;">Reject</button>
                    </td>
                </tr>`;
            });
            html += '</table>';
            div.innerHTML = html;
        } else {
            div.innerHTML = 'Error loading verification queue';
        }
    } catch (e) { console.error(e); div.innerHTML = 'Error'; }
}

async function verifyUser(role, id, action) {
    if (!confirm(`Are you sure you want to ${action} this ${role}?`)) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${ADMIN_API}/verify-user/${role}/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ action: action })
        });

        const data = await response.json();
        alert(data.message);
        loadVerificationQueue(); // Refresh the list
    } catch (e) {
        console.error(e);
        alert('Server error while verifying user');
    }
}

async function verifyAllUsers() {
    if (!confirm('Are you sure you want to approve ALL pending users?')) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${ADMIN_API}/verify-all`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            }
        });

        const data = await response.json();
        alert(data.message);
        loadVerificationQueue();
    } catch (e) {
        console.error(e);
        alert('Server error while approving all users');
    }
}

async function loadAllUsers() {
    const div = document.getElementById('user-management-list');
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${ADMIN_API}/users`, { headers: { 'x-auth-token': token } });
        const data = await response.json();
        if (response.ok) {
            let html = '<table><tr><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>';
            data.forEach(user => {
                const statusColor = user.account_status === 'Active' ? '#22c55e' : (user.account_status === 'Suspended' ? '#eab308' : '#ef4444');
                html += `<tr>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>${user.role}</td>
                    <td style="color: ${statusColor}; font-weight: bold;">${user.account_status}</td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                        <select onchange="updateAccountStatus(${user.user_id}, this.value)" style="margin-right: 5px; width: auto; padding: 2px;">
                            <option value="Active" ${user.account_status === 'Active' ? 'selected' : ''}>Active</option>
                            <option value="Suspended" ${user.account_status === 'Suspended' ? 'selected' : ''}>Suspend</option>
                            <option value="Banned" ${user.account_status === 'Banned' ? 'selected' : ''}>Ban</option>
                        </select>
                        <button onclick="deleteAccount(${user.user_id})" style="background-color: #ef4444; padding: 2px 5px; width: auto;">Delete</button>
                    </td>
                </tr>`;
            });
            html += '</table>';
            div.innerHTML = html;
        } else {
            div.innerHTML = 'Error loading users';
        }
    } catch (e) { console.error(e); div.innerHTML = 'Error'; }
}

async function updateAccountStatus(userId, status) {
    if (!confirm(`Are you sure you want to set this account to ${status}?`)) {
        loadAllUsers(); // Reset select
        return;
    }
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${ADMIN_API}/users/${userId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify({ status })
        });
        const data = await response.json();
        alert(data.message);
        loadAllUsers();
    } catch (e) { console.error(e); alert('Error'); }
}

async function deleteAccount(userId) {
    if (!confirm('Are you sure you want to delete this account? This is a soft delete.')) return;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${ADMIN_API}/users/${userId}`, {
            method: 'DELETE',
            headers: { 'x-auth-token': token }
        });
        const data = await response.json();
        alert(data.message);
        loadAllUsers();
    } catch (e) { console.error(e); alert('Error'); }
}

// Low-Rated Course Alerts
async function loadLowRatedCourses() {
    const div = document.getElementById('course-alerts-list');
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${ADMIN_API}/low-rated-courses`, { headers: { 'x-auth-token': token } });
        const data = await response.json();
        if (response.ok) {
            if (data.length === 0) {
                div.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">No low-rated courses at the moment. Good job!</p>';
                return;
            }
            let html = '<table><tr><th>Course</th><th>Trainer</th><th>Rating</th><th>Reviews</th><th>Created</th><th>Actions</th></tr>';
            data.forEach(course => {
                html += `<tr>
                    <td>${course.title}</td>
                    <td>${course.trainer_name}</td>
                    <td style="color: #f87171; font-weight: bold;">${parseFloat(course.average_rating).toFixed(1)} ★</td>
                    <td>${course.total_reviews}</td>
                    <td>${new Date(course.created_at).toLocaleDateString()}</td>
                    <td>
                        <button onclick="keepCourse(${course.course_id})" style="background-color: #6366f1; margin-right: 5px; width: auto; padding: 5px 10px;">Keep</button>
                        <button onclick="deleteCourse(${course.course_id})" style="background-color: #ef4444; width: auto; padding: 5px 10px;">Delete</button>
                    </td>
                </tr>`;
            });
            html += '</table>';
            div.innerHTML = html;
        } else {
            div.innerHTML = 'Error loading alerts';
        }
    } catch (e) { console.error(e); div.innerHTML = 'Error'; }
}

async function keepCourse(courseId) {
    // For now, "Keep" just dismisses it from this view session.
    // In a real app, we might mark it as 'reviewed_by_admin' in the DB.
    alert('Decision made: Course will be kept. (Dismissing from current view)');
    loadLowRatedCourses();
}

async function deleteCourse(courseId) {
    if (!confirm('Are you sure you want to PERMANENTLY delete this low-rated course?')) return;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${ADMIN_API}/courses/${courseId}`, {
            method: 'DELETE',
            headers: { 'x-auth-token': token }
        });
        const data = await response.json();
        alert(data.message);
        loadLowRatedCourses();
    } catch (e) { console.error(e); alert('Error deleting course'); }
}

// Job Management
async function loadAllJobs() {
    const div = document.getElementById('jobs-management-list');
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${ADMIN_API}/jobs`, { headers: { 'x-auth-token': token } });
        const data = await response.json();
        if (response.ok) {
            if (data.length === 0) {
                div.innerHTML = '<p style="color: var(--text-muted);">No job postings found.</p>';
                return;
            }
            let html = '<table><tr><th>Title</th><th>Company</th><th>Status</th><th>Applications</th><th>Format/Loc</th><th>Posted</th><th>Actions</th></tr>';
            data.forEach(job => {
                const statusColor = job.status === 'Open' ? '#10b981' : (job.status === 'Closed' ? '#f87171' : '#eab308');
                html += `<tr>
                    <td>${job.title}</td>
                    <td>${job.company_name}</td>
                    <td style="color: ${statusColor}; font-weight: bold;">${job.status}</td>
                    <td>${job.application_count}</td>
                    <td>${job.location || 'Remote'}</td>
                    <td>${new Date(job.created_at).toLocaleDateString()}</td>
                    <td>
                        <button onclick="deleteJobAdmin(${job.job_id})" style="background-color: #ef4444; width: auto; padding: 5px 10px;">Delete</button>
                    </td>
                </tr>`;
            });
            html += '</table>';
            div.innerHTML = html;
        } else {
            div.innerHTML = 'Error loading jobs';
        }
    } catch (e) { console.error(e); div.innerHTML = 'Error'; }
}

async function deleteJobAdmin(jobId) {
    if (!confirm('Are you sure you want to PERMANENTLY delete this job posting?')) return;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${ADMIN_API}/jobs/${jobId}`, {
            method: 'DELETE',
            headers: { 'x-auth-token': token }
        });
        const data = await response.json();
        alert(data.message);
        loadAllJobs();
    } catch (e) { console.error(e); alert('Error deleting job'); }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadVerificationQueue();
    loadAllUsers();
    loadTopSkills();
    loadPopularCourses();
    loadAuditLogs();
    loadLowRatedCourses();
    loadAllJobs();
});
