document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // Tab Switching Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Drag and Drop File Upload Handling
    const dragZone = document.getElementById('drag-zone');
    const fileInput = document.getElementById('resume_file');
    const fileIndicator = document.getElementById('file-indicator');
    const fileNameDisplay = document.getElementById('file-name-display');

    if (dragZone && fileInput) {
        fileInput.addEventListener('change', handleFileSelect);

        ['dragenter', 'dragover'].forEach(eventName => {
            dragZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dragZone.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dragZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dragZone.classList.remove('drag-over');
            }, false);
        });

        dragZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                fileInput.files = files;
                handleFileSelect();
            }
        });
    }

    function handleFileSelect() {
        if (fileInput.files && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            fileNameDisplay.textContent = file.name;
            fileIndicator.classList.add('active');
        } else {
            fileIndicator.classList.remove('active');
        }
    }

    // Form Submission & Live Streaming
    const form = document.getElementById('audit-form');
    const stateIdle = document.getElementById('state-idle');
    const stateLoading = document.getElementById('state-loading');
    const reportContainer = document.getElementById('report-container');
    const submitBtn = document.getElementById('submit-btn');
    const detailedFeedback = document.getElementById('detailed-feedback');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Trigger morph layout expand
            const mainGrid = document.querySelector('.main-grid');
            form.classList.add('collapsed');
            if (mainGrid) mainGrid.classList.add('expanded');

            // Apply delayed fade-in to the spinner and scan status
            stateIdle.classList.remove('fade-in-delayed');
            stateLoading.classList.remove('fade-in-delayed');
            void stateLoading.offsetWidth; // Force layout calculation to restart animation
            stateLoading.classList.add('fade-in-delayed');

            // Toggle loading state UI
            stateIdle.classList.add('hidden');
            reportContainer.classList.add('hidden');
            stateLoading.classList.remove('hidden');
            submitBtn.disabled = true;

            // Clear previous report contents & reset bars
            detailedFeedback.innerHTML = "";
            resetScoresUI();

            const formData = new FormData(form);

            // Determine if uploading file or pasting text
            const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
            if (activeTab === 'upload-tab') {
                formData.delete('resume_text');
                if (!fileInput.files || fileInput.files.length === 0) {
                    alert('Please select a resume file to upload.');
                    showIdleState();
                    return;
                }
            } else {
                formData.delete('resume_file');
                const resumeText = document.getElementById('resume_text').value.trim();
                if (!resumeText) {
                    alert('Please paste your resume text.');
                    showIdleState();
                    return;
                }
            }

            try {
                const response = await fetch('/analyze/', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Analysis failed or server returned error.');
                }

                // Hide loader, show report cards
                stateLoading.classList.add('hidden');
                reportContainer.classList.remove('hidden');

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                
                let buffer = "";

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;

                    // Handle immediate execution errors from view stream
                    if (buffer.startsWith('[ERROR]')) {
                        detailedFeedback.innerHTML = `<div style="color: var(--accent-danger); border: 1px solid rgba(239, 68, 68, 0.25); background: rgba(239, 68, 68, 0.05); padding: 1.25rem; border-radius: 12px; font-weight: 500;">${buffer}</div>`;
                        break;
                    }

                    // Extract and parse scores
                    const scoresMatch = buffer.match(/\[SCORES\]([\s\S]*?)(\[\/SCORES\]|$)/);
                    if (scoresMatch) {
                        const scoresContent = scoresMatch[1];
                        const lines = scoresContent.split('\n');
                        lines.forEach(line => {
                            const parts = line.split(':');
                            if (parts.length === 2) {
                                const key = parts[0].trim().toLowerCase();
                                const val = parseInt(parts[1].trim(), 10);
                                if (!isNaN(val)) {
                                    updateScoreUI(key, val);
                                }
                            }
                        });
                    }

                    // Render markdown content
                    let markdownContent = buffer;
                    if (buffer.includes('[/SCORES]')) {
                        markdownContent = buffer.split('[/SCORES]')[1];
                    } else if (buffer.includes('[SCORES]')) {
                        markdownContent = "";
                    }

                    if (markdownContent.trim()) {
                        detailedFeedback.innerHTML = marked.parse(markdownContent);
                    }
                }

            } catch (err) {
                alert(err.message || 'An error occurred during communication.');
                showIdleState();
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    function showIdleState() {
        const paramStack = document.getElementById('audit-form');
        const mainGrid = document.querySelector('.main-grid');
        if (paramStack && mainGrid) {
            paramStack.classList.remove('collapsed');
            mainGrid.classList.remove('expanded');
        }

        stateLoading.classList.add('hidden');
        reportContainer.classList.add('hidden');
        stateIdle.classList.remove('hidden');
        submitBtn.disabled = false;
    }

    // Go Back button handling
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            const paramStack = document.getElementById('audit-form');
            const mainGrid = document.querySelector('.main-grid');
            
            // Restore width of parameters stack & shrink results panel back to original width
            if (paramStack) paramStack.classList.remove('collapsed');
            if (mainGrid) mainGrid.classList.remove('expanded');

            // Hide report/loading and show idle state
            reportContainer.classList.add('hidden');
            stateLoading.classList.add('hidden');
            
            // Apply delayed fade-in to idle state so content appears after morph shrinks back
            stateIdle.classList.remove('fade-in-delayed');
            stateLoading.classList.remove('fade-in-delayed');
            void stateIdle.offsetWidth; // Force layout calculation to restart animation
            stateIdle.classList.add('fade-in-delayed');
            stateIdle.classList.remove('hidden');
            
            submitBtn.disabled = false;
        });
    }

    function updateScoreUI(key, value) {
        if (key === 'overall') {
            const ring = document.getElementById('overall-ring');
            const text = document.getElementById('overall-value');
            const grade = document.getElementById('overall-grade');

            if (ring && text && grade) {
                const offset = 283 - (value / 100) * 283;
                ring.style.strokeDashoffset = offset;
                text.textContent = value;

                if (value >= 90) {
                    grade.textContent = "Excellent Match";
                    grade.style.color = "var(--accent-success)";
                } else if (value >= 75) {
                    grade.textContent = "Strong Match";
                    grade.style.color = "var(--accent-secondary)";
                } else if (value >= 60) {
                    grade.textContent = "Needs Optimization";
                    grade.style.color = "var(--accent-primary)";
                } else {
                    grade.textContent = "Critical Gaps";
                    grade.style.color = "var(--accent-danger)";
                }
            }
        } else {
            const scoreSpan = document.getElementById(`score-${key}`);
            const barFill = document.getElementById(`bar-${key}`);

            if (scoreSpan && barFill) {
                scoreSpan.textContent = `${value}/100`;
                barFill.style.width = `${value}%`;

                if (value >= 85) {
                    barFill.style.backgroundColor = "var(--accent-success)";
                } else if (value >= 65) {
                    barFill.style.backgroundColor = ""; // Fallback to default stylesheet gradient
                } else {
                    barFill.style.backgroundColor = "var(--accent-danger)";
                }
            }
        }
    }

    function resetScoresUI() {
        const ring = document.getElementById('overall-ring');
        const text = document.getElementById('overall-value');
        const grade = document.getElementById('overall-grade');
        if (ring) ring.style.strokeDashoffset = 283;
        if (text) text.textContent = "0";
        if (grade) {
            grade.textContent = "Evaluating...";
            grade.style.color = "var(--accent-secondary)";
        }

        const keys = ['ats', 'sectioning', 'keywords', 'clarity', 'education', 'links', 'design', 'credibility'];
        keys.forEach(key => {
            const scoreSpan = document.getElementById(`score-${key}`);
            const barFill = document.getElementById(`bar-${key}`);
            if (scoreSpan) scoreSpan.textContent = "--";
            if (barFill) {
                barFill.style.width = "0%";
                barFill.style.backgroundColor = "";
            }
        });
    }
});

// Theme management
window.toggleTheme = function() {
    const body = document.body;
    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    }
};

// Startup Overlay Animation
document.addEventListener('DOMContentLoaded', () => {
    // Initially disable scrolling on body
    document.body.style.overflow = 'hidden';

    const overlay = document.getElementById('startup-overlay');
    const spinner = document.getElementById('startup-spinner');
    const startupLogo = document.getElementById('startup-logo-group');
    const headerLogo = document.getElementById('header-logo-group');
    const pageContainer = document.querySelector('.page-container');
    const subtitle = document.querySelector('.page-header .subtitle');

    if (!overlay || !spinner || !startupLogo || !headerLogo) {
        // Fallback if elements don't exist
        document.body.style.overflow = '';
        return;
    }

    // Wait 1 second for the spinner animation
    setTimeout(() => {
        // Fade out the spinner
        spinner.style.opacity = '0';

        // Wait 300ms for spinner fade transition to complete
        setTimeout(() => {
            // Make header logo block layout ready but transparent
            headerLogo.style.opacity = '0';
            headerLogo.style.visibility = 'visible';

            // Get coordinates
            const rectHeader = headerLogo.getBoundingClientRect();
            const rectStartup = startupLogo.getBoundingClientRect();

            const scale = rectHeader.width / rectStartup.width;

            const headerCenterX = rectHeader.left + rectHeader.width / 2;
            const headerCenterY = rectHeader.top + rectHeader.height / 2;

            const startupCenterX = rectStartup.left + rectStartup.width / 2;
            const startupCenterY = rectStartup.top + rectStartup.height / 2;

            const xDiff = headerCenterX - startupCenterX;
            const yDiff = headerCenterY - startupCenterY;

            // Apply morph transform to center logo
            startupLogo.style.transformOrigin = 'center center';
            startupLogo.style.transform = `translate(${xDiff}px, ${yDiff}px) scale(${scale})`;

            // Wait for morph animation (800ms)
            setTimeout(() => {
                // Show actual header logo
                headerLogo.style.opacity = '1';
                
                // Fade out overlay
                overlay.style.opacity = '0';

                // Fade in the rest of the webapp
                if (pageContainer) pageContainer.style.opacity = '1';
                if (subtitle) subtitle.style.opacity = '1';

                // Restore scrolling
                document.body.style.overflow = '';

                // Completely hide overlay after fade out
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 400);
            }, 800);
        }, 300);
    }, 1000);
});
