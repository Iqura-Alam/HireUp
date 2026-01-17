
const ADMIN_API = 'http://localhost:5000/api/admin';

async function loadTopSkills() {
    const div = document.getElementById('top-skills-list');
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${ADMIN_API}/top-skills`, { headers: { 'x-auth-token': token } });
        const data = await response.json();
        if (response.ok) {
            let html = '<ul>';
            data.forEach(item => {
                html += `<li>${item.skill_name} (Demand: ${item.demand_count})</li>`;
            });
            html += '</ul>';
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

// Init
loadTopSkills();
loadPopularCourses();
loadAuditLogs();
