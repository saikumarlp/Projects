/**
 * KodNest JD Analysis Engine
 * Handles skill extraction, scoring, and plan generation.
 * Enforces Strict Data Schema.
 */

const JDEngine = {

    // --- 1. KEYWORD DICTIONARIES ---
    dictionaries: {
        coreCS: ['DSA', 'Data Structures', 'Algorithms', 'OOP', 'Object Oriented', 'DBMS', 'Database Management', 'OS', 'Operating Systems', 'Networks', 'Computer Networks', 'System Design'],
        languages: ['Java', 'Python', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Golang', 'Go', 'Ruby', 'Swift', 'Kotlin', 'PHP'],
        web: ['React', 'Next.js', 'NextJS', 'Node.js', 'NodeJS', 'Express', 'Vue', 'Angular', 'HTML', 'CSS', 'REST', 'GraphQL', 'API'],
        data: ['SQL', 'MySQL', 'PostgreSQL', 'Postgres', 'MongoDB', 'NoSQL', 'Redis', 'ElasticSearch', 'Kafka', 'Spark', 'Hadoop'],
        cloud: ['AWS', 'Amazon Web Services', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'K8s', 'CI/CD', 'Jenkins', 'Terraform', 'Linux', 'Bash'],
        testing: ['Selenium', 'Cypress', 'Playwright', 'Jest', 'Mocha', 'JUnit', 'PyTest', 'Manual Testing', 'Automation']
    },

    // --- 5. COMPANY INTEL & ROUND MAPPING ---
    companyDb: {
        enterprise: ['Google', 'Microsoft', 'Amazon', 'TCS', 'Infosys', 'Wipro', 'Accenture', 'Cognizant', 'IBM', 'Oracle', 'Cisco', 'Intel', 'Samsung', 'Capgemini', 'HCL', 'Deloitte', 'JPMorgan', 'Goldman Sachs', 'Flipkart', 'Walmart'],
    },

    inferCompany(name) {
        if (!name) return { type: 'Startup', focus: 'Practical execution & Speed' }; // Default

        const cleanName = name.trim();
        const isEnterprise = this.companyDb.enterprise.some(e => cleanName.toLowerCase().includes(e.toLowerCase()));

        if (isEnterprise) {
            return {
                type: 'Enterprise',
                size: '2000+ Employees',
                industry: 'Technology / Services',
                focus: 'DSA, Scalability, and Core CS Fundamentals'
            };
        } else {
            return {
                type: 'Startup / Mid-Size',
                size: '< 500 Employees',
                industry: 'Product / Tech',
                focus: 'Practical Building, Framework Depth, and Agility'
            };
        }
    },

    generateRoundMapping(type, skills) {
        const rounds = [];
        // Helper to check existence in the normalized skills object
        const has = (cat) => skills[cat] && skills[cat].length > 0;

        if (type === 'Enterprise') {
            rounds.push({
                name: "Round 1: Online Assessment",
                details: "Aptitude (Quant/Verbal) + 2 DSA Coding Problems (Easy/Medium)",
                why: "Filters candidates on raw problem-solving speed and logical ability."
            });
            rounds.push({
                name: "Round 2: Technical Interview I",
                details: "DSA (Medium/Hard) + CS Fundamentals (OS/DBMS)",
                why: "Validates strong engineering basics required for scale."
            });
            rounds.push({
                name: "Round 3: Technical Interview II",
                details: "System Design (LLD) + Project Deep Dive",
                why: "Checks ability to write clean, maintainable code in realistic scenarios."
            });
            rounds.push({
                name: "Round 4: Managerial / HR",
                details: "Behavioral Questions + value fit",
                why: "Ensures cultural alignment and long-term retention."
            });
        } else {
            // Startup
            rounds.push({
                name: "Round 1: Screening / Machine Coding",
                details: has('web') ? "Build a small feature (React/Node) or Take-home assignment" : "Practical Coding challenge (Logic + API)",
                why: "Proves you can build actual products, not just invert binary trees."
            });
            rounds.push({
                name: "Round 2: Technical Deep Dive",
                details: "Framework internals + Architecture discussion",
                why: "Ensures you understand the tools you use, not just how to copy-paste."
            });
            rounds.push({
                name: "Round 3: Founder / Culture Fit",
                details: "Product sense + Ownership mentality",
                why: "Startups need self-starters who care about the product vision."
            });
        }
        return rounds;
    },

    // --- 2. EXTRACTION LOGIC ---
    extractSkills(text) {
        // Initialize strict structure
        const results = {
            coreCS: [],
            languages: [],
            web: [],
            data: [],
            cloud: [],
            testing: [],
            other: []
        };

        if (!text) return results;
        const lowerText = text.toLowerCase();
        let totalMatches = 0;

        for (const [category, keywords] of Object.entries(this.dictionaries)) {
            const matches = keywords.filter(keyword => {
                const safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${safeKeyword}\\b`, 'i');
                return regex.test(lowerText);
            });

            if (matches.length > 0) {
                // Determine if 'category' is valid in our result schema, if not (e.g. if we add new dict keys later), push to 'other' or ignore? 
                // The prompt strict schema has 'other'. 
                if (results[category]) {
                    results[category] = matches;
                } else {
                    results.other.push(...matches);
                }
                totalMatches += matches.length;
            }
        }

        // Default behavior if no skills detected
        if (totalMatches === 0) {
            results.other = ["Communication", "Problem solving", "Basic coding", "Projects"];
        }

        return resultWrap = { results, totalMatches };
    },

    // --- 3. SCORING LOGIC ---
    calculateBaseScore(extraction, metadata) {
        let score = 35; // Base

        // Count non-empty categories (excluding 'other' if we strictly follow "detected category")
        // But if 'other' has default skills, should we count it? 
        // Prompt says "Detected category present". If totalMatches=0, we forced 'other'.
        // Let's count categories that have > 0 items.

        let cats = 0;
        ['coreCS', 'languages', 'web', 'data', 'cloud', 'testing'].forEach(k => {
            if (extraction.results[k].length > 0) cats++;
        });

        score += (cats * 5);

        // Metadata bonuses
        if (metadata.company) score += 10;
        if (metadata.role) score += 10;
        if (metadata.jdLength > 800) score += 10;

        return Math.min(score, 100);
    },

    // --- 4. GENERATION LOGIC ---
    generatePlan(skills) {
        // Helper
        const has = (cat) => skills[cat] && skills[cat].length > 0;

        // A. ROUND-WISE CHECKLIST
        const checklist = {
            round1: [
                "Quantitative Aptitude (Speed/Distance, Work/Time)",
                "Logical Reasoning (Puzzles, Blood Relations)",
                "Verbal Ability (Reading Comprehension)",
                "Resume Walkthrough Preparation",
                "Basic behavioral questions (Tell me about yourself)"
            ],
            round2: [
                "Data Structures: Arrays, Strings, Linked Lists",
                "Algorithms: Sorting, Searching, Two Pointers",
                "OOP Concepts: Pillars, Interface vs Abstract",
            ],
            round3: [
                "Deep dive into Projects listed on Resume",
            ],
            round4: [
                "Salary Expectation Negotiation",
                "Why this company?",
                "Strengths and Weaknesses",
                "Handling conflict situations"
            ]
        };

        if (has('data')) checklist.round2.push("DBMS: Normalization, ACID properties, Indexing");
        if (has('web')) checklist.round3.push("Web: Event Loop, DOM, State Management patterns");
        if (has('languages') && skills.languages.includes('Java')) checklist.round3.push("Java: Collections Framework, Multithreading");

        // B. 7-DAY PLAN
        const plan = [
            { day: "Day 1-2", focus: "Foundation & Aptitude", tasks: ["Practice 30 Aptitude Qs", "Revise Core CS Theory (OS/DBMS)"] },
            { day: "Day 3-4", focus: "Problem Solving", tasks: ["Solve 10 LeetCode Easy/Medium", "Implement Standard Algos (Merge Sort, BFS/DFS)"] },
            { day: "Day 5", focus: "Tech Stack & Projects", tasks: ["Review Project Architecture", "Prepare 'Challenges Faced' stories"] },
            { day: "Day 6", focus: "Mock Interviews", tasks: ["Peer Mock Interview", "Record yourself answering HR Qs"] },
            { day: "Day 7", focus: "Final Revision", tasks: ["Cheatsheets review", "Rest & Mindset"] }
        ];

        if (has('web')) plan[2].tasks.push("Build a mini-feature using React/Node to refresh memory");

        // C. INTERVIEW QUESTIONS
        let questions = [
            "Tell me about your most challenging project.",
            "Explain the concept of Polymorphism with a real-world example.",
            "What happens when you type a URL in the browser?"
        ];

        if (has('data')) {
            questions.push("Explain Indexing in SQL and when it helps.");
            questions.push("SQL vs NoSQL: When to choose which?");
        }
        if (has('web')) {
            questions.push("Explain the Virtual DOM in React.");
            questions.push("What is the difference between specific CSS selectors?");
        }
        if (has('cloud')) {
            questions.push("What is the difference between Docker and a tailored VM?");
        }
        if (has('coreCS')) {
            questions.push("Explain Process vs Thread.");
            questions.push("How does Garbage Collection work?");
        }

        // Default fillers
        const genericQs = [
            "Where do you see yourself in 5 years?",
            "Describe a time you demonstrated leadership.",
            "How do you handle tight deadlines?",
            "What is your preferred programming language and why?"
        ];

        while (questions.length < 10) {
            questions.push(genericQs.shift());
        }

        return { checklist, plan, questions: questions.slice(0, 10) };
    },

    // --- 6. ORCHESTRATOR (Strict Schema) ---
    analyze(jdText, company, role) {
        const timestamp = new Date().toISOString();
        const id = 'analysis_' + Date.now();

        // 1. Extract
        const extraction = this.extractSkills(jdText);

        // 2. Metadata
        const metadata = {
            company: company ? company.trim() : "",
            role: role ? role.trim() : "",
            jdLength: jdText ? jdText.length : 0
        };

        // 3. Intel & Mapping
        const companyIntel = this.inferCompany(metadata.company);
        const roundMapping = this.generateRoundMapping(companyIntel.type, extraction.results);

        // 4. Scoring (Base)
        const baseScore = this.calculateBaseScore(extraction, metadata);

        // 5. Generate Content
        const generated = this.generatePlan(extraction.results);

        // 6. Construct Strict Schema Object

        // Convert checklist object to strict array [{ roundTitle, items[] }]
        const checklistArray = [
            { roundTitle: "Round 1: Screening & Aptitude", items: generated.checklist.round1 },
            { roundTitle: "Round 2: Data Structures & Core CS", items: generated.checklist.round2 },
            { roundTitle: "Round 3: Specialized Tech & Projects", items: generated.checklist.round3 },
            { roundTitle: "Round 4: Behavioral & HR", items: generated.checklist.round4 }
        ];

        const entry = {
            id,
            createdAt: timestamp,
            updatedAt: timestamp,
            company: metadata.company,
            role: metadata.role,
            jdText: jdText || "",
            extractedSkills: extraction.results, // { coreCS: [], ... }
            roundMapping: roundMapping, // [{ name, details, why }] - note: 'name' usually maps to 'roundTitle' loosely, I'll keep 'roundTitle' in checklist.
            checklist: checklistArray,
            plan7Days: generated.plan,
            questions: generated.questions,
            baseScore: baseScore,
            finalScore: baseScore, // Initially same
            skillConfidenceMap: {},  // Empty map initially
            intel: companyIntel // Keeping this for UI rendering as 'intel'
        };

        // Initialize confidence map for all found skills (default: practice)
        Object.values(entry.extractedSkills).flat().forEach(skill => {
            entry.skillConfidenceMap[skill] = 'practice';
        });

        // Recalculate finalScore based on default map? 
        // User said: Start from base. Then +2 / -2.
        // If all are 'practice', score drops? 
        // "Start from base... Then +2 for know, -2 for practice".
        // Yes. So if base is 50, and I have 5 skills all practice, it becomes 40.
        // Let's do that calc now to be consistent.
        let adjustment = 0;
        Object.values(entry.skillConfidenceMap).forEach(status => {
            if (status === 'know') adjustment += 2;
            if (status === 'practice') adjustment -= 2;
        });
        entry.finalScore = Math.max(0, Math.min(100, baseScore + adjustment));

        this.saveToHistory(entry);
        return entry;
    },

    saveToHistory(entry) {
        const history = this.getHistory(); // Safe get
        history.unshift(entry);
        if (history.length > 20) history.pop();
        localStorage.setItem('kodnestAnalysisHistory', JSON.stringify(history));
    },

    updateEntry(updatedEntry) {
        updatedEntry.updatedAt = new Date().toISOString();
        let history = this.getHistory();
        const index = history.findIndex(h => h.id === updatedEntry.id);
        if (index !== -1) {
            history[index] = updatedEntry;
            localStorage.setItem('kodnestAnalysisHistory', JSON.stringify(history));
        }
    },

    getHistory() {
        try {
            const raw = localStorage.getItem('kodnestAnalysisHistory');
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            // Basic integrity check: filter out items without ID or extractedSkills
            return parsed.filter(item => item && item.id && item.extractedSkills);
        } catch (e) {
            console.error("History corrupted:", e);
            return [];
        }
    },

    getAnalysis(id) {
        const history = this.getHistory();
        return history.find(item => item.id === id);
    }
};

window.JDEngine = JDEngine;
