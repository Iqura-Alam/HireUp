
const API_URL = 'http://localhost:5000/api/auth';

async function register(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    let payload = {
        username,
        email,
        password,
        user_role: role
    };

    if (role === 'Candidate') {
        payload.first_name = document.getElementById('first_name').value;
        payload.last_name = document.getElementById('last_name').value;
        payload.city = document.getElementById('city').value;
        payload.division = document.getElementById('division').value;
        payload.country = document.getElementById('country').value;
        payload.experience_years = document.getElementById('experience').value;
    } else if (role === 'Employer') {
        payload.company_name = document.getElementById('company_name').value;
        payload.industry = document.getElementById('industry').value;
        payload.contact_number = document.getElementById('contact_number').value;
        payload.website = document.getElementById('website').value;
        payload.location = document.getElementById('emp_location').value;
    } else if (role === 'Trainer') {
        payload.organization_name = document.getElementById('organization_name').value;
        payload.specialization = document.getElementById('specialization').value;
        payload.contact_number = document.getElementById('trainer_contact').value;
        payload.location = document.getElementById('trainer_location').value;
    }

    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = '';

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            alert('Registration successful! Please login.');
            window.location.href = 'login.html';
        } else {
            errorDiv.textContent = data.message || 'Registration failed';
        }
    } catch (error) {
        errorDiv.textContent = 'Server error. Please try again later.';
        console.error('Error:', error);
    }
}

async function login(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = '';

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            // Custom alert based on role
            if (data.user.role === 'Employer') {
                alert(`Welcome, ${data.user.username}! Your Company Profile is ready.`);
                window.location.href = 'index.html';
            } else if (data.user.role === 'Trainer') {
                alert(`Welcome, Trainer ${data.user.username}!`);
                window.location.href = 'trainer_dashboard.html';
            } else if (data.user.role === 'Admin') {
                alert(`Welcome Admin!`);
                window.location.href = 'admin_dashboard.html';
            } else {
                alert(`Welcome back, ${data.user.username}!`);
                window.location.href = 'candidate_dashboard.html';
            }
        } else {
            errorDiv.textContent = data.message || 'Login failed';
        }
    } catch (error) {
        errorDiv.textContent = 'Server error. Please try again later.';
        console.error('Error:', error);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token && !window.location.href.includes('login.html') && !window.location.href.includes('register.html') && !window.location.href.endsWith('index.html') && !window.location.href.endsWith('/')) {
        // Allow index.html to be viewed but maybe show different nav
        // For now, strict protect:
        // window.location.href = 'login.html';
    }
}

// Simple check on load
// checkAuth();
