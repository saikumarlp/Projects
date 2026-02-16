/* =========================================
   AI Resume Builder - Core Application Logic
   ========================================= */

// --- State Management ---
const state = {
    currentRoute: '/',
    // Load from localStorage or default
    resumeData: (function () {
        const stored = JSON.parse(localStorage.getItem('resumeBuilderData'));
        const defaults = {
            personal: { name: '', email: '', phone: '', location: '', github: '', linkedin: '' },
            summary: '',
            education: [],
            experience: [],
            projects: [],
            skills: { technical: [], soft: [], tools: [] }
        };
        if (stored) {
            let migratedSkills = stored.skills;
            if (typeof stored.skills === 'string') {
                migratedSkills = { technical: stored.skills ? stored.skills.split(',').map(s => s.trim()) : [], soft: [], tools: [] };
            }
            const migratedProjects = (stored.projects || []).map(p => ({
                ...p,
                title: p.title || p.name,
                techStack: p.techStack || [],
                liveUrl: p.liveUrl || '',
                githubUrl: p.githubUrl || ''
            }));
            return {
                ...defaults,
                ...stored,
                education: stored.education || [],
                experience: stored.experience || [],
                projects: migratedProjects,
                skills: migratedSkills || defaults.skills
            };
        }
        return defaults;
    })(),
    buildProgress: JSON.parse(localStorage.getItem('rb_progress') || '{}'),
    checklist: JSON.parse(localStorage.getItem('rb_checklist') || '[]'),
    artifacts: JSON.parse(localStorage.getItem('rb_artifacts') || '{"lovable":"", "github":"", "deployed":""}'),
    selectedTemplate: localStorage.getItem('rb_template') || 'classic',
    selectedColor: localStorage.getItem('rb_color') || 'hsl(168, 60%, 40%)',

    steps: [
        {
            id: '01-problem', number: 1, title: 'Problem Statement',
            content: 'Define the core problem your project solves. Who is it for? What is the pain point?',
            prompt: 'Write a problem statement for a [Project Type] that helps [Target Audience] solve [Pain Point].'
        },
        {
            id: '02-market', number: 2, title: 'Market Research',
            content: 'Analyze the market. Who are the competitors? what is the TAM/SAM/SOM?',
            prompt: 'Conduct market research for the above problem. Identify 3 competitors and estimate market size.'
        },
        {
            id: '03-architecture', number: 3, title: 'System Architecture',
            content: 'Design the high-level architecture. Monolith or Microservices? Database choice?',
            prompt: 'Design a system architecture for this application. Include diagrams if possible (Mermaid).'
        },
        {
            id: '04-hld', number: 4, title: 'High Level Design',
            content: 'Map out the major components and how they interact.',
            prompt: 'Create a High Level Design (HLD) document.'
        },
        {
            id: '05-lld', number: 5, title: 'Low Level Design',
            content: 'Define API endpoints, database schema, and class structures.',
            prompt: 'Create a Low Level Design (LLD) document including API specs and DB schema.'
        },
        {
            id: '06-build', number: 6, title: 'Build Phase',
            content: 'Start coding. Set up the repo and basic scaffolding.',
            prompt: 'Generate the initial project structure and README.'
        },
        {
            id: '07-test', number: 7, title: 'Testing',
            content: 'Write unit and integration tests. Ensure reliability.',
            prompt: 'Write a test plan and 5 core unit tests for the main logic.'
        },
        {
            id: '08-ship', number: 8, title: 'Ship & Deploy',
            content: 'Deploy to production. Vercel/Netlify for frontend, Railway/Render for backend.',
            prompt: 'Create a deployment checklist and valid CI/CD pipeline configuration.'
        }
    ]
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initRouter();
    sanitizeData(); // Force fix data structure
    // Apply saved color immediately
    document.documentElement.style.setProperty('--theme-color', state.selectedColor);
    renderApp();
});

function sanitizeData() {
    const d = state.resumeData;
    if (!d.skills || typeof d.skills !== 'object' || Array.isArray(d.skills)) {
        d.skills = { technical: [], soft: [], tools: [] };
    }
    // Ensure all categories are arrays
    ['technical', 'soft', 'tools'].forEach(cat => {
        if (!Array.isArray(d.skills[cat])) {
            d.skills[cat] = [];
        }
    });
    // Ensure projects is array
    if (!Array.isArray(d.projects)) d.projects = [];
    // Ensure education is array
    if (!Array.isArray(d.education)) d.education = [];
    // Ensure experience is array
    if (!Array.isArray(d.experience)) d.experience = [];

    saveResumeData();
}

window.addEventListener('hashchange', () => {
    initRouter();
    renderApp();
});

function initRouter() {
    state.currentRoute = window.location.hash.slice(1) || '/';
}

// --- Persistence Helper ---
function saveResumeData() {
    localStorage.setItem('resumeBuilderData', JSON.stringify(state.resumeData));
}

// --- Rendering Core ---
function renderApp() {
    try {
        const app = document.getElementById('app');
        app.innerHTML = '';

        // Routing Logic
        if (state.currentRoute === '/' || state.currentRoute === '') {
            renderHome(app);
        } else if (state.currentRoute === '/builder') {
            renderBuilder(app);
        } else if (state.currentRoute === '/preview') {
            renderPreview(app);
        } else if (state.currentRoute === '/proof' || state.currentRoute === '/rb/proof') {
            renderProof(app);
        } else if (state.currentRoute.startsWith('/rb/')) {
            const stepId = state.currentRoute.split('/rb/')[1];
            const step = state.steps.find(s => s.id === stepId);
            if (step) {
                renderBuildStep(app, step);
            } else {
                app.innerHTML = '<h1>404 - Step Not Found</h1>';
            }
        } else {
            app.innerHTML = '<h1>404 - Page Not Found</h1>';
        }
    } catch (e) {
        document.getElementById('app').innerHTML = `<div style="padding: 20px; color: red;">
            <h1>Something went wrong</h1>
            <pre>${e.toString()}\n${e.stack}</pre>
            <button onclick="localStorage.clear(); window.location.reload()">Reset All Data</button>
        </div>`;
        console.error(e);
    }
}

// --- Views ---

function renderHome(container) {
    container.innerHTML = `
        ${renderTopBar()}
        <main class="hero">
            <h1>Build a Resume That Gets Read.</h1>
            <p>AI-Powered. ATS-Friendly. Design-First.</p>
            <div style="display: flex; gap: 16px;">
                <a href="#/builder" class="btn btn--primary" style="padding: 16px 32px; font-size: 18px;">Start Building</a>
                <a href="#/rb/01-problem" class="btn btn--secondary" style="padding: 16px 32px; font-size: 18px;">Go to Build Track</a>
            </div>
        </main>
    `;
}

function renderTopBar(context = '') {
    // Calculate progress for Status Badge
    const completed = Object.values(state.buildProgress).filter(p => p.status === 'completed').length;
    const total = state.steps.length;

    return `
    <header class="top-bar">
        <div style="display:flex; align-items:center;">
             <a href="#/" class="top-bar__brand">AI Resume Builder</a>
             ${context ? `<span style="margin: 0 12px; color: #ccc;">|</span><span class="top-bar__center">${context}</span>` : ''}
        </div>
        <nav style="display: flex; gap: 24px; align-items: center;">
            <a href="#/builder" style="text-decoration: none; font-size: 14px; font-weight: 500;">Builder</a>
            <a href="#/preview" style="text-decoration: none; font-size: 14px; font-weight: 500;">Preview</a>
            <a href="#/proof" style="text-decoration: none; font-size: 14px; font-weight: 500;">Proof</a>
            <div class="top-bar__status">${completed}/${total} Steps</div>
        </nav>
    </header>
    `;
}

function renderBuildStep(container, step) {
    const isCompleted = state.buildProgress[step.id]?.status === 'completed';
    const hasArtifact = !!state.buildProgress[step.id]?.artifact;

    container.innerHTML = `
        ${renderTopBar(`Project 3 — Step ${step.number} of 8`)}
        
        <div class="context-header">
            <h1 class="context-header__title">${step.number}. ${step.title}</h1>
            <p class="context-header__subtitle">${step.content}</p>
        </div>

        <div class="main-layout">
            <div class="primary-workspace">
                <h2>Task</h2>
                <p>Use the prompt on the right to generate your artifact in Lovable/ChatGPT.</p>
                <div style="margin-top: 40px; padding: 40px; background: #f9f9f9; border-radius: 8px; text-align: center; color: #888;">
                    ${hasArtifact ? '✅ Artifact Uploaded' : 'Artifact Preview / Workspace Placeholder'}
                    <br><br>
                    ${state.buildProgress[step.id]?.artifact ? `<a href="#">${state.buildProgress[step.id].artifact}</a>` : '(Start by adding a screenshot/artifact)'}
                </div>
            </div>
            
            <aside class="secondary-panel">
                <div class="build-card">
                    <h3>
                        <span>AI Prompt</span>
                        <button class="btn btn--secondary" style="padding: 4px 8px; font-size: 12px;" onclick="copyPrompt()">Copy</button>
                    </h3>
                    <textarea id="prompt-area" class="copy-area" readonly>${step.prompt}</textarea>
                    
                    <a href="https://gpt.lovable.dev" target="_blank" class="btn btn--primary" style="width: 100%; margin-bottom: 12px;">Build in Lovable</a>
                    
                    <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                        <input type="file" id="step-artifact-upload" style="display: none;" onchange="handleScreenshotUpload('${step.id}')">
                        
                        <button class="btn btn--secondary" style="flex: 1; min-width: 80px;" onclick="markStepStatus('${step.id}', 'error')">Error</button>
                        <button class="btn btn--secondary" style="flex: 1; min-width: 120px;" onclick="document.getElementById('step-artifact-upload').click()">Add Screenshot</button>
                        <button class="btn btn--primary" style="flex: 1; min-width: 80px; background-color: var(--color-success); border-color: var(--color-success);" onclick="markStepStatus('${step.id}', 'completed')" ${!hasArtifact ? 'disabled' : ''}>It Worked</button>
                    </div>
                </div>

                <div class="build-card">
                    <h3>Navigation</h3>
                     <div style="display: flex; justify-content: space-between; margin-top: 16px;">
                        <button class="btn btn--secondary" onclick="prevStep(${step.number})">Previous</button>
                        <button id="next-step-btn" class="btn btn--primary" onclick="nextStep(${step.number})" ${!isCompleted ? 'disabled' : ''}>Next Step</button>
                    </div>
                </div>
            </aside>
        </div>

        ${renderProofFooter()}
    `;
}

function renderProofFooter() {
    const steps = state.steps;
    const progressHtml = steps.map(s => {
        const status = state.buildProgress[s.id]?.status === 'completed' ? 'done' : '';
        return `
            <div class="proof-item tooltip" title="${s.title}">
                <div class="status-circle ${status}"></div>
                <span>${s.number}</span>
            </div>
        `;
    }).join('');

    return `
        <footer class="proof-footer">
            ${progressHtml}
        </footer>
    `;
}

// --- Builder View ---
function renderBuilder(container) {
    container.innerHTML = `
        ${renderTopBar('Resume Builder')}
        <div class="builder-layout">
            <div class="builder-sidebar">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
                    <h2>Content</h2>
                    <div style="display:flex; gap: 8px;">
                         <button class="btn btn--secondary" onclick="loadSampleData()">Load Sample</button>
                    </div>
                </div>
                
                <!-- Template Switcher -->
                <div class="build-card" style="margin-bottom: 24px;">
                    <h3 style="margin-bottom: 12px;">Template</h3>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn ${state.selectedTemplate === 'classic' ? 'btn--primary' : 'btn--secondary'}" style="flex:1; font-size: 12px;" onclick="setTemplate('classic')">Classic</button>
                        <button class="btn ${state.selectedTemplate === 'modern' ? 'btn--primary' : 'btn--secondary'}" style="flex:1; font-size: 12px;" onclick="setTemplate('modern')">Modern</button>
                        <button class="btn ${state.selectedTemplate === 'minimal' ? 'btn--primary' : 'btn--secondary'}" style="flex:1; font-size: 12px;" onclick="setTemplate('minimal')">Minimal</button>
                    </div>
                </div>

                <div class="form-section">
                    <h3>Personal Info</h3>
                    <div class="input-group"><label class="input-label">Full Name</label><input type="text" class="input-field" value="${state.resumeData.personal.name}" oninput="updateResume('personal', 'name', this.value)"></div>
                    <div class="input-group"><label class="input-label">Email</label><input type="text" class="input-field" value="${state.resumeData.personal.email}" oninput="updateResume('personal', 'email', this.value)"></div>
                    <div class="input-group"><label class="input-label">Phone</label><input type="text" class="input-field" value="${state.resumeData.personal.phone}" oninput="updateResume('personal', 'phone', this.value)"></div>
                    <div class="input-group"><label class="input-label">Location</label><input type="text" class="input-field" value="${state.resumeData.personal.location}" oninput="updateResume('personal', 'location', this.value)"></div>
                     <div class="input-group"><label class="input-label">GitHub</label><input type="text" class="input-field" value="${state.resumeData.personal.github}" oninput="updateResume('personal', 'github', this.value)"></div>
                    <div class="input-group"><label class="input-label">LinkedIn</label><input type="text" class="input-field" value="${state.resumeData.personal.linkedin}" oninput="updateResume('personal', 'linkedin', this.value)"></div>
                </div>

                <div class="form-section">
                    <h3>Summary</h3>
                    <div class="input-group"><textarea class="input-field" oninput="updateResume('summary', null, this.value)">${state.resumeData.summary}</textarea></div>
                </div>

                <div class="form-section">
                    <h3>Education</h3>
                    ${state.resumeData.education.map((edu, index) => `
                        <div style="margin-bottom: 16px; border-left: 2px solid #eee; padding-left: 10px;">
                            <input type="text" class="input-field" placeholder="School / University" value="${edu.school}" style="margin-bottom: 8px;" oninput="updateArrayItem('education', ${index}, 'school', this.value)">
                            <div style="display:flex; gap: 8px;">
                                <input type="text" class="input-field" placeholder="Degree" value="${edu.degree}" style="flex:2;" oninput="updateArrayItem('education', ${index}, 'degree', this.value)">
                                <input type="text" class="input-field" placeholder="Year" value="${edu.year}" style="flex:1;" oninput="updateArrayItem('education', ${index}, 'year', this.value)">
                            </div>
                            <button class="btn btn--secondary" style="margin-top: 8px; padding: 4px 8px; font-size: 12px; color: #d32f2f; border-color: #ef9a9a;" onclick="removeArrayItem('education', ${index})">Remove</button>
                        </div>
                    `).join('')}
                    <button class="btn btn--secondary" onclick="addArrayItem('education')">+ Add Education</button>
                </div>
                
                 <div class="form-section">
                    <h3>Experience</h3>
                    ${state.resumeData.experience.map((exp, index) => `
                        <div style="margin-bottom: 16px; border-left: 2px solid #eee; padding-left: 10px;">
                            <input type="text" class="input-field" placeholder="Job Title" value="${exp.title}" style="margin-bottom: 8px;" oninput="updateArrayItem('experience', ${index}, 'title', this.value)">
                            <input type="text" class="input-field" placeholder="Company" value="${exp.company}" style="margin-bottom: 8px;" oninput="updateArrayItem('experience', ${index}, 'company', this.value)">
                            <textarea class="input-field" placeholder="Description (Bullet points)" oninput="updateArrayItem('experience', ${index}, 'description', this.value)" style="min-height: 120px;">${exp.description}</textarea>
                            ${renderBulletGuidance(exp.description)}
                            <button class="btn btn--secondary" style="margin-top: 8px; padding: 4px 8px; font-size: 12px; color: #d32f2f; border-color: #ef9a9a;" onclick="removeArrayItem('experience', ${index})">Remove</button>
                        </div>
                    `).join('')}
                    <button class="btn btn--secondary" onclick="addArrayItem('experience')">+ Add Experience</button>
                </div>
                
                <div class="form-section">
                    <h3>Projects</h3>
                    ${state.resumeData.projects.map((proj, index) => `
                        <details class="project-accordion" open>
                            <summary>${proj.title || 'New Project'}</summary>
                            <div class="project-content">
                                <input type="text" class="input-field" placeholder="Project Title" value="${proj.title}" style="margin-bottom: 8px;" oninput="updateArrayItem('projects', ${index}, 'title', this.value)">
                                
                                <label class="input-label" style="margin-top:8px;">Description (Max 200 chars)</label>
                                <textarea class="input-field" maxlength="200" oninput="updateArrayItem('projects', ${index}, 'description', this.value)" style="min-height: 80px;">${proj.description}</textarea>
                                <div class="char-counter">${proj.description.length}/200</div>
                                ${renderBulletGuidance(proj.description)}

                                <label class="input-label" style="margin-top:8px;">Tech Stack</label>
                                <div class="tag-container" onclick="document.getElementById('p-tags-${index}').focus()">
                                    ${(proj.techStack || []).map((tag, tIndex) => `
                                        <span class="tag-pill">${tag} <button onclick="removeProjectTag(${index}, ${tIndex})">×</button></span>
                                    `).join('')}
                                    <input type="text" id="p-tags-${index}" class="tag-input" placeholder="Type & Enter" onkeydown="handleProjectTagInput(event, ${index})">
                                </div>

                                <div style="display:flex; gap: 8px; margin-top: 12px;">
                                    <input type="text" class="input-field" placeholder="Live URL" value="${proj.liveUrl || ''}" oninput="updateArrayItem('projects', ${index}, 'liveUrl', this.value)">
                                    <input type="text" class="input-field" placeholder="GitHub URL" value="${proj.githubUrl || ''}" oninput="updateArrayItem('projects', ${index}, 'githubUrl', this.value)">
                                </div>

                                <button class="btn btn--secondary" style="margin-top: 12px; width: 100%; color: #d32f2f; border-color: #ef9a9a;" onclick="removeArrayItem('projects', ${index})">Delete Project</button>
                            </div>
                        </details>
                    `).join('')}
                     <button class="btn btn--secondary" onclick="addArrayItem('projects')">+ Add Project</button>
                </div>

                <div class="form-section">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3>Skills</h3>
                        <button class="btn btn--primary" style="font-size: 12px; padding: 4px 8px;" onclick="suggestSkills()">✨ Suggest Skills</button>
                    </div>
                    
                    ${renderSkillCategory('technical', 'Technical Skills')}
                    ${renderSkillCategory('soft', 'Soft Skills')}
                    ${renderSkillCategory('tools', 'Tools & Technologies')}
                </div>
            </div>

            <div class="builder-preview">
                <!-- ATS Score Panel -->
                <div class="score-panel" id="ats-score-panel">
                    ${renderATSPanel()}
                </div>
                <div class="resume-paper ${state.selectedTemplate}" id="resume-preview">
                    ${generateResumeHTML()}
                </div>
            </div>
        </div>
    `;
}

// --- Preview View ---
function renderPreview(container) {
    const colors = [
        { name: 'Teal', val: 'hsl(168, 60%, 40%)' },
        { name: 'Navy', val: 'hsl(220, 60%, 35%)' },
        { name: 'Burgundy', val: 'hsl(345, 60%, 35%)' },
        { name: 'Forest', val: 'hsl(150, 50%, 30%)' },
        { name: 'Charcoal', val: 'hsl(0, 0%, 25%)' }
    ];

    container.innerHTML = `
        ${renderTopBar('Preview')}
        <div style="background: #555; min-height: calc(100vh - 64px); display: flex; flex-direction: column; align-items: center; padding: 40px 20px;">
             
             <!-- Visual Controls -->
             <div class="build-card" style="width: 210mm; margin-bottom: 24px;">
                <h3 style="margin-bottom: 16px; text-align: center;">Customize Your Look</h3>
                
                <!-- Template Picker -->
                <div class="template-picker" style="justify-content: center;">
                    <div class="template-option ${state.selectedTemplate === 'classic' ? 'active' : ''}" onclick="setTemplate('classic')">
                        <div class="template-preview t-classic"><div class="tp-header"></div><div class="tp-body"></div></div>
                        <div class="template-label">Classic</div>
                    </div>
                    <div class="template-option ${state.selectedTemplate === 'modern' ? 'active' : ''}" onclick="setTemplate('modern')">
                        <div class="template-preview t-modern"><div class="tp-sidebar"></div><div class="tp-main"></div></div>
                        <div class="template-label">Modern</div>
                    </div>
                    <div class="template-option ${state.selectedTemplate === 'minimal' ? 'active' : ''}" onclick="setTemplate('minimal')">
                        <div class="template-preview t-minimal"><div class="tp-header"></div><div class="tp-body"></div></div>
                        <div class="template-label">Minimal</div>
                    </div>
                </div>

                <!-- Color Picker -->
                <div class="color-picker">
                    ${colors.map(c => `
                        <div class="color-swatch ${state.selectedColor === c.val ? 'active' : ''}" 
                             style="background-color: ${c.val};" 
                             onclick="setColor('${c.val}')"
                             title="${c.name}"></div>
                    `).join('')}
                </div>

                <!-- Export Actions -->
                <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #eee; padding-top: 16px;">
                    <button class="btn btn--secondary" onclick="copyResumeText()">Copy Text</button>
                    <button class="btn btn--primary" onclick="handleExport()">Download PDF</button>
                </div>
             </div>
             
             <!-- ATS Score Preview -->
             <div class="build-card" style="width: 210mm; margin-bottom: 24px;">
                ${renderATSPanel()}
             </div>

             <div class="resume-paper ${state.selectedTemplate}" id="resume-preview">
                ${generateResumeHTML()}
            </div>
        </div>
        
        <!-- Toast -->
        <div id="export-toast" class="toast">
            <span>✅ PDF export ready! Check your downloads.</span>
        </div>
    `;
}

function generateResumeHTML() {
    const d = state.resumeData;
    const isModern = state.selectedTemplate === 'modern';

    // Format links
    const links = [
        d.personal.email ? d.personal.email : null,
        d.personal.phone ? d.personal.phone : null,
        d.personal.location ? d.personal.location : null,
        d.personal.github ? `github.com/${d.personal.github.replace('github.com/', '')}` : null,
        d.personal.linkedin ? `linkedin.com/in/${d.personal.linkedin.replace(/.*linkedin\.com\/in\//, '')}` : null
    ].filter(Boolean);

    // Helpers
    const renderBullets = (text) => {
        if (!text) return '';
        const lines = text.split('\n').filter(line => line.trim());
        return `<ul style="margin-top: 4px; padding-left: 18px; margin-bottom: 8px;">
            ${lines.map(line => `<li style="margin-bottom: 2px;">${line.replace(/^[•-]\s*/, '')}</li>`).join('')}
        </ul>`;
    };

    const renderSkills = () => {
        const skills = d.skills || {};
        const tech = skills.technical || [];
        const soft = skills.soft || [];
        const tools = skills.tools || [];
        if (tech.length === 0 && soft.length === 0 && tools.length === 0) return '';
        return `
            <div class="resume-section">
                <div class="resume-section-title">Skills</div>
                ${tech.length > 0 ? `<p><strong>Technical:</strong> ${tech.join(', ')}</p>` : ''}
                ${tools.length > 0 ? `<p><strong>Tools:</strong> ${tools.join(', ')}</p>` : ''}
                ${soft.length > 0 ? `<p><strong>Soft Skills:</strong> ${soft.join(', ')}</p>` : ''}
            </div>
         `;
    };

    // --- Modern Layout Render ---
    if (isModern) {
        return `
            <aside class="resume-sidebar">
                <div class="resume-name" style="font-size:24px; line-height:1.2; margin-bottom:16px;">${d.personal.name || 'Your Name'}</div>
                
                <div class="resume-section-title">Contact</div>
                <div class="resume-contact">
                    ${links.map(l => `<div>${l}</div>`).join('')}
                </div>

                ${renderSkills()}

                ${d.education.length > 0 ? `
                <div class="resume-section">
                    <div class="resume-section-title">Education</div>
                    ${d.education.map(e => `
                        <div style="margin-bottom: 12px;">
                            <div style="font-weight: 600;">${e.school}</div>
                            <div style="font-size: 13px;">${e.degree}</div>
                            <div style="font-size: 12px; opacity: 0.8;">${e.year || ''}</div>
                        </div>
                    `).join('')}
                </div>` : ''}
            </aside>
            
            <main class="resume-main">
                ${d.summary ? `
                <div class="resume-section">
                    <div class="resume-section-title" style="margin-top:0;">Summary</div>
                    <p>${d.summary}</p>
                </div>` : ''}

                ${d.experience.length > 0 ? `
                <div class="resume-section">
                    <div class="resume-section-title">Experience</div>
                    ${d.experience.map(e => `
                        <div class="resume-item">
                            <div class="resume-item-header">
                                <span>${e.title}</span>
                                <span>${e.date || ''}</span>
                            </div>
                            <div class="resume-item-sub">
                                <span>${e.company}</span>
                            </div>
                            ${renderBullets(e.description)}
                        </div>
                    `).join('')}
                </div>` : ''}

                ${d.projects.length > 0 ? `
                <div class="resume-section">
                    <div class="resume-section-title">Projects</div>
                    ${d.projects.map(p => `
                        <div class="preview-project-card">
                            <div class="resume-item-header">
                                <span>${p.title}</span>
                                <div class="preview-links">
                                     ${p.liveUrl ? `<a href="${p.liveUrl}" target="_blank">Live ↗</a>` : ''}
                                     ${p.githubUrl ? `<a href="${p.githubUrl}" target="_blank">Code ↗</a>` : ''}
                                </div>
                            </div>
                            <p>${p.description}</p>
                            ${p.techStack && p.techStack.length > 0 ? `
                                <div class="preview-tag-group">
                                    ${p.techStack.map(t => `<span class="preview-pill">${t}</span>`).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>` : ''}
            </main>
        `;
    }

    // --- Classic / Minimal Layout Render ---
    return `
        <div class="resume-header">
            <div class="resume-name">${d.personal.name || 'Your Name'}</div>
            <div class="resume-contact">${links.join(' • ')}</div>
        </div>

        ${d.summary ? `
        <div class="resume-section">
            <div class="resume-section-title">Summary</div>
            <p>${d.summary}</p>
        </div>` : ''}

        ${d.education.length > 0 ? `
        <div class="resume-section">
            <div class="resume-section-title">Education</div>
            ${d.education.map(e => `
                <div class="resume-item">
                    <div class="resume-item-header">
                        <span>${e.school}</span>
                        <span>${e.year || ''}</span>
                    </div>
                    <p>${e.degree}</p>
                </div>
            `).join('')}
        </div>` : ''}

        ${d.experience.length > 0 ? `
        <div class="resume-section">
            <div class="resume-section-title">Experience</div>
            ${d.experience.map(e => `
                <div class="resume-item">
                    <div class="resume-item-header">
                        <span>${e.title}</span>
                        <span>${e.date || ''}</span>
                    </div>
                    <div class="resume-item-sub">
                        <span>${e.company}</span>
                    </div>
                    ${renderBullets(e.description)}
                </div>
            `).join('')}
        </div>` : ''}
        
        ${d.projects.length > 0 ? `
        <div class="resume-section">
            <div class="resume-section-title">Projects</div>
            ${d.projects.map(p => `
                <div class="preview-project-card">
                    <div class="resume-item-header">
                        <span>${p.title}</span>
                        <div class="preview-links">
                             ${p.liveUrl ? `<a href="${p.liveUrl}" target="_blank">Live ↗</a>` : ''}
                             ${p.githubUrl ? `<a href="${p.githubUrl}" target="_blank">Code ↗</a>` : ''}
                        </div>
                    </div>
                    <p>${p.description}</p>
                    ${p.techStack && p.techStack.length > 0 ? `
                        <div class="preview-tag-group">
                            ${p.techStack.map(t => `<span class="preview-pill">${t}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>` : ''}

        ${renderSkills()}
    `;
}

// --- Proof View ---
function renderProof(container) {
    const completedSteps = state.steps.filter(s => state.buildProgress[s.id]?.status === 'completed').length;
    const totalSteps = state.steps.length;

    // Checklist Items
    const checklistItems = [
        "All form sections save to localStorage",
        "Live preview updates in real-time",
        "Template switching preserves data",
        "Color theme persists after refresh",
        "ATS score calculates correctly",
        "Score updates live on edit",
        "Export buttons work (copy/download)",
        "Empty states handled gracefully",
        "Mobile responsive layout works",
        "No console errors on any page"
    ];

    const completedChecklist = state.checklist.filter(Boolean).length;
    const allChecklistPassed = completedChecklist === checklistItems.length;

    const { lovable, github, deployed } = state.artifacts;
    const hasArtifacts = lovable && github && deployed; // Simple check for now

    const isShipped = completedSteps === totalSteps && allChecklistPassed && hasArtifacts;

    container.innerHTML = `
        ${renderTopBar('Proof of Work')}
        
        <div class="context-header" style="text-align: center;">
            <h1 class="context-header__title">Ready to Ship?</h1>
            <p class="context-header__subtitle">Submit your construction artifacts to complete the track.</p>
        </div>

        <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
            
            <!-- 1. Step Overview -->
            <div class="build-card" style="margin-bottom: 24px;">
                <h3>1. Build Progress</h3>
                <div style="display: flex; gap: 8px; margin-top: 16px;">
                    ${state.steps.map(s => `
                        <div style="flex: 1; height: 8px; background: ${state.buildProgress[s.id]?.status === 'completed' ? 'var(--color-success)' : '#eee'}; border-radius: 4px;" title="${s.title}"></div>
                    `).join('')}
                </div>
                <p style="text-align: center; margin-top: 8px; font-size: 14px; color: #666;">${completedSteps} of ${totalSteps} Steps Completed</p>
            </div>

            <!-- 2. Verification Checklist -->
            <div class="build-card" style="margin-bottom: 24px;">
                <h3>2. Verification Checklist</h3>
                <p style="font-size: 13px; color: #666; margin-bottom: 12px;">Verify all features before shipping.</p>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${checklistItems.map((item, index) => `
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px;">
                            <input type="checkbox" ${state.checklist[index] ? 'checked' : ''} onclick="handleChecklistToggle(${index})">
                            ${item}
                        </label>
                    `).join('')}
                </div>
            </div>

            <!-- 3. Artifact Collection -->
            <div class="build-card" style="margin-bottom: 24px;">
                 <h3>3. Project Artifacts</h3>
                 <div class="input-group">
                    <label class="input-label">Lovable Project Link</label>
                    <input type="text" class="input-field" placeholder="https://lovable.dev/..." value="${lovable || ''}" oninput="handleArtifactInput('lovable', this.value)">
                </div>
                <div class="input-group">
                    <label class="input-label">GitHub Repository</label>
                    <input type="text" class="input-field" placeholder="https://github.com/..." value="${github || ''}" oninput="handleArtifactInput('github', this.value)">
                </div>
                <div class="input-group">
                    <label class="input-label">Deployed Application URL</label>
                    <input type="text" class="input-field" placeholder="https://..." value="${deployed || ''}" oninput="handleArtifactInput('deployed', this.value)">
                </div>
            </div>
            
            <!-- 4. Final Submission -->
            <div class="build-card" style="text-align: center; border: 2px solid ${isShipped ? 'var(--color-success)' : '#e0e0e0'};">
                ${isShipped ? `
                    <div style="padding: 24px;">
                        <div style="font-size: 48px; margin-bottom: 16px;">🚢</div>
                        <h2 style="color: var(--color-success); margin-bottom: 8px;">Project 3 Shipped Successfully.</h2>
                        <p style="color: #666; margin-bottom: 24px;">Great work. You verify every step.</p>
                        <button class="btn btn--primary" onclick="copyFinalSubmission()">Copy Final Submission</button>
                    </div>
                ` : `
                    <div style="padding: 24px; opacity: 0.6;">
                        <h3>Complete All Steps to Ship</h3>
                        <p style="font-size: 13px; margin-top: 8px;">
                            ${totalSteps - completedSteps} steps remaining • 
                            ${checklistItems.length - completedChecklist} checklist items • 
                            ${!hasArtifacts ? 'Missing artifacts' : 'Artifacts ready'}
                        </p>
                    </div>
                `}
            </div>
        </div>
    `;
}


// --- Logic Actions ---

window.copyPrompt = function () {
    const text = document.getElementById('prompt-area');
    text.select();
    navigator.clipboard.writeText(text.value);
    // Could add toast here
};

window.handleScreenshotUpload = function (stepId) {
    const fileInput = document.getElementById('step-artifact-upload');
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        // Simulate upload
        const artifactUrl = `uploaded_${file.name}`;

        const current = state.buildProgress[stepId] || {};
        state.buildProgress[stepId] = { ...current, artifact: artifactUrl };
        localStorage.setItem('rb_progress', JSON.stringify(state.buildProgress));

        // Also store as rb_step_X_artifact
        const stepNum = state.steps.find(s => s.id === stepId).number;
        localStorage.setItem(`rb_step_${stepNum}_artifact`, artifactUrl);

        renderApp();
        alert("Screenshot added! You can now click 'It Worked'.");
    }
};

window.markStepStatus = function (stepId, status) {
    if (status === 'completed' && !state.buildProgress[stepId]?.artifact) {
        alert("Please Add Screenshot of your work before completing the step.");
        return;
    }

    state.buildProgress[stepId] = { ...state.buildProgress[stepId], status: status, timestamp: new Date().toISOString() };
    localStorage.setItem('rb_progress', JSON.stringify(state.buildProgress));
    renderApp();
};

window.nextStep = function (currentNumber) {
    if (currentNumber < 8) {
        const nextId = state.steps[currentNumber].id; // 0-indexed arr, currentNumber 1-indexed
        window.location.hash = `/rb/${nextId}`;
    } else {
        window.location.hash = '/proof';
    }
};

window.prevStep = function (currentNumber) {
    if (currentNumber > 1) {
        const prevId = state.steps[currentNumber - 2].id;
        window.location.hash = `/rb/${prevId}`;
    } else {
        window.location.hash = '/';
    }
}

window.loadSampleData = function () {
    state.resumeData = {
        personal: { name: 'Alex Developer', email: 'alex@example.com', phone: '555-0100', location: 'San Francisco, CA', github: 'github.com/alex', linkedin: 'linkedin.com/in/alex' },
        summary: 'Senior Full Stack Engineer with 5+ years of experience building scalable web applications. Expert in React, Node.js, and Cloud Infrastructure. Proven track record of leading teams and delivering high-impact projects.',
        experience: [
            { title: 'Senior Engineer', company: 'Tech Corp', description: '• Led a team of 5 engineers to rebuild the core payment processing system, improving reliability by 99.9%.\n• Optimized database queries, reducing page load time by 40%.\n• Mentored junior developers and conducted code reviews.' },
            { title: 'Web Developer', company: 'StartUp Inc', description: '• Built the MVP for a new social media platform using React and Firebase.\n• Implemented real-time chat features and user authentication.\n• Collaborated with designers to ensure pixel-perfect implementation.' }
        ],
        projects: [
            { title: 'AI Resume Builder', description: '• Developed a full-stack AI Resume Builder using OpenAI API and Next.js.\n• Integrated ATS scoring logic.', techStack: ['React', 'Node.js', 'OpenAI'], liveUrl: 'https://resume.ai', githubUrl: 'https://github.com/alex/resume' }
        ],
        education: [
            { school: 'University of Tech', degree: 'B.S. Computer Science', year: '2020' }
        ],
        skills: {
            technical: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker', 'SQL', 'NoSQL', 'Git', 'CI/CD'],
            soft: ['Leadership', 'Communication', 'Problem Solving'],
            tools: ['VS Code', 'JIRA', 'Figma']
        }
    };
    saveResumeData();
    renderApp();
};


// --- ATS Scoring ---
function calculateATSScore(data) {
    let score = 0;
    const suggestions = [];

    // 1. Name (+10)
    if (data.personal.name && data.personal.name.length > 2) {
        score += 10;
    } else {
        suggestions.push("Add your full name (+10)");
    }

    // 2. Email (+10)
    if (data.personal.email && data.personal.email.includes('@')) {
        score += 10;
    } else {
        suggestions.push("Add a valid email (+10)");
    }

    // 3. Phone (+5)
    if (data.personal.phone && data.personal.phone.length > 5) {
        score += 5;
    } else {
        suggestions.push("Add a phone number (+5)");
    }

    // 4. LinkedIn (+5)
    if (data.personal.linkedin && data.personal.linkedin.length > 5) {
        score += 5;
    } else {
        suggestions.push("Add LinkedIn profile (+5)");
    }

    // 5. GitHub (+5)
    if (data.personal.github && data.personal.github.length > 5) {
        score += 5;
    } else {
        suggestions.push("Add GitHub profile (+5)");
    }

    // 6. Summary > 50 chars (+10)
    if (data.summary && data.summary.length > 50) {
        score += 10;
    } else {
        suggestions.push("Summary should be > 50 chars (+10)");
    }

    // 7. Summary Action Verbs (+10)
    const actionVerbs = ['built', 'led', 'designed', 'improved', 'developed', 'created', 'managed', 'engineered', 'optimized', 'implemented'];
    if (data.summary && actionVerbs.some(v => data.summary.toLowerCase().includes(v))) {
        score += 10;
    } else {
        suggestions.push("Use action verbs in summary (e.g., Built, Led) (+10)");
    }

    // 8. Experience >= 1 with bullets (+15)
    if (data.experience.length >= 1 && data.experience[0].description.length > 10) {
        score += 15;
    } else {
        suggestions.push("Add at least 1 work experience with details (+15)");
    }

    // 9. Education >= 1 (+10)
    if (data.education.length >= 1) {
        score += 10;
    } else {
        suggestions.push("Add education details (+10)");
    }

    // 10. Skills >= 5 (+10)
    const skills = data.skills || {};
    const totalSkills = (skills.technical || []).length + (skills.soft || []).length + (skills.tools || []).length;
    if (totalSkills >= 5) {
        score += 10;
    } else {
        suggestions.push("Add at least 5 skills (+10)");
    }

    // 11. Projects >= 1 (+10)
    if (data.projects.length >= 1) {
        score += 10;
    } else {
        suggestions.push("Add at least 1 project (+10)");
    }

    return { score: Math.min(score, 100), suggestions };
}

function renderATSPanel() {
    const { score, suggestions } = calculateATSScore(state.resumeData);
    let color = '#d32f2f'; // Red (0-40)
    let label = 'Needs Work';

    if (score >= 71) {
        color = '#388e3c'; // Green (71-100)
        label = 'Strong Resume';
    } else if (score >= 41) {
        color = '#fbc02d'; // Amber (41-70)
        label = 'Getting There';
    }

    return `
        <div style="text-align: center; margin-bottom: 16px;">
            <div style="position: relative; width: 80px; height: 80px; margin: 0 auto;">
                <svg viewBox="0 0 36 36" class="circular-chart">
                    <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="fill:none; stroke:#eee; stroke-width:3.8;" />
                    <path class="circle" stroke-dasharray="${score}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="fill:none; stroke:${color}; stroke-width:3.8; stroke-linecap:round; animation: progress 1s ease-out forwards;" />
                    <text x="18" y="20.35" class="percentage" style="fill: #666; font-family: sans-serif; font-weight: bold; font-size: 0.5em; text-anchor: middle;">${score}</text>
                </svg>
            </div>
            <div style="margin-top: 8px; font-weight: 600; font-size: 14px; color: ${color};">${label}</div>
        </div>
        
        ${suggestions.length > 0 ? `
        <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 12px; font-size: 13px;">
            <strong style="display:block; margin-bottom: 4px; color: #e65100;">Suggestions:</strong>
            <ul style="padding-left: 16px; margin: 0;">
                ${suggestions.map(s => `<li style="margin-bottom: 4px;">${s}</li>`).join('')}
            </ul>
        </div>` : '<div style="text-align: center; font-size: 13px; color: #388e3c;">Great job! Your resume looks strong.</div>'}
    `;
}

// --- New Logic Actions ---

window.handleExport = function () {
    const { score, suggestions } = calculateATSScore(state.resumeData);
    if (score < 70) {
        const confirmExport = confirm(`Your Resume ATS Score is ${score}/100. Ideally, aim for 70+.\n\nSuggested Improvements:\n${suggestions.map(s => `• ${s}`).join('\n')}\n\nDo you want to proceed with export anyway?`);
        if (!confirmExport) return;
    }

    // Show toast
    const toast = document.getElementById('export-toast');
    if (toast) {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // Print after slight delay to allow toast to render (optional)
    setTimeout(() => window.print(), 500);
};

window.setColor = function (color) {
    state.selectedColor = color;
    localStorage.setItem('rb_color', color);
    document.documentElement.style.setProperty('--theme-color', color);
    renderApp();
};

function renderSkillCategory(key, label) {
    // Safety check: if skills is not an object (e.g. string from old data), don't crash
    if (!state.resumeData.skills || typeof state.resumeData.skills !== 'object') return '';

    let skills = state.resumeData.skills[key];
    if (!Array.isArray(skills)) skills = [];

    return `
        <div style="margin-top: 12px;">
            <label class="input-label">${label} (${skills.length})</label>
            <div class="tag-container" onclick="document.getElementById('skill-${key}').focus()">
                ${skills.map((skill, index) => `
                    <span class="tag-pill">${skill} <button onclick="removeSkill('${key}', ${index})">×</button></span>
                `).join('')}
                <input type="text" id="skill-${key}" class="tag-input" placeholder="Add skill..." onkeydown="handleSkillInput(event, '${key}')">
            </div>
        </div>
    `;
}

window.handleSkillInput = function (e, category) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const val = e.target.value.trim();
        if (val) {
            if (!state.resumeData.skills[category]) state.resumeData.skills[category] = [];
            state.resumeData.skills[category].push(val);
            e.target.value = '';
            saveResumeData();
            renderApp();
            setTimeout(() => document.getElementById(`skill-${category}`).focus(), 10);
        }
    }
};

window.removeSkill = function (category, index) {
    state.resumeData.skills[category].splice(index, 1);
    saveResumeData();
    renderApp();
};

window.suggestSkills = function () {
    // Show mock loading state if needed, or just add directly
    const btn = document.querySelector('button[onclick="suggestSkills()"]');
    const originalText = btn.innerText;
    btn.innerText = "Loading...";
    btn.disabled = true;

    setTimeout(() => {
        const suggs = {
            technical: ["TypeScript", "React", "Node.js", "PostgreSQL", "GraphQL"],
            soft: ["Team Leadership", "Problem Solving"],
            tools: ["Git", "Docker", "AWS"]
        };

        // Add only unique
        Object.keys(suggs).forEach(cat => {
            suggs[cat].forEach(s => {
                if (!state.resumeData.skills[cat].includes(s)) {
                    state.resumeData.skills[cat].push(s);
                }
            });
        });

        saveResumeData();
        renderApp();
    }, 1000);
};

window.handleProjectTagInput = function (e, index) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const val = e.target.value.trim();
        if (val) {
            if (!state.resumeData.projects[index].techStack) state.resumeData.projects[index].techStack = [];
            state.resumeData.projects[index].techStack.push(val);
            saveResumeData();
            renderApp();
            setTimeout(() => document.getElementById(`p-tags-${index}`).focus(), 10);
        }
    }
};

window.removeProjectTag = function (pIndex, tIndex) {
    state.resumeData.projects[pIndex].techStack.splice(tIndex, 1);
    saveResumeData();
    renderApp();
};


// Update Render Helpers
window.updateResume = function (section, field, value) {
    if (field) {
        state.resumeData[section][field] = value;
    } else {
        state.resumeData[section] = value;
    }
    saveResumeData();
    document.getElementById('resume-preview').innerHTML = generateResumeHTML();
    document.getElementById('ats-score-panel').innerHTML = renderATSPanel();
};

window.updateArrayItem = function (section, index, field, value) {
    state.resumeData[section][index][field] = value;
    saveResumeData();
    document.getElementById('resume-preview').innerHTML = generateResumeHTML();
    document.getElementById('ats-score-panel').innerHTML = renderATSPanel();
};

window.addArrayItem = function (section) {
    if (section === 'experience') {
        state.resumeData.experience.push({ title: '', company: '', description: '' });
    } else if (section === 'projects') {
        state.resumeData.projects.push({ name: '', description: '' });
    } else if (section === 'education') {
        state.resumeData.education.push({ school: '', degree: '', year: '' });
    }
    saveResumeData();
    renderApp();
};

window.removeArrayItem = function (section, index) {
    state.resumeData[section].splice(index, 1);
    saveResumeData();
    renderApp();
}

window.submitProof = function () {
    // Generate simple text report
    const d = state.buildProgress;
    let report = `AI Resume Builder - Build Track Proof\n\n`;
    state.steps.forEach(s => {
        report += `${s.number}. ${s.title}: ${d[s.id]?.status === 'completed' ? '✅ Completed' : '❌ Pending'}\n`;
        if (d[s.id]?.artifact) report += `   Artifact: ${d[s.id].artifact}\n`;
    });

    report += `\nLinks:\nLovable: ${document.getElementById('proof-lovable').value}`;
    report += `\nGitHub: ${document.getElementById('proof-github').value}`;
    report += `\nDeploy: ${document.getElementById('proof-deploy').value}`;

    navigator.clipboard.writeText(report);
    alert("Copied Final Submission to Clipboard!");
};

// --- Proof Page Actions ---

window.handleChecklistToggle = function (index) {
    const current = state.checklist[index] || false;
    state.checklist[index] = !current;
    localStorage.setItem('rb_checklist', JSON.stringify(state.checklist));
    renderApp();
};

window.handleArtifactInput = function (field, value) {
    state.artifacts[field] = value;
    localStorage.setItem('rb_artifacts', JSON.stringify(state.artifacts));
    renderApp();
};

window.copyFinalSubmission = function () {
    const { lovable, github, deployed } = state.artifacts;
    if (!lovable || !github || !deployed) {
        alert("Please fill in all artifact links before copying.");
        return;
    }

    const text = `------------------------------------------
AI Resume Builder — Final Submission

Lovable Project: ${lovable}
GitHub Repository: ${github}
Live Deployment: ${deployed}

Core Capabilities:
- Structured resume builder
- Deterministic ATS scoring
- Template switching
- PDF export with clean formatting
- Persistence + validation checklist
------------------------------------------`;

    navigator.clipboard.writeText(text).then(() => {
        alert("Final Submission Copied to Clipboard!");
    });
};

function renderBulletGuidance(text) {
    if (!text) return '';
    const suggestions = [];
    const verbs = ['Built', 'Developed', 'Designed', 'Implemented', 'Led', 'Improved', 'Created', 'Optimized', 'Automated', 'Managed', 'Engineered'];

    // Check first word of each line
    const lines = text.split('\n').filter(l => l.trim());
    let info = '';

    // Simple check: does at least one line start with a strong verb?
    const hasVerb = lines.some(line => {
        const firstWord = line.trim().replace(/^[•-]\s*/, '').split(' ')[0];
        return verbs.some(v => firstWord.toLowerCase().startsWith(v.toLowerCase()));
    });

    if (!hasVerb && lines.length > 0) {
        suggestions.push("Tip: Start with action verbs (e.g., Built, Led, Optimized).");
    }

    // Check for numbers
    if (!/(\d+|%|\$|\+|k\b|M\b)/.test(text) && lines.length > 0) {
        suggestions.push("Tip: Add numbers to show impact (e.g., 'Improved by 20%').");
    }

    if (suggestions.length > 0) {
        return `<div style="font-size: 11px; color: #e65100; background: #fff3e0; padding: 4px 8px; border-radius: 4px; margin-top: 4px; margin-bottom: 4px;">
            ${suggestions.join('<br>')}
        </div>`;
    }
    return '';
}

window.setTemplate = function (templateName) {
    state.selectedTemplate = templateName;
    localStorage.setItem('rb_template', templateName);
    renderApp();
};

window.copyResumeText = function () {
    const d = state.resumeData;
    const bullets = (text) => text ? text.split('\n').map(l => `  • ${l.replace(/^[•-]\s*/, '')}`).join('\n') : '';

    let text = `${d.personal.name}\n${d.personal.email} | ${d.personal.phone} | ${d.personal.location}\n`;
    if (d.personal.linkedin) text += `LinkedIn: ${d.personal.linkedin}\n`;
    if (d.personal.github) text += `GitHub: ${d.personal.github}\n`;

    text += `\nSUMMARY\n${d.summary}\n`;

    if (d.experience.length > 0) {
        text += `\nEXPERIENCE\n`;
        d.experience.forEach(e => {
            text += `${e.title} at ${e.company} (${e.date || ''})\n${bullets(e.description)}\n`;
        });
    }

    if (d.projects.length > 0) {
        text += `\nPROJECTS\n`;
        d.projects.forEach(p => {
            text += `${p.name}\n${bullets(p.description)}\n`;
        });
    }

    if (d.education.length > 0) {
        text += `\nEDUCATION\n`;
        d.education.forEach(e => {
            text += `${e.school} - ${e.degree} (${e.year})\n`;
        });
    }

    if (d.skills) {
        text += `\nSKILLS\n${d.skills}\n`;
    }

    navigator.clipboard.writeText(text);
    alert("Resume copied as plain text!");
};
