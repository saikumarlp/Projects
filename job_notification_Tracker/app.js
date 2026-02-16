/* =========================================
   KodNest Job Tracker - Core Logic & Match Engine & Status System
   ========================================= */

// --- State ---
const state = {
    jobs: [],
    filters: {
        keyword: '',
        location: 'All',
        mode: 'All',
        experience: 'All',
        source: 'All',
        status: 'All',
        sort: 'Newest',
        onlyMatches: false
    },
    savedJobs: JSON.parse(localStorage.getItem('min_saved_jobs') || '[]'),
    preferences: JSON.parse(localStorage.getItem('jobTrackerPreferences') || 'null'),
    // Structure: { [jobId]: 'Applied' }
    status: JSON.parse(localStorage.getItem('jobTrackerStatus') || '{}'),
    // Structure: [ { id, title, company, status, date } ]
    statusUpdates: JSON.parse(localStorage.getItem('jobTrackerStatusUpdates') || '[]')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // Determine page context
    const isDashboard = !!document.getElementById('job-list-container');
    const isSavedPage = !!document.getElementById('saved-job-list');
    const isSettingsPage = !!document.getElementById('save-prefs-btn');

    // Load Data
    state.jobs = typeof JOBS_DATA !== 'undefined' ? JOBS_DATA : [];

    // Inject Toast Container
    if (!document.querySelector('.toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    if (isDashboard) {
        initDashboard();
    } else if (isSavedPage) {
        initSavedPage();
    } else if (isSettingsPage) {
        initSettingsPage();
    } else if (!!document.getElementById('digest-container')) {
        initDigestPage();
    } else if (!!document.getElementById('checklist-container')) {
        initTestPage();
    } else if (!!document.getElementById('ship-locked')) {
        initShipPage();
    }

    setupModal();
});

// --- Toast System ---
function showToast(message, type = 'info') {
    const container = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerText = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Status Logic ---
function updateJobStatus(jobId, newStatus) {
    const job = state.jobs.find(j => j.id === jobId);
    if (!job) return;

    // Update State
    state.status[jobId] = newStatus;
    localStorage.setItem('jobTrackerStatus', JSON.stringify(state.status));

    // Log Update
    const update = {
        id: jobId,
        title: job.title,
        company: job.company,
        status: newStatus,
        date: new Date().toISOString()
    };
    state.statusUpdates.unshift(update); // Add to top
    if (state.statusUpdates.length > 50) state.statusUpdates.pop(); // Limit history
    localStorage.setItem('jobTrackerStatusUpdates', JSON.stringify(state.statusUpdates));

    // UI Feedback
    showToast(`Status updated to: ${newStatus}`, newStatus === 'Rejected' ? 'error' : (newStatus === 'Selected' ? 'success' : 'info'));

    // Re-render to update UI on current page
    if (document.getElementById('job-list-container')) {
        applyFilters(); // Re-apply filters as status might change visibility
    } else if (document.getElementById('saved-job-list')) {
        initSavedPage();
    }
}

// --- Digest Page Logic ---
function initDigestPage() {
    const generateBtn = document.getElementById('generate-digest-btn');
    const container = document.getElementById('digest-container');
    const actions = document.getElementById('digest-actions');

    // Check for existing digest
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `jobTrackerDigest_${today}`;
    const storedDigest = localStorage.getItem(storageKey);

    if (storedDigest) {
        renderDigest(JSON.parse(storedDigest));
        actions.style.display = 'flex';
        generateBtn.innerText = 'Regenerate Digest';
    } else {
        renderDigestEmptyState();
    }

    generateBtn.addEventListener('click', () => {
        if (!state.preferences) {
            alert("Please set your preferences in Settings first.");
            window.location.href = 'settings.html';
            return;
        }

        // Generate Logic
        state.jobs.forEach(job => job.score = calculateMatchScore(job, state.preferences));
        let candidates = state.jobs.filter(j => (j.score || 0) > 0);

        candidates.sort((a, b) => {
            const scoreDiff = b.score - a.score;
            if (scoreDiff !== 0) return scoreDiff;
            return a.postedDaysAgo - b.postedDaysAgo;
        });

        const digest = candidates.slice(0, 10);

        if (digest.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h4 class="empty-state__title">No Matching Roles Today</h4>
                    <p class="empty-state__text">We couldn't find any jobs matching your preferences. Check back tomorrow or adjust your criteria.</p>
                    <a href="settings.html" class="btn btn--secondary">Adjust Preferences</a>
                </div>
            `;
            actions.style.display = 'none';
            return;
        }

        localStorage.setItem(storageKey, JSON.stringify(digest));
        renderDigest(digest);
        actions.style.display = 'flex';

        generateBtn.innerText = 'Digest Generated';
        setTimeout(() => generateBtn.innerText = 'Regenerate Digest', 2000);
    });

    document.getElementById('copy-digest-btn').addEventListener('click', () => {
        const digest = JSON.parse(localStorage.getItem(storageKey) || '[]');
        copyDigestToClipboard(digest);
    });

    document.getElementById('email-digest-btn').addEventListener('click', () => {
        const digest = JSON.parse(localStorage.getItem(storageKey) || '[]');
        createEmailDraft(digest);
    });
}

function renderDigestEmptyState() {
    const container = document.getElementById('digest-container');
    container.innerHTML = `
        <div class="empty-state" style="border-style: dashed;">
            <h4 class="empty-state__title">Ready to Generate</h4>
            <p class="empty-state__text">Click the button above to simulate the 9AM daily trigger and build your personalized digest.</p>
        </div>
    `;
}

function renderDigest(jobs) {
    const container = document.getElementById('digest-container');
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let jobsHtml = jobs.map((job, index) => `
        <div style="padding: 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-size: 16px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 4px;">
                    ${index + 1}. ${job.title}
                    <span style="font-size: 12px; font-weight: normal; color: #666; background: #eee; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">${job.score}% Match</span>
                </div>
                <div style="font-size: 14px; color: #555;">
                    ${job.company} • ${job.location} • ${job.experience}
                </div>
            </div>
            <a href="${job.applyUrl}" target="_blank" style="font-size: 13px; font-weight: 500; color: var(--color-accent); text-decoration: none; border: 1px solid var(--color-border); padding: 6px 12px; border-radius: 4px;">Apply</a>
        </div>
    `).join('');

    // Recent Status Updates Section
    let updatesHtml = '';
    const recentUpdates = state.statusUpdates.slice(0, 5); // Show last 5
    if (recentUpdates.length > 0) {
        const updatesList = recentUpdates.map(u => `
            <li style="margin-bottom: 8px; font-size: 14px; color: #555;">
                <strong>${u.title}</strong> at ${u.company}: <span class="status-badge" style="font-size: 11px;">${u.status}</span>
            </li>
        `).join('');

        updatesHtml = `
            <div style="background: #fff; padding: 24px; border-top: 1px solid var(--color-border);">
                <h3 style="font-size: 18px; font-family: var(--font-serif); margin-bottom: 16px;">Recent Status Updates</h3>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    ${updatesList}
                </ul>
            </div>
        `;
    }

    container.innerHTML = `
        <div style="background: white; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="background: #f8f8f8; padding: 24px; border-bottom: 1px solid var(--color-border); text-align: center;">
                <h2 style="font-family: var(--font-serif); font-size: 24px; margin-bottom: 8px;">Top 10 Jobs For You</h2>
                <p style="color: #666; font-size: 14px; margin: 0;">9AM Digest • ${dateStr}</p>
            </div>
            
            <div>${jobsHtml}</div>
            
            ${updatesHtml}

            <div style="background: #fcfcfc; padding: 16px; text-align: center; border-top: 1px solid var(--color-border);">
                <p style="font-size: 12px; color: #999; margin: 0;">This digest was generated based on your preferences.</p>
            </div>
        </div>
    `;
}

function copyDigestToClipboard(jobs) {
    let text = `My 9AM Job Digest - ${new Date().toLocaleDateString()}\n\n`;
    jobs.forEach((job, i) => {
        text += `${i + 1}. ${job.title} at ${job.company}\n   Location: ${job.location} (${job.mode})\n   Score: ${job.score}%\n   Link: ${job.applyUrl}\n\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copy-digest-btn');
        btn.innerText = 'Copied!';
        setTimeout(() => btn.innerText = 'Copy to Clipboard', 2000);
    });
}

function createEmailDraft(jobs) {
    let body = `Here are my top job matches for today:\n\n`;
    jobs.forEach((job, i) => {
        body += `${i + 1}. ${job.title} at ${job.company} (${job.score}% Match)\n${job.applyUrl}\n\n`;
    });

    window.location.href = `mailto:?subject=My 9AM Job Digest&body=${encodeURIComponent(body)}`;
}

// --- Match Score Engine ---
function calculateMatchScore(job, prefs) {
    if (!prefs) return 0;
    let score = 0;

    const keywords = prefs.roleKeywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
    let titleMatch = false;
    let descMatch = false;

    keywords.forEach(k => {
        if (job.title.toLowerCase().includes(k)) titleMatch = true;
        if (job.description.toLowerCase().includes(k)) descMatch = true;
    });

    if (titleMatch) score += 25;
    else if (descMatch) score += 15;

    const prefLocs = prefs.preferredLocations.split(',').map(l => l.trim().toLowerCase()).filter(l => l);
    if (prefLocs.some(l => job.location.toLowerCase().includes(l))) score += 15;

    if (prefs.preferredMode && prefs.preferredMode.includes(job.mode)) score += 10;
    if (prefs.experienceLevel === 'Any' || prefs.experienceLevel === job.experience) score += 10;

    const prefSkills = prefs.skills.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
    const jobSkills = job.skills.map(s => s.toLowerCase());
    const hasSkillOverlap = prefSkills.some(ps => jobSkills.some(js => js.includes(ps) || ps.includes(js)));
    if (hasSkillOverlap) score += 15;

    if (job.postedDaysAgo <= 2) score += 5;
    if (job.source === 'LinkedIn') score += 5;

    return Math.min(score, 100);
}

// --- Dashboard Logic ---
function initDashboard() {
    setupFilters();
    if (state.preferences) {
        state.jobs.forEach(job => job.score = calculateMatchScore(job, state.preferences));
    }
    renderJobs(state.jobs);
}

function setupFilters() {
    const inputs = {
        keyword: document.getElementById('filter-keyword'),
        location: document.getElementById('filter-location'),
        mode: document.getElementById('filter-mode'),
        experience: document.getElementById('filter-experience'),
        source: document.getElementById('filter-source'),
        status: document.getElementById('filter-status'),
        sort: document.getElementById('filter-sort'),
        onlyMatches: document.getElementById('filter-matches')
    };

    Object.keys(inputs).forEach(key => {
        if (!inputs[key]) return;
        const eventType = (inputs[key].type === 'checkbox') ? 'change' : 'input';
        inputs[key].addEventListener(eventType, (e) => {
            if (inputs[key].type === 'checkbox') {
                state.filters[key] = e.target.checked;
            } else {
                state.filters[key] = e.target.value;
            }
            applyFilters();
        });
    });
}

function applyFilters() {
    let result = state.jobs.filter(job => {
        const matchesKeyword = state.filters.keyword === '' ||
            job.title.toLowerCase().includes(state.filters.keyword.toLowerCase()) ||
            job.company.toLowerCase().includes(state.filters.keyword.toLowerCase());

        const matchesLocation = state.filters.location === 'All' || job.location === state.filters.location;
        const matchesMode = state.filters.mode === 'All' || job.mode === state.filters.mode;
        const matchesExp = state.filters.experience === 'All' || job.experience === state.filters.experience;
        const matchesSource = state.filters.source === 'All' || job.source === state.filters.source;

        // Status Filter
        const jobStatus = state.status[job.id] || 'Not Applied';
        const matchesStatus = state.filters.status === 'All' || jobStatus === state.filters.status;

        let matchesScore = true;
        if (state.filters.onlyMatches && state.preferences) {
            matchesScore = (job.score || 0) >= parseInt(state.preferences.minMatchScore);
        }

        return matchesKeyword && matchesLocation && matchesMode && matchesExp && matchesSource && matchesScore && matchesStatus;
    });

    const sortType = state.filters.sort;
    if (sortType === 'Newest') {
        result.sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);
    } else if (sortType === 'Oldest') {
        result.sort((a, b) => b.postedDaysAgo - a.postedDaysAgo);
    } else if (sortType === 'Match Score') {
        result.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else if (sortType === 'Salary') {
        result.sort((a, b) => parseSalary(b.salaryRange) - parseSalary(a.salaryRange));
    }

    renderJobs(result);
}

function parseSalary(str) {
    const numbers = str.match(/(\d+)/g);
    if (!numbers) return 0;
    return Math.max(...numbers.map(n => parseInt(n)));
}

/// --- Test Checklist Logic ---
function initTestPage() {
    const checklistContainer = document.getElementById('checklist-container');
    const countBadge = document.getElementById('test-count-badge');
    const warning = document.getElementById('test-warning');
    const resetBtn = document.getElementById('reset-tests-btn');

    const checklistItems = [
        { id: 'test_pref', label: 'Preferences persist after refresh' },
        { id: 'test_score', label: 'Match score calculates correctly' },
        { id: 'test_toggle', label: '"Show only matches" toggle works' },
        { id: 'test_save', label: 'Save job persists after refresh' },
        { id: 'test_apply', label: 'Apply opens in new tab' },
        { id: 'test_status_upd', label: 'Status update persists after refresh' },
        { id: 'test_status_filter', label: 'Status filter works correctly' },
        { id: 'test_digest_gen', label: 'Digest generates top 10 by score' },
        { id: 'test_digest_persist', label: 'Digest persists for the day' },
        { id: 'test_console', label: 'No console errors on main pages' }
    ];

    // Load State
    let testStatus = JSON.parse(localStorage.getItem('jobTrackerTestStatus') || '{}');

    // Render
    function render() {
        checklistContainer.innerHTML = '';
        let passedCount = 0;

        checklistItems.forEach(item => {
            const isChecked = !!testStatus[item.id];
            if (isChecked) passedCount++;

            const div = document.createElement('div');
            div.className = `checklist-item ${isChecked ? 'checked' : ''}`;
            div.innerHTML = `
                <input type="checkbox" id="${item.id}" ${isChecked ? 'checked' : ''}>
                <label for="${item.id}" style="cursor: pointer; flex: 1;">${item.label}</label>
            `;

            div.addEventListener('click', (e) => {
                if (e.target.tagName !== 'INPUT') {
                    const checkbox = div.querySelector('input');
                    checkbox.checked = !checkbox.checked;
                    updateState(item.id, checkbox.checked);
                }
            });

            div.querySelector('input').addEventListener('change', (e) => {
                updateState(item.id, e.target.checked);
            });

            checklistContainer.appendChild(div);
        });

        // Update Header
        countBadge.innerText = `${passedCount} / ${checklistItems.length} Passed`;

        if (passedCount === checklistItems.length) {
            countBadge.classList.remove('badge--neutral');
            countBadge.classList.add('status-badge--success');
            warning.style.display = 'none';
        } else {
            countBadge.classList.add('badge--neutral');
            countBadge.classList.remove('status-badge--success');
            warning.style.display = 'block';
        }
    }

    function updateState(id, value) {
        testStatus[id] = value;
        localStorage.setItem('jobTrackerTestStatus', JSON.stringify(testStatus));
        render(); // Re-render for visual classes
    }

    resetBtn.addEventListener('click', () => {
        if (confirm("Reset all test progress?")) {
            testStatus = {};
            localStorage.setItem('jobTrackerTestStatus', JSON.stringify(testStatus));
            render();
        }
    });

    render();
}

// --- Ship Logic ---
function initShipPage() {
    const locked = document.getElementById('ship-locked');
    const unlocked = document.getElementById('ship-unlocked');

    // Check State
    const testStatus = JSON.parse(localStorage.getItem('jobTrackerTestStatus') || '{}');
    const totalTests = 10; // Hardcoded matches initTestPage list length
    const passedCount = Object.values(testStatus).filter(v => v).length;

    if (passedCount >= totalTests) {
        locked.style.display = 'none';
        unlocked.style.display = 'block';
    } else {
        locked.style.display = 'block';
        unlocked.style.display = 'none';
    }
}

// --- Rendering ---
function renderJobs(jobs) {
    const container = document.getElementById('job-list-container');
    if (!container) return;

    container.innerHTML = '';

    // Check for "No Preferences" state
    if (!state.preferences && state.filters.onlyMatches) {
        container.innerHTML = `
            <div class="empty-state" style="border-color: var(--color-accent);">
                <h4 class="empty-state__title">Preferences Not Set</h4>
                <p class="empty-state__text">To use Smart Matching, please configure your preferences in Settings.</p>
                <a href="settings.html" class="btn btn--primary">Go to Settings</a>
            </div>
        `;
        return;
    }

    if (jobs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h4 class="empty-state__title">No Matches Found</h4>
                <p class="empty-state__text">Adjust your filters or lower your match threshold.</p>
                <button class="btn btn--secondary" onclick="resetFilters()">Clear Filters</button>
            </div>
        `;
        return;
    }

    // Render List
    jobs.forEach(job => {
        const isSaved = state.savedJobs.includes(job.id);
        const matchScore = job.score || 0;
        const currentStatus = state.status[job.id] || 'Not Applied';

        // Status Class Logic
        let statusClass = '';
        if (currentStatus === 'Applied') statusClass = 'status-applied';
        if (currentStatus === 'Rejected') statusClass = 'status-rejected';
        if (currentStatus === 'Selected') statusClass = 'status-selected';

        // Badge Color Logic
        let scoreBadgeClass = 'badge--neutral';
        if (matchScore >= 80) scoreBadgeClass = 'status-badge--success'; // Green
        else if (matchScore >= 60) scoreBadgeClass = 'status-badge--warning'; // Amber
        else if (matchScore < 40) scoreBadgeClass = 'badge--neutral'; // Grey (default) should be subtle

        // Custom styling for match badge
        const badgeStyle = matchScore < 40 ? 'background: #f5f5f5; color: #999; border: 1px solid #ddd;' : '';

        // If NO preferences set, don't show score 0. Show nothing? Or ?
        // Spec says "Display matchScore as a badge". 
        // If !state.preferences, all scores are 0. Maybe hide it?
        const showScore = !!state.preferences;

        const card = document.createElement('div');
        card.className = 'job-card';
        card.innerHTML = `
            <div class="job-card__header">
                <div>
                    <div class="job-card__title">${job.title}</div>
                    <div class="job-card__company">${job.company}</div>
                </div>
                ${showScore ?
                `<div class="status-badge ${scoreBadgeClass}" style="${badgeStyle}">
                        ${matchScore}% Match
                    </div>`
                :
                `<div class="status-badge badge--source">${job.source}</div>`
            }
            </div>
            <div class="job-card__meta">
                <span class="badge badge--${job.mode.toLowerCase()}">${job.mode}</span>
                <span class="badge badge--neutral">${job.location}</span>
                <span class="badge badge--neutral">${job.experience}</span>
                <span class="badge badge--neutral">${job.salaryRange}</span>
            </div>
            
            <div style="margin-top: 12px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 12px; color: #666; font-weight: 500;">Status:</span>
                <select class="status-select ${statusClass}" onchange="updateJobStatus('${job.id}', this.value)">
                    <option value="Not Applied" ${currentStatus === 'Not Applied' ? 'selected' : ''}>Not Applied</option>
                    <option value="Applied" ${currentStatus === 'Applied' ? 'selected' : ''}>Applied</option>
                    <option value="Rejected" ${currentStatus === 'Rejected' ? 'selected' : ''}>Rejected</option>
                    <option value="Selected" ${currentStatus === 'Selected' ? 'selected' : ''}>Selected</option>
                </select>
            </div>

            <div class="job-card__footer">
                <div class="job-card__posted">${job.postedDaysAgo === 0 ? 'Today' : job.postedDaysAgo + 'd ago'}</div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn--secondary" style="padding: 6px 12px; font-size: 13px;" onclick="saveJob('${job.id}', this)">
                        ${isSaved ? 'Saved' : 'Save'}
                    </button>
                    <button class="btn btn--primary" style="padding: 6px 12px; font-size: 13px;" onclick="openJobModal('${job.id}')">
                        View
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function resetFilters() {
    state.filters = { keyword: '', location: 'All', mode: 'All', experience: 'All', source: 'All', status: 'All', sort: 'Newest', onlyMatches: false };

    // Reset UI
    const inputs = document.querySelectorAll('.filter-input, .filter-select');
    inputs.forEach(input => input.value = 'All');
    document.getElementById('filter-keyword').value = '';

    const toggle = document.getElementById('filter-matches');
    if (toggle) toggle.checked = false;

    applyFilters();
}

// --- Settings Page Logic ---
function initSettingsPage() {
    // Inputs
    const roleInput = document.getElementById('pref-role');
    const locInput = document.getElementById('pref-location');
    const expSelect = document.getElementById('pref-experience');
    const skillsInput = document.getElementById('pref-skills');
    const scoreInput = document.getElementById('pref-score');
    const scoreVal = document.getElementById('score-val');

    // Checkboxes for Mode
    const modeRemote = document.getElementById('pref-mode-remote');
    const modeHybrid = document.getElementById('pref-mode-hybrid');
    const modeOnsite = document.getElementById('pref-mode-onsite');

    // Load existing
    if (state.preferences) {
        roleInput.value = state.preferences.roleKeywords;
        locInput.value = state.preferences.preferredLocations;
        expSelect.value = state.preferences.experienceLevel;
        skillsInput.value = state.preferences.skills;
        scoreInput.value = state.preferences.minMatchScore;
        scoreVal.innerText = state.preferences.minMatchScore;

        if (state.preferences.preferredMode.includes('Remote')) modeRemote.checked = true;
        if (state.preferences.preferredMode.includes('Hybrid')) modeHybrid.checked = true;
        if (state.preferences.preferredMode.includes('Onsite')) modeOnsite.checked = true;
    }

    // Range slider update
    scoreInput.addEventListener('input', (e) => {
        scoreVal.innerText = e.target.value;
    });

    // Save
    document.getElementById('save-prefs-btn').addEventListener('click', () => {
        const selectedModes = [];
        if (modeRemote.checked) selectedModes.push('Remote');
        if (modeHybrid.checked) selectedModes.push('Hybrid');
        if (modeOnsite.checked) selectedModes.push('Onsite');

        const prefs = {
            roleKeywords: roleInput.value,
            preferredLocations: locInput.value,
            preferredMode: selectedModes,
            experienceLevel: expSelect.value,
            skills: skillsInput.value,
            minMatchScore: scoreInput.value
        };

        localStorage.setItem('jobTrackerPreferences', JSON.stringify(prefs));

        // Animation feedback
        const btn = document.getElementById('save-prefs-btn');
        const originalText = btn.innerText;
        btn.innerText = 'Saved!';
        btn.style.backgroundColor = 'var(--color-success)';
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.backgroundColor = '';
        }, 1500);
    });
}

// --- Saved Page Logic ---
function initSavedPage() {
    const container = document.getElementById('saved-job-list');
    if (!container) return;

    if (state.savedJobs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h4 class="empty-state__title">No Saved Jobs</h4>
                <p class="empty-state__text">Jobs you save will appear here for easy access.</p>
                <a href="dashboard.html" class="btn btn--primary">Browse Jobs</a>
            </div>
        `;
        return;
    }

    const savedJobsData = state.jobs.filter(job => state.savedJobs.includes(job.id));

    // Calculate match scores for saved page too if prefs exist
    if (state.preferences) {
        savedJobsData.forEach(job => job.score = calculateMatchScore(job, state.preferences));
    }

    savedJobsData.forEach(job => {
        const matchScore = job.score || 0;
        const currentStatus = state.status[job.id] || 'Not Applied';

        let statusClass = '';
        if (currentStatus === 'Applied') statusClass = 'status-applied';
        if (currentStatus === 'Rejected') statusClass = 'status-rejected';
        if (currentStatus === 'Selected') statusClass = 'status-selected';

        let scoreBadgeClass = 'badge--neutral';
        if (matchScore >= 80) scoreBadgeClass = 'status-badge--success';
        else if (matchScore >= 60) scoreBadgeClass = 'status-badge--warning';

        const showScore = !!state.preferences;

        const card = document.createElement('div');
        card.className = 'job-card';
        card.innerHTML = `
            <div class="job-card__header">
                <div>
                    <div class="job-card__title">${job.title}</div>
                    <div class="job-card__company">${job.company}</div>
                </div>
                ${showScore ?
                `<div class="status-badge ${scoreBadgeClass}">${matchScore}% Match</div>`
                :
                `<div class="status-badge badge--source">${job.source}</div>`
            }
            </div>
            <div class="job-card__meta">
                <span class="badge badge--${job.mode.toLowerCase()}">${job.mode}</span>
                <span class="badge badge--neutral">${job.salaryRange}</span>
            </div>
            
            <div style="margin-top: 12px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 12px; color: #666; font-weight: 500;">Status:</span>
                <select class="status-select ${statusClass}" onchange="updateJobStatus('${job.id}', this.value)">
                    <option value="Not Applied" ${currentStatus === 'Not Applied' ? 'selected' : ''}>Not Applied</option>
                    <option value="Applied" ${currentStatus === 'Applied' ? 'selected' : ''}>Applied</option>
                    <option value="Rejected" ${currentStatus === 'Rejected' ? 'selected' : ''}>Rejected</option>
                    <option value="Selected" ${currentStatus === 'Selected' ? 'selected' : ''}>Selected</option>
                </select>
            </div>

            <div class="job-card__footer">
                <button class="btn btn--secondary" onclick="removeSavedJob('${job.id}')">Remove</button>
                <a href="${job.applyUrl}" target="_blank" class="btn btn--primary">Apply Now</a>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- Actions (Global) ---
window.saveJob = function (id, btnElement) {
    if (state.savedJobs.includes(id)) {
        state.savedJobs = state.savedJobs.filter(itemId => itemId !== id);
        btnElement.innerText = 'Save';
    } else {
        state.savedJobs.push(id);
        btnElement.innerText = 'Saved';
    }
    localStorage.setItem('min_saved_jobs', JSON.stringify(state.savedJobs));
};

window.removeSavedJob = function (id) {
    state.savedJobs = state.savedJobs.filter(itemId => itemId !== id);
    localStorage.setItem('min_saved_jobs', JSON.stringify(state.savedJobs));
    initSavedPage();
}

// Makes updateJobStatus global so HTML can call it
window.updateJobStatus = updateJobStatus;

window.openJobModal = function (id) {
    const job = state.jobs.find(j => j.id === id);
    if (!job) return;

    const modalTitle = document.getElementById('modal-title');
    const modalSubtitle = document.getElementById('modal-subtitle');
    const modalBody = document.getElementById('modal-body');
    const modalApply = document.getElementById('modal-apply');
    const modalOverlay = document.getElementById('job-modal');

    modalTitle.innerText = job.title;

    let matchHtml = '';
    if (state.preferences) {
        const score = job.score || 0;
        matchHtml = `<span class="status-badge ${score >= 80 ? 'status-badge--success' : 'badge--neutral'}" style="margin-left: 10px;">${score}% Match</span>`;
    }
    modalTitle.innerHTML = `${job.title} ${matchHtml}`;

    modalSubtitle.innerText = `${job.company} • ${job.location} (${job.mode})`;

    const skillsHtml = job.skills.map(s => `<span class="tag">${s}</span>`).join('');
    modalBody.innerHTML = `
        <p>${job.description}</p>
        <div style="margin-top: 16px;"><strong>Salary:</strong> ${job.salaryRange}</div>
        <div style="margin-top: 16px;"><strong>Experience:</strong> ${job.experience}</div>
        <div style="margin-top: 16px;"><strong>Posted:</strong> ${job.postedDaysAgo} days ago via ${job.source}</div>
        <div class="modal__tags">${skillsHtml}</div>
    `;

    modalApply.href = job.applyUrl;
    modalOverlay.classList.add('active');
};

// --- Modal Helper ---
function setupModal() {
    const modalOverlay = document.getElementById('job-modal');
    if (!modalOverlay) return;

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) modalOverlay.classList.remove('active');
    });

    document.getElementById('modal-close').addEventListener('click', () => {
        modalOverlay.classList.remove('active');
    });
}
