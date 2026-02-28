# HireUp – Smart Recruitment Platform

HireUp is a web-based recruitment platform that connects job seekers, employers, and trainers in one ecosystem. 
The goal of HireUp is to reduce the gap between skills and job requirements by helping candidates improve their qualifications while making it easier for employers to find suitable talent.


## What Problem Does HireUp Solve?

Many job seekers struggle to find jobs that match their skills. At the same time, employers find it difficult to locate qualified candidates. 

HireUp solves this by:
- Matching candidates to jobs based on their skills
- Showing candidates what skills they are missing
- Recommending courses to improve those skills
- Helping employers manage applications easily

##  User Roles
HireUp supports four types of users:

### Candidates
- Create and manage their profile
- Add skills, education, projects, and experience
- Apply for jobs
- Track application status
- Receive course recommendations based on missing skills

### Employers
- Post job openings
- Specify required skills
- View applicants
- Shortlist, hire, or reject candidates
- Manage the hiring process easily

### Trainers
- Create skill-based courses
- Help candidates learn new skills
- Manage student enrollments
- Update candidate skills after course completion

### Admin
- Approve employers and trainers before they can use the system
- Ensure platform safety and authenticity

## Key Features
- Skill-based job matching  
- Course recommendation system  
- Application tracking system  
- Employer hiring workflow  
- Skill gap analysis
- Custom job creation and application submission
- Profile completion indicator  
- Secure login and authentication  
- Admin functionality for approval and management

## Database Design Overview

The HireUp platform is built on **PostgreSQL** and organizes data in a way that makes it easy to manage candidates, employers, jobs, and courses.

### Main Entities (Tables)

1. **Candidates**
   - Stores information about users looking for jobs.
   - Includes personal details, skills, experience, education, and projects.
   - Tracks profile completion percentage automatically.

2. **Employers**
   - Stores information about companies or recruiters posting jobs.
   - Includes company details, job postings, and application tracking.

3. **Jobs**
   - Each job has required skills, minimum proficiency levels, salary, and deadlines.
   - Connected to the employer who posted it.

4. **Applications**
   - Links candidates to the jobs they applied for.
   - Tracks the status of each application (applied, shortlisted, hired, rejected).

5. **Skills**
   - Contains all skills that candidates can have and jobs can require.
   - Includes proficiency levels.

6. **Courses**
   - Managed by trainers.
   - Each course teaches one or more skills.
   - Tracks which candidates have completed it and updates their skills automatically.

7. **Trainers**
   - Stores information about trainers who create courses.
   - Includes contact details and courses offered.

8. **Admins**
   - Approve employers and trainers before they can fully use the system.
   - Ensures the platform remains safe and reliable.

## Technologies Used

- PostgreSQL (Database)
- Node.js & Express.js (Backend)
- HTML, CSS, JavaScript (Frontend)
- JWT Authentication

## How to Run the Project

### Database Setup
- Install PostgreSQL
- Create a database named `hireup`
- Run the SQL files inside the `database` folder

### Backend Setup
Open terminal inside the backend folder:
cd backend
npm install
npm start

Create a `.env` file with your database credentials before starting the server.

### Frontend
- Make sure backend is running
- Open `index.html` from the frontend folder in your browser
- Or use Live Server in VS Code

## Conclusion

HireUp is not just a job portal. It is a smart recruitment ecosystem that helps candidates grow their skills while helping employers find the right talent efficiently.
