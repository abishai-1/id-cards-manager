// --- Satish Ad Agency Frontend Application ---
// UI & State Management with Secure API Integrations

// UI/UX Pro Max Principles: Modular Design, Performance optimized transitions, and robust error states.

let students = [];
let idCardFrameData = null;
let idCardConfig = {};
let projects = [];
let currentProject = null; // Object {id, name}
let currentUser = null;
let currentRole = null;
let tableSort = { key: "id", direction: "asc" };
let currentPage = 1;
let pageSize = 50;
let totalRecords = 0;
let totalPages = 0;
let currentSearch = "";
let includeArchived = false;
let serverSearchTimer = null;
let contactMessages = [];
let catalogImages = {};
let selectedCatalogItem = null;
let pendingCatalogImages = [];
let pendingCatalogFiles = [];

const catalogImageMaxWidth = 1200;
const catalogImageMaxHeight = 900;
const catalogImageQuality = 0.82;
const featuredCatalogKeys = new Set(['id-cards', 'belts-ties', 't-shirts-tracks', 'school-bags']);

const catalogItems = [
    { key: "id-cards", name: "ID Cards", icon: "id-card-outline" },
    { key: "belts-ties", name: "Belts & Ties", icon: "shirt-outline" },
    { key: "school-diaries", name: "School Diaries", icon: "journal-outline" },
    { key: "progress-reports", name: "Progress Reports", icon: "bar-chart-outline" },
    { key: "book-cover-pages", name: "Book Cover Pages", icon: "book-outline" },
    { key: "student-files", name: "Student Files", icon: "folder-open-outline" },
    { key: "student-file-folders", name: "Student File Folders", icon: "file-tray-full-outline" },
    { key: "answer-sheets", name: "Answer Sheets", icon: "document-text-outline" },
    { key: "note-books", name: "Note Books", icon: "library-outline" },
    { key: "cloth-ribbon-badges", name: "Cloth & Ribbon Badges", icon: "ribbon-outline" },
    { key: "pocket-pvc-badges", name: "Pocket PVC & Badges", icon: "shield-checkmark-outline" },
    { key: "prize-medals", name: "Prize Medals", icon: "medal-outline" },
    { key: "prize-shields", name: "Prize Shields", icon: "trophy-outline" },
    { key: "t-shirts-tracks", name: "T-Shirts / Tracks", icon: "shirt-outline" },
    { key: "school-socks", name: "School Socks", icon: "footsteps-outline" },
    { key: "school-shoes", name: "School Shoes", icon: "walk-outline" },
    { key: "caps", name: "Caps", icon: "happy-outline" },
    { key: "brochures-posters", name: "Brochures & Posters", icon: "newspaper-outline" },
    { key: "display-boards", name: "Display Boards", icon: "easel-outline" },
    { key: "non-woven-bags", name: "Non-woven Bags", icon: "bag-handle-outline" },
    { key: "school-bags", name: "School Bags", icon: "bag-outline" },
    { key: "and-more", name: "And More...", icon: "add-circle-outline" }
];

const defaultIdConfig = {
    photo: { show: true, x: 50, y: 150, w: 100, h: 120 },
    name: { label: "Student Name", show: true, x: 100, y: 300, size: 24, color: "#000000", align: "left" },
    id: { label: "ID Number", show: true, x: 100, y: 340, size: 18, color: "#444444", align: "left" },
    classInfo: { label: "Class & Section", show: true, x: 100, y: 370, size: 18, color: "#444444", align: "left" },
    roll: { label: "Roll Number", show: false, x: 100, y: 400, size: 18, color: "#444444", align: "left" },
    father: { label: "Father's Name", show: false, x: 100, y: 400, size: 16, color: "#444444", align: "left" },
    mother: { label: "Mother's Name", show: false, x: 100, y: 430, size: 16, color: "#444444", align: "left" },
    contact: { label: "Phone Number", show: false, x: 100, y: 460, size: 16, color: "#444444", align: "left" },
    address: { label: "Address Line", show: false, x: 100, y: 490, size: 14, color: "#444444", align: "left" },
    dob: { label: "Date of Birth", show: false, x: 100, y: 520, size: 14, color: "#444444", align: "left" },
    blood: { label: "Blood Group", show: false, x: 100, y: 550, size: 14, color: "#444444", align: "left" }
};

// API FETCH WRAPPER WITH AUTH HEADERS
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem("sa_session_token");
    const headers = options.headers || {};
    
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && typeof options.body === "object") {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(options.body);
    }

    options.headers = headers;

    try {
        const response = await fetch(endpoint, options);
        const contentType = response.headers.get("content-type") || "";
        const result = contentType.includes("application/json")
            ? await response.json()
            : {
                success: false,
                message: response.ok
                    ? "Unexpected server response"
                    : `Server error (${response.status}). Please check the backend logs.`
            };
        if (response.status === 401 && endpoint !== "/api/auth/login") {
            // Soft logout only for authenticated API calls, not failed login attempts.
            logout();
            throw new Error(result.message || "Session expired. Please log in again.");
        }
        if (!response.ok) {
            throw new Error(result.message || "An error occurred");
        }
        return result;
    } catch (err) {
        console.error(`API Error on ${endpoint}:`, err);
        throw err;
    }
}

// PROJECT & DATA LOADING
async function loadProjects() {
    if (currentRole !== 'admin') return;
    try {
        const res = await apiRequest("/api/projects");
        if (res.success) {
            projects = res.projects;
            const cachedProjId = localStorage.getItem("sa_current_project_id");
            if (cachedProjId) {
                currentProject = projects.find(p => p.id == cachedProjId) || projects[0] || null;
            } else {
                currentProject = projects[0] || null;
            }
            if (currentProject) {
                localStorage.setItem("sa_current_project_id", currentProject.id);
            }
            updateProjectSelectorUI();
        }
    } catch (err) {
        console.warn("Failed to load projects", err);
    }
}

async function loadProjectData() {
    if (!currentRole) return;
    try {
        if (currentRole === 'admin' && !currentProject) {
            students = [];
            idCardFrameData = null;
            idCardConfig = JSON.parse(JSON.stringify(defaultIdConfig));
            if (document.getElementById('excel-status')) document.getElementById('excel-status').textContent = '';
            if (document.getElementById('photo-status')) document.getElementById('photo-status').textContent = '';
            if (document.getElementById('frame-status')) document.getElementById('frame-status').textContent = '';
            showDashboard(currentRole, currentUser);
            updateSortHeaders();
            updatePaginationUI();
            updateAccessCodeUI();
            return;
        }

        let url = "/api/students";
        const studentParams = new URLSearchParams();
        if (currentRole === 'admin' && currentProject) {
            studentParams.set('project_id', currentProject.id);
        }
        if (currentRole === 'admin' || currentRole === 'staff') {
            studentParams.set('search', currentSearch);
            studentParams.set('sort', tableSort.key);
            studentParams.set('direction', tableSort.direction);
            studentParams.set('page', currentPage);
            studentParams.set('page_size', pageSize);
            studentParams.set('include_archived', includeArchived ? 'true' : 'false');
        }
        const queryString = studentParams.toString();
        if (queryString) url += `?${queryString}`;
        
        const studentRes = await apiRequest(url);
        if (studentRes.success) {
            students = studentRes.students;
            totalRecords = Number(studentRes.total || students.length);
            currentPage = Number(studentRes.page || currentPage || 1);
            pageSize = Number(studentRes.page_size || pageSize);
            totalPages = Number(studentRes.total_pages || 0);
        }

        // Load project canvas config
        if (currentRole === 'admin') {
            const activeProjId = currentProject ? currentProject.id : null;
            const configUrl = activeProjId ? `/api/config?project_id=${activeProjId}` : '/api/config';
            
            const configRes = await apiRequest(configUrl);
            if (configRes.success) {
                idCardFrameData = configRes.frame_data;
                const savedConfig = configRes.config_json;
                
                idCardConfig = JSON.parse(JSON.stringify(defaultIdConfig)); // Deep copy
                if (savedConfig && Object.keys(savedConfig).length > 0) {
                    for (let key in defaultIdConfig) {
                        if (savedConfig[key]) {
                            idCardConfig[key] = { ...defaultIdConfig[key], ...savedConfig[key] };
                            idCardConfig[key].label = defaultIdConfig[key].label; // Lock description
                        }
                    }
                }
            }
        }

        // Update indicators
        if (document.getElementById('excel-status')) document.getElementById('excel-status').textContent = '';
        if (document.getElementById('photo-status')) document.getElementById('photo-status').textContent = '';
        if (document.getElementById('frame-status')) document.getElementById('frame-status').textContent = idCardFrameData ? "\u2713 Frame Saved on Server" : '';

        // Render dashboard tables
        showDashboard(currentRole, currentUser);
        updateSortHeaders();
        updatePaginationUI();
        updateAccessCodeUI();
        if (currentRole === 'admin') {
            await loadContactMessages();
        }
        if (currentRole === 'staff') {
            await loadCorrectionNotes();
        }
    } catch (err) {
        console.error("Failed to load student data", err);
    }
}

async function createNewProject() {
    const newName = prompt("Enter new school name:");
    if (newName && newName.trim() !== '') {
        try {
            const res = await apiRequest("/api/projects", {
                method: "POST",
                body: { name: newName.trim() }
            });
            if (res.success) {
                projects.push(res.project);
                currentProject = res.project;
                localStorage.setItem("sa_current_project_id", currentProject.id);
                updateProjectSelectorUI();
                await loadProjectData();
                if (res.project.access_code) {
                    alert(`Staff access code for ${res.project.name}: ${res.project.access_code}`);
                }
            }
        } catch (err) {
            alert(err.message || "Failed to create school.");
        }
    }
}

async function switchProject(projId) {
    currentProject = projects.find(p => p.id == projId) || null;
    if (currentProject) {
        localStorage.setItem("sa_current_project_id", currentProject.id);
        await loadProjectData();
    }
}

async function deleteProject() {
    if (!currentProject) return;
    if (projects.length <= 1) {
        alert("You cannot delete the only existing school. Please create a new one first.");
        return;
    }
    if (confirm(`Are you sure you want to completely delete the school "${currentProject.name}"?\nThis will erase all related database records and configs permanently.`)) {
        try {
            const res = await apiRequest(`/api/projects/${currentProject.id}`, { method: "DELETE" });
            if (res.success) {
                projects = projects.filter(p => p.id !== currentProject.id);
                currentProject = projects[0];
                localStorage.setItem("sa_current_project_id", currentProject.id);
                updateProjectSelectorUI();
                await loadProjectData();
            }
        } catch (err) {
            alert(err.message || "Failed to delete school.");
        }
    }
}

function updateProjectSelectorUI() {
    const sel = document.getElementById('project-selector');
    if (!sel) return;
    sel.innerHTML = '';
    projects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.access_code ? `${p.name} - ${p.access_code}` : p.name;
        if (currentProject && p.id === currentProject.id) opt.selected = true;
        sel.appendChild(opt);
    });
    updateAccessCodeUI();
}

function updateAccessCodeUI() {
    const display = document.getElementById('access-code-display');
    if (!display) return;
    if (currentRole === 'admin' && currentProject && currentProject.access_code) {
        display.textContent = `Staff Code: ${currentProject.access_code}`;
    } else {
        display.textContent = '';
    }
}

function setSort(key) {
    if (tableSort.key === key) {
        tableSort.direction = tableSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        tableSort = { key, direction: 'asc' };
    }
    currentPage = 1;
    loadProjectData();
}

function updateSortHeaders() {
    document.querySelectorAll('#main-table th[data-sort]').forEach(header => {
        const indicator = header.querySelector('.sort-indicator');
        if (!indicator) return;
        indicator.textContent = header.dataset.sort === tableSort.key
            ? (tableSort.direction === 'asc' ? '^' : 'v')
            : '';
    });
}

function updatePaginationUI() {
    const controls = document.getElementById('pagination-controls');
    const summary = document.getElementById('pagination-summary');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const sizeSelect = document.getElementById('page-size-select');
    const archivedToggle = document.getElementById('include-archived');
    if (!controls || !summary || !prevBtn || !nextBtn) return;

    const isPagedRole = currentRole === 'admin' || currentRole === 'staff';
    controls.style.display = isPagedRole ? 'flex' : 'none';
    if (!isPagedRole) return;

    const visibleStart = totalRecords === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
    const visibleEnd = Math.min(currentPage * pageSize, totalRecords);
    summary.textContent = `Page ${currentPage} of ${totalPages || 1} - ${visibleStart}-${visibleEnd} of ${totalRecords}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = totalPages === 0 || currentPage >= totalPages;
    if (sizeSelect) sizeSelect.value = String(pageSize);
    if (archivedToggle) archivedToggle.checked = includeArchived;
}

function changePage(delta) {
    const nextPage = currentPage + delta;
    if (nextPage < 1 || (totalPages && nextPage > totalPages)) return;
    currentPage = nextPage;
    loadProjectData();
}

function changePageSize(value) {
    pageSize = Number(value) || 50;
    currentPage = 1;
    loadProjectData();
}

function toggleArchivedFilter(checked) {
    includeArchived = Boolean(checked);
    currentPage = 1;
    loadProjectData();
}

async function copyAccessCode() {
    if (!currentProject || !currentProject.access_code) {
        alert("No staff access code available for this project.");
        return;
    }
    try {
        await navigator.clipboard.writeText(currentProject.access_code);
        alert(`Copied staff code: ${currentProject.access_code}`);
    } catch (_err) {
        prompt("Copy staff access code:", currentProject.access_code);
    }
}

async function regenerateAccessCode() {
    if (!currentProject) return;
    if (!confirm(`Regenerate staff access code for "${currentProject.name}"? The old code will stop working.`)) return;
    try {
        const res = await apiRequest(`/api/projects/${currentProject.id}/access-code/regenerate`, { method: "POST" });
        if (res.success) {
            currentProject = res.project;
            projects = projects.map(project => project.id === currentProject.id ? currentProject : project);
            updateProjectSelectorUI();
            updateAccessCodeUI();
            alert(`New staff access code: ${currentProject.access_code}`);
        }
    } catch (err) {
        alert(err.message || "Failed to regenerate staff access code.");
    }
}

async function archiveStudent(studentId, archived = true) {
    if (!currentProject) return;
    const verb = archived ? "archive" : "restore";
    if (!confirm(`Do you want to ${verb} student "${studentId}"?`)) return;
    try {
        const res = await apiRequest(`/api/students/${encodeURIComponent(studentId)}/archive?project_id=${currentProject.id}`, {
            method: "POST",
            body: { archived }
        });
        if (res.success) {
            await loadProjectData();
        }
    } catch (err) {
        alert(err.message || `Failed to ${verb} student.`);
    }
}

async function deleteStudent(studentId) {
    if (!currentProject) return;
    if (!confirm(`Permanently delete student "${studentId}"? This cannot be undone.`)) return;
    try {
        const res = await apiRequest(`/api/students/${encodeURIComponent(studentId)}?project_id=${currentProject.id}`, {
            method: "DELETE"
        });
        if (res.success) {
            await loadProjectData();
        }
    } catch (err) {
        alert(err.message || "Failed to delete student.");
    }
}

function renderUploadReport(summary) {
    const container = document.getElementById('upload-report');
    if (!container || !summary) return;
    const unmatched = summary.unmatched_photos || [];
    const matchedFiles = summary.matched_photo_files || [];
    container.classList.remove('hidden');
    container.innerHTML = `
        <strong>Upload Report</strong>
        <div>Total records: ${escapeHtml(summary.total_records || 0)} - Photos in database: ${escapeHtml(summary.photos_matched || 0)} - Uploaded photos: ${escapeHtml(summary.uploaded_photo_count || 0)}</div>
        <div>Matched this upload: ${matchedFiles.length ? escapeHtml(matchedFiles.join(', ')) : 'None'}</div>
        <div style="color:${unmatched.length ? '#b45309' : '#15803d'};">Unmatched photos: ${unmatched.length ? escapeHtml(unmatched.join(', ')) : 'None'}</div>
    `;
}

async function loadContactMessages() {
    if (currentRole !== 'admin') return;
    try {
        const res = await apiRequest("/api/contact?limit=100");
        if (res.success) {
            contactMessages = res.messages || [];
            renderContactMessages();
        }
    } catch (err) {
        console.warn("Failed to load contact messages", err);
    }
}

function renderContactMessages() {
    const body = document.getElementById('contact-messages-body');
    if (!body) return;
    if (!contactMessages.length) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center;">No contact messages found.</td></tr>';
        return;
    }
    body.innerHTML = contactMessages.map(message => `
        <tr>
            <td data-label="Name">${escapeHtml(message.name)}</td>
            <td data-label="Email">${escapeHtml(message.email)}</td>
            <td data-label="Message" style="text-align:left;">${escapeHtml(message.message)}</td>
            <td data-label="Received">${escapeHtml(message.created_at || '-')}</td>
            <td data-label="Action">
                <button class="btn-outline" style="padding: 0.25rem 0.75rem; font-size: 0.85rem; border-color: #ef4444; color: #ef4444;"
                    onclick="deleteContactMessage(${message.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function deleteContactMessage(messageId) {
    if (!confirm('Delete this contact message permanently?')) return;
    try {
        const res = await apiRequest(`/api/contact/${messageId}`, { method: 'DELETE' });
        if (res.success) {
            contactMessages = contactMessages.filter(m => m.id !== messageId);
            renderContactMessages();
        }
    } catch (err) {
        alert(err.message || 'Failed to delete message.');
    }
}

async function loadCorrectionNotes() {
    const queryParam = (currentRole === 'admin' && currentProject) ? `?project_id=${currentProject.id}` : '';
    try {
        const res = await apiRequest(`/api/students/notes${queryParam}`);
        if (res.success) {
            renderCorrectionNotes(res.notes || []);
        }
    } catch (err) {
        console.warn('Failed to load correction notes', err);
    }
}

function renderCorrectionNotes(notes) {
    const body = document.getElementById('correction-notes-body');
    if (!body) return;
    if (!notes.length) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center;">No correction notes found. Students with correction requests will appear here.</td></tr>';
        return;
    }
    body.innerHTML = notes.map(n => `
        <tr>
            <td data-label="Student ID">${escapeHtml(n.id)}</td>
            <td data-label="Name">${escapeHtml(n.name)}</td>
            <td data-label="Class">${escapeHtml((n.class || '') + (n.section ? ' - ' + n.section : ''))}</td>
            <td data-label="Note" style="text-align:left; color: var(--text);">${escapeHtml(n.correction_note)}</td>
            <td data-label="Action">
                <button class="btn-outline" style="padding: 0.25rem 0.75rem; font-size: 0.85rem; border-color: #ef4444; color: #ef4444;"
                    onclick="deleteStudentNote('${escapeJsArg(n.id)}')">Clear</button>
            </td>
        </tr>
    `).join('');
}

async function deleteStudentNote(studentId) {
    if (!confirm('Clear this correction note? The student can still submit a new one.')) return;
    const queryParam = (currentRole === 'admin' && currentProject) ? `?project_id=${currentProject.id}` : '';
    try {
        const res = await apiRequest(`/api/students/${encodeURIComponent(studentId)}/note${queryParam}`, {
            method: 'DELETE'
        });
        if (res.success) {
            await loadCorrectionNotes();
        }
    } catch (err) {
        alert(err.message || 'Failed to clear note.');
    }
}

async function openCatalogModal() {
    if (currentRole !== 'admin') {
        alert("Only admins can edit the public catalog.");
        return;
    }
    const modal = document.getElementById('catalogModal');
    modal.classList.add('active');
    document.getElementById('catalog-items-list').innerHTML = '<p>Loading catalog...</p>';
    document.getElementById('catalog-item-editor').classList.add('hidden');
    selectedCatalogItem = null;
    pendingCatalogImages = [];
    pendingCatalogFiles = [];
    setCatalogSaveStatus('');

    try {
        const res = await apiRequest("/api/catalog");
        catalogImages = res.catalog || {};
        renderCatalogItems();
    } catch (err) {
        document.getElementById('catalog-items-list').innerHTML = '<p>Could not load the catalog editor.</p>';
        alert(err.message || "Failed to load catalog images.");
    }
}

function closeCatalogModal() {
    document.getElementById('catalogModal').classList.remove('active');
    selectedCatalogItem = null;
    pendingCatalogImages = [];
    pendingCatalogFiles = [];
    setCatalogSaveStatus('');
}

function renderCatalogItems() {
    const container = document.getElementById('catalog-items-list');
    container.innerHTML = catalogItems.map(item => {
        const isFeatured = featuredCatalogKeys.has(item.key);
        const imgCount = catalogImages[item.key] ? catalogImages[item.key].length : 0;
        return `
        <div class="catalog-admin-item${isFeatured ? ' catalog-featured-item' : ''}">
            ${isFeatured ? '<span class="catalog-featured-badge">\u2B50 Featured</span>' : ''}
            <div class="catalog-admin-icon"><ion-icon name="${item.icon}"></ion-icon></div>
            <div class="catalog-admin-copy">
                <strong>${escapeHtml(item.name)}</strong>
                <span>${imgCount > 0 ? `${imgCount} custom image${imgCount > 1 ? 's' : ''} active` : 'Using website default images'}</span>
            </div>
            <button class="btn btn-outline" style="padding: 0.4rem 0.85rem;"
                onclick="selectCatalogItem('${item.key}')">${isFeatured ? 'Edit \u2605' : 'Edit'}</button>
        </div>`;
    }).join('');
}

function selectCatalogItem(itemKey) {
    selectedCatalogItem = catalogItems.find(item => item.key === itemKey) || null;
    if (!selectedCatalogItem) return;

    pendingCatalogImages = [];
    pendingCatalogFiles = [];
    setCatalogSaveStatus('');
    const input = document.getElementById('catalog-image-input');
    input.value = '';
    document.getElementById('catalog-editor-title').textContent = `Edit ${selectedCatalogItem.name}`;
    document.getElementById('catalog-item-editor').classList.remove('hidden');
    renderCatalogImagePreview(catalogImages[itemKey] || []);
}

function catalogFileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
        reader.readAsDataURL(file);
    });
}

function optimizeCatalogImage(file) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const scale = Math.min(
                1,
                catalogImageMaxWidth / image.naturalWidth,
                catalogImageMaxHeight / image.naturalHeight
            );
            const width = Math.max(1, Math.round(image.naturalWidth * scale));
            const height = Math.max(1, Math.round(image.naturalHeight * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0, width, height);
            canvas.toBlob(blob => {
                if (!blob) {
                    reject(new Error(`Could not optimize ${file.name}.`));
                    return;
                }
                const optimizedFile = new File(
                    [blob],
                    `${file.name.replace(/\.[^.]+$/, '') || 'catalog'}.jpg`,
                    { type: 'image/jpeg' }
                );
                resolve({
                    file: optimizedFile,
                    preview: canvas.toDataURL('image/jpeg', catalogImageQuality),
                    originalSize: file.size,
                    optimizedSize: optimizedFile.size
                });
            }, 'image/jpeg', catalogImageQuality);
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`Could not load ${file.name}.`));
        };
        image.src = objectUrl;
    });
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function previewCatalogImages(event) {
    const files = Array.from(event.target.files || []);
    if (files.length < 4 || files.length > 6) {
        pendingCatalogImages = [];
        pendingCatalogFiles = [];
        event.target.value = '';
        setCatalogSaveStatus('');
        alert('Please select 4 to 6 images.');
        return;
    }
    if (files.some(file => !file.type.startsWith('image/'))) {
        pendingCatalogImages = [];
        pendingCatalogFiles = [];
        event.target.value = '';
        setCatalogSaveStatus('');
        alert('Please select image files only.');
        return;
    }

    try {
        setCatalogSaveStatus('Optimizing images for faster upload...');
        const optimizedImages = await Promise.all(files.map(optimizeCatalogImage));
        pendingCatalogFiles = optimizedImages.map(image => image.file);
        pendingCatalogImages = optimizedImages.map(image => image.preview);
        renderCatalogImagePreview(pendingCatalogImages);
        const originalTotal = files.reduce((sum, file) => sum + file.size, 0);
        const optimizedTotal = optimizedImages.reduce((sum, image) => sum + image.optimizedSize, 0);
        setCatalogSaveStatus(`Ready to save ${optimizedImages.length} optimized image${optimizedImages.length > 1 ? 's' : ''} (${formatBytes(originalTotal)} -> ${formatBytes(optimizedTotal)}).`);
    } catch (err) {
        pendingCatalogImages = [];
        pendingCatalogFiles = [];
        setCatalogSaveStatus('');
        alert(err.message || "Could not read the selected images.");
    }
}

function renderCatalogImagePreview(images) {
    const preview = document.getElementById('catalog-image-preview');
    if (!images.length) {
        preview.innerHTML = '<p class="catalog-default-note">This service currently uses the built-in website gallery. Select four images to replace it.</p>';
        return;
    }
    preview.innerHTML = images.map((image, index) => `
        <div class="catalog-preview-image">
            <img src="${image}" alt="Catalog image ${index + 1}">
            <span>Image ${index + 1}</span>
        </div>
    `).join('');
}

function setCatalogSaveStatus(message, isError = false) {
    const status = document.getElementById('catalog-save-status');
    if (!status) return;
    status.textContent = message || '';
    status.style.color = isError ? '#dc2626' : 'var(--text-light)';
}

async function saveCatalogImages() {
    if (currentRole !== 'admin' || !selectedCatalogItem) {
        alert('Only admins can edit the public catalog.');
        return;
    }
    if (pendingCatalogFiles.length < 4 || pendingCatalogFiles.length > 6) {
        alert('Please select 4 to 6 new images before saving.');
        return;
    }

    const saveButton = document.getElementById('catalog-save-btn');
    if (saveButton) saveButton.disabled = true;
    setCatalogSaveStatus('Saving gallery images...');

    try {
        const formData = new FormData();
        pendingCatalogFiles.forEach(file => formData.append('images', file));
        const res = await apiRequest(`/api/catalog/${selectedCatalogItem.key}`, {
            method: "PUT",
            body: formData
        });
        catalogImages[selectedCatalogItem.key] = res.images;
        pendingCatalogImages = [];
        pendingCatalogFiles = [];
        renderCatalogItems();
        renderCatalogImagePreview(res.images);
        setCatalogSaveStatus('Saved. These images are now live on the main page.');
        alert(`${selectedCatalogItem.name} gallery updated successfully.`);
    } catch (err) {
        setCatalogSaveStatus(err.message || "Failed to save catalog images.", true);
        alert(err.message || "Failed to save catalog images.");
    } finally {
        if (saveButton) saveButton.disabled = false;
    }
}

// LOGIN & AUTH ROUTINES
async function handleLogin(e, role) {
    e.preventDefault();
    let bodyPayload = { role };

    if (role === 'student') {
        bodyPayload.school = document.getElementById('student-school-input').value.trim();
        bodyPayload.class = document.getElementById('student-class-input').value.trim();
        bodyPayload.section = document.getElementById('student-section-input').value.trim();
        bodyPayload.roll_number = document.getElementById('student-roll-input').value.trim();
        bodyPayload.photo_id = document.getElementById('student-photo-id-input').value.trim();
    } else if (role === 'staff') {
        bodyPayload.code = document.getElementById('staff-code-input').value.strip ? document.getElementById('staff-code-input').value.strip() : document.getElementById('staff-code-input').value.trim();
    } else if (role === 'admin') {
        bodyPayload.username = document.getElementById('admin-user-input').value.trim();
        bodyPayload.password = document.getElementById('admin-pass-input').value;
    }

    try {
        const res = await apiRequest("/api/auth/login", {
            method: "POST",
            body: bodyPayload
        });

        if (res.success) {
            localStorage.setItem("sa_session_token", res.token);
            localStorage.setItem("sa_user_role", res.role);
            localStorage.setItem("sa_user_ctx", JSON.stringify(res.userContext));

            currentRole = res.role;
            currentUser = res.userContext;

            if (currentRole === 'admin') {
                await loadProjects();
            } else if (currentRole === 'staff') {
                currentProject = { id: currentUser.project_id, name: currentUser.project_name };
            }

            await loadProjectData();
        }
    } catch (err) {
        alert(err.message || "Verification failed! Double-check credentials.");
    }
}

async function logout() {
    try {
        await fetch("/api/auth/logout", {
            method: "POST",
            headers: { "Authorization": `Bearer ${localStorage.getItem("sa_session_token")}` }
        });
    } catch (e) {}

    localStorage.removeItem("sa_session_token");
    localStorage.removeItem("sa_user_role");
    localStorage.removeItem("sa_user_ctx");
    localStorage.removeItem("sa_current_project_id");

    currentRole = null;
    currentUser = null;
    currentProject = null;
    students = [];
    idCardFrameData = null;
    document.body.classList.remove('admin-mode', 'staff-mode', 'student-mode');

    document.getElementById('dashboard-content').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('logout-btn').classList.add('hidden');

    showRoleSelection();
    document.querySelectorAll('.login-form-container input').forEach(input => input.value = '');
}

// DASHBOARD LAYOUT & TABLE RENDERING
function showDashboard(role, userCtx = null) {
    document.body.classList.toggle('admin-mode', role === 'admin');
    document.body.classList.toggle('staff-mode', role === 'staff');
    document.body.classList.toggle('student-mode', role === 'student');

    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('dashboard-content').classList.remove('hidden');
    document.getElementById('user-info').style.display = 'block';
    document.getElementById('logout-btn').classList.remove('hidden');

    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '';

    let displayData = students;
    const adminTools = document.getElementById('admin-tools');
    const searchContainer = document.getElementById('search-container');
    const projectSelector = document.getElementById('project-selector');
    const contactPanel = document.getElementById('contact-messages-panel');
    const correctionPanel = document.getElementById('correction-notes-panel');
    const accessDisplay = document.getElementById('access-code-display');
    const copyAccessButton = document.getElementById('copy-access-code-btn');
    const regenerateAccessButton = document.getElementById('regenerate-access-code-btn');
    const staffSchoolDisplay = document.getElementById('staff-school-display');
    document.querySelectorAll('#admin-tools select, #admin-tools button').forEach(control => {
        control.style.display = '';
    });
    if (contactPanel) contactPanel.classList.add('hidden');
    if (correctionPanel) correctionPanel.classList.add('hidden');
    if (accessDisplay) accessDisplay.style.display = '';
    if (copyAccessButton) copyAccessButton.style.display = '';
    if (regenerateAccessButton) regenerateAccessButton.style.display = '';
    if (staffSchoolDisplay) staffSchoolDisplay.classList.add('hidden');
    if (projectSelector) {
        projectSelector.disabled = false;
    }

    if (role === 'student') {
        document.getElementById('user-info').textContent = `Student: ${userCtx.name}`;
        adminTools.classList.add('hidden');
        adminTools.style.display = 'none';
        searchContainer.classList.add('hidden');
        document.getElementById('db-title').textContent = "My Profile";
        document.getElementById('db-desc').textContent = "Verify your details below. If incorrect, you can request edits up to exactly 2 times.";
    }
    else if (role === 'staff') {
        document.getElementById('user-info').textContent = `Staff: ${userCtx.project_name}`;
        adminTools.classList.add('hidden');
        adminTools.style.display = 'none';
        if (accessDisplay) accessDisplay.style.display = 'none';
        searchContainer.classList.remove('hidden');
        document.getElementById('db-title').textContent = "All Student Records";
        document.getElementById('db-desc').textContent = "View and edit student database.";
        if (staffSchoolDisplay) {
            staffSchoolDisplay.textContent = `School: ${userCtx.project_name}`;
            staffSchoolDisplay.classList.remove('hidden');
        }
        if (correctionPanel) correctionPanel.classList.remove('hidden');
    }
    else if (role === 'admin') {
        document.getElementById('user-info').textContent = `Admin: Satish`;
        adminTools.classList.remove('hidden');
        adminTools.style.display = '';
        searchContainer.classList.remove('hidden');
        document.getElementById('db-title').textContent = "Master Database";
        document.getElementById('db-desc').textContent = currentProject
            ? "View and manage student details."
            : "Create a school first, then upload data.";
        if (contactPanel) contactPanel.classList.remove('hidden');
    }

    if (displayData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="14" style="text-align:center; padding: 2rem;">No records found. Please upload data sheet.</td></tr>';
        return;
    }

    displayData.forEach(student => {
        const row = document.createElement('tr');
        const isVerified = student.status === 'verified';
        const isArchived = student.status === 'archived';
        const statusClass = isArchived ? 'status-archived' : (isVerified ? 'status-verified' : 'status-pending');
        const statusText = isArchived ? 'Archived' : (isVerified ? 'Verified' : 'Pending');
        const checkedAttr = isVerified ? 'checked' : '';
        const studentIdArg = escapeJsArg(student.id);

        // Render Base64 photo if matches, else show premium placeholder bubble
        let photoHtml = '';
        if (student.photo_data) {
            photoHtml = `<img src="${student.photo_data}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; display:inline-block;">`;
        } else {
            photoHtml = `<div style="width: 40px; height: 40px; background: #cbd5e1; border-radius: 50%; display:inline-block;" title="No Photo"></div>`;
        }

        // Checkbox status disables for archived only; students can now click
        const checkboxDisabled = isArchived ? 'disabled' : '';
        let actionHtml = '';
        if (role === 'student' && (student.edit_count || 0) >= 2) {
            actionHtml = `<button class="btn-outline" style="padding: 0.25rem 1rem; font-size: 0.875rem; width: 100%; opacity: 0.5; cursor: not-allowed;" disabled title="You can only edit your profile twice.">Max Edits Reached</button>`;
        } else if (role === 'admin') {
            actionHtml = `
                <div class="inline-actions">
                    <button class="btn-outline" onclick="openEditModal('${studentIdArg}')">Edit</button>
                    <button class="btn-outline" onclick="archiveStudent('${studentIdArg}', ${isArchived ? 'false' : 'true'})">${isArchived ? 'Restore' : 'Archive'}</button>
                    <button class="btn-outline" style="border-color:#ef4444; color:#ef4444;" onclick="deleteStudent('${studentIdArg}')">Delete</button>
                </div>`;
        } else {
            actionHtml = `<button class="btn-outline" style="padding: 0.25rem 1rem; font-size: 0.875rem; width: 100%;" onclick="openEditModal('${studentIdArg}')">Edit</button>`;
        }

        row.innerHTML = `
            <td data-label="ID">${escapeHtml(student.id)}</td>
            <td data-label="Roll No">${escapeHtml(student.roll_number || '-')}</td>
            <td data-label="Photo">${photoHtml}</td>
            <td data-label="Name">${escapeHtml(student.name)}</td>
            <td data-label="Class">${escapeHtml(student.class || '-')}</td>
            <td data-label="Section">${escapeHtml(student.section || '-')}</td>
            <td data-label="F. Name">${escapeHtml(student.father_name || '-')}</td>
            <td data-label="M. Name">${escapeHtml(student.mother_name || '-')}</td>
            <td data-label="DOB">${escapeHtml(student.dob || '-')}</td>
            <td data-label="Blood">${escapeHtml(student.blood_group || '-')}</td>
            <td data-label="Contact">${escapeHtml(student.contact || '-')}</td>
            <td data-label="Address">${escapeHtml(student.address || '-')}</td>
            <td data-label="Status">
                <div style="display: flex; align-items: center; gap: 0.8rem; justify-content: center;">
                    <label class="checkbox-wrapper">
                        <input type="checkbox" ${checkedAttr} ${checkboxDisabled} onchange="toggleStatus('${student.id}', this)">
                        <span class="checkmark"></span>
                    </label>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </td>
            <td data-label="Action">
                ${actionHtml}
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function escapeJsArg(value) {
    return String(value ?? '')
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n");
}

async function imageSourceToDataUrl(source) {
    if (!source || source.startsWith('data:')) return source;

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = source;

    await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error(`Unable to load image: ${source}`));
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const canvasContext = canvas.getContext('2d');
    canvasContext.drawImage(image, 0, 0);
    return canvas.toDataURL('image/png');
}

// TOGGLE STUDENT VERIFICATION STATUS
async function toggleStatus(studentId, checkbox) {
    const isChecked = checkbox.checked;
    const newStatus = isChecked ? 'verified' : 'pending';
    
    // Find local student reference
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    try {
        let res;
        if (currentRole === 'student') {
            // Students use a dedicated endpoint that does NOT count as an edit
            res = await apiRequest(`/api/students/${encodeURIComponent(studentId)}/verify`, {
                method: 'POST',
                body: { status: newStatus }
            });
        } else {
            const queryParam = (currentRole === 'admin' && currentProject) ? `?project_id=${currentProject.id}` : '';
            res = await apiRequest(`/api/students/${encodeURIComponent(studentId)}${queryParam}`, {
                method: 'PUT',
                body: { status: newStatus }
            });
        }

        if (res.success) {
            student.status = newStatus;
            const label = checkbox.closest('.checkbox-wrapper');
            const badge = label ? label.nextElementSibling : null;
            if (badge) {
                badge.className = `status-badge status-${newStatus}`;
                badge.textContent = isChecked ? 'Verified' : 'Pending';
            }
        }
    } catch (err) {
        checkbox.checked = !isChecked; // Revert checkbox change on failure
        alert(err.message || 'Failed to update verification status.');
    }
}

// EDIT STUDENT DATA MODAL
let currentEditId = null;
let currentTempPhotoData = null;

function previewEditPhoto(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            currentTempPhotoData = e.target.result;
            document.getElementById('edit-photo-preview').src = currentTempPhotoData;
        };
        reader.readAsDataURL(file);
    }
}

function openEditModal(id) {
    currentEditId = id;
    currentTempPhotoData = null;
    const student = students.find(s => s.id === id);
    if (!student) return;

    document.getElementById('edit-name').value = student.name;
    document.getElementById('edit-roll').value = student.roll_number || "";
    document.getElementById('edit-class').value = student.class || "";

    const photoPreview = document.getElementById('edit-photo-preview');
    if (student.photo_data) {
        photoPreview.src = student.photo_data;
    } else {
        photoPreview.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2NjYyIgZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00czLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==';
    }

    document.getElementById('edit-section').value = student.section || "";
    document.getElementById('edit-father').value = student.father_name || "";
    document.getElementById('edit-mother').value = student.mother_name || "";
    document.getElementById('edit-contact').value = student.contact || "";
    document.getElementById('edit-dob').value = student.dob || "";
    document.getElementById('edit-blood').value = student.blood_group || "";
    document.getElementById('edit-address').value = student.address || "";
    document.getElementById('edit-correction-note').value = student.correction_note || "";

    const statusGroup = document.getElementById('status-group');
    const editPhotoControls = document.getElementById('edit-photo-controls');

    if (currentRole === 'admin') {
        statusGroup.classList.remove('hidden');
        document.getElementById('edit-status').value = student.status;
        editPhotoControls.classList.remove('hidden');
    } else if (currentRole === 'staff') {
        statusGroup.classList.remove('hidden');
        document.getElementById('edit-status').value = student.status;
        editPhotoControls.classList.add('hidden');
    } else {
        statusGroup.classList.add('hidden');
        editPhotoControls.classList.remove('hidden');
    }

    document.getElementById('editModal').classList.add('active');
}

function closeModal() {
    document.getElementById('editModal').classList.remove('active');
    currentEditId = null;
    currentTempPhotoData = null;
}

async function saveChanges(e) {
    e.preventDefault();
    if (!currentEditId) return;

    const student = students.find(s => s.id === currentEditId);
    if (!student) return;

    const bodyPayload = {
        name: document.getElementById('edit-name').value,
        roll_number: document.getElementById('edit-roll').value,
        class: document.getElementById('edit-class').value,
        section: document.getElementById('edit-section').value,
        father_name: document.getElementById('edit-father').value,
        mother_name: document.getElementById('edit-mother').value,
        contact: document.getElementById('edit-contact').value,
        dob: document.getElementById('edit-dob').value,
        blood_group: document.getElementById('edit-blood').value,
        address: document.getElementById('edit-address').value,
        correction_note: document.getElementById('edit-correction-note').value,
    };

    if (currentTempPhotoData && currentRole !== 'staff') {
        bodyPayload.photo_data = currentTempPhotoData;
    }

    if (currentRole === 'admin' || currentRole === 'staff') {
        bodyPayload.status = document.getElementById('edit-status').value;
    }

    try {
        const queryParam = (currentRole === 'admin' && currentProject) ? `?project_id=${currentProject.id}` : '';
        const res = await apiRequest(`/api/students/${encodeURIComponent(currentEditId)}${queryParam}`, {
            method: "PUT",
            body: bodyPayload
        });

        if (res.success) {
            alert(`Record updated for ${bodyPayload.name}`);
            closeModal();
            await loadProjectData();
        }
    } catch (err) {
        alert(err.message || "Failed to save profile corrections.");
    }
}

// UPLOAD DATA & PROCESSING (REST ROUTING TO PY SERVER)
async function processData() {
    if (currentRole !== 'admin') {
        alert("Only admins can upload student data and photos.");
        return;
    }

    const excelInput = document.getElementById('excel-input');
    const photoInput = document.getElementById('photo-input');

    if (!excelInput.files.length && !photoInput.files.length) {
        alert("Please select an Excel sheet or Student photos to import.");
        return;
    }

    const formData = new FormData();
    if (excelInput.files.length > 0) {
        formData.append("excel", excelInput.files[0]);
    }
    
    if (photoInput.files.length > 0) {
        for (let i = 0; i < photoInput.files.length; i++) {
            formData.append("photos", photoInput.files[i]);
        }
    }

    if (currentRole === 'admin' && currentProject) {
        formData.append("project_id", currentProject.id);
    }

    alert("Sending files to server for processing and matching... please wait.");

    try {
        const res = await apiRequest("/api/students/upload", {
            method: "POST",
            body: formData
        });

        if (res.success) {
            renderUploadReport(res.summary);
            const unmatched = res.summary.unmatched_photos || [];
            alert(`Import Complete!\n\nTotal Database Records: ${res.summary.total_records}\nPhotos Matched: ${res.summary.photos_matched}\nUnmatched Photos: ${unmatched.length ? unmatched.join(', ') : 'None'}`);
            excelInput.value = "";
            photoInput.value = "";
            currentPage = 1;
            await loadProjectData();
        }
    } catch (err) {
        alert(err.message || "Import failed. Check Excel configuration.");
    }
}

// ID CARD CANVAS DESIGNER
const canvas = document.getElementById('designer-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let isDragging = false;
let dragTarget = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

function renderDesignerFields() {
    let html = `<p style="margin-bottom: 1rem; font-size: 0.9rem; color: var(--text-light);">Check elements to show. Drag coordinates directly on the screen or adjust parameters below.</p>`;

    html += `
    <div class="form-group" style="padding: 10px; background: var(--surface); border-radius: 8px; border: 1px solid var(--text-light);">
        <label style="display:flex; align-items:center; gap:0.5rem; margin-bottom: 0.5rem; cursor:pointer;">
            <input type="checkbox" ${idCardConfig.photo.show ? 'checked' : ''} onchange="idCardConfig.photo.show = this.checked; renderDesignerFields(); drawPreview();"> 
            <strong style="color:var(--text);">Student Photo Box</strong>
        </label>
        <div style="display: ${idCardConfig.photo.show ? 'grid' : 'none'}; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
            <input type="number" style="background:var(--background); color:var(--text); border-color:var(--text-light);" placeholder="X" value="${idCardConfig.photo.x}" oninput="idCardConfig.photo.x = Number(this.value); drawPreview()">
            <input type="number" style="background:var(--background); color:var(--text); border-color:var(--text-light);" placeholder="Y" value="${idCardConfig.photo.y}" oninput="idCardConfig.photo.y = Number(this.value); drawPreview()">
            <input type="number" style="background:var(--background); color:var(--text); border-color:var(--text-light);" placeholder="Width" value="${idCardConfig.photo.w}" oninput="idCardConfig.photo.w = Number(this.value); drawPreview()">
            <input type="number" style="background:var(--background); color:var(--text); border-color:var(--text-light);" placeholder="Height" value="${idCardConfig.photo.h}" oninput="idCardConfig.photo.h = Number(this.value); drawPreview()">
        </div>
    </div>`;

    const textKeys = Object.keys(idCardConfig).filter(k => k !== 'photo');
    for (let key of textKeys) {
        const conf = idCardConfig[key];
        html += `
        <div class="form-group" style="padding: 10px; background: var(--surface); border-radius: 8px; border: 1px solid var(--text-light);">
            <label style="display:flex; align-items:center; gap:0.5rem; margin-bottom: 0.5rem; cursor:pointer;">
                <input type="checkbox" ${conf.show ? 'checked' : ''} onchange="idCardConfig['${key}'].show = this.checked; renderDesignerFields(); drawPreview();"> 
                <strong style="color:var(--text);">${conf.label}</strong>
            </label>
            <div style="display: ${conf.show ? 'grid' : 'none'}; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                <input style="background:var(--background); color:var(--text); border-color:var(--text-light);" title="Position X" type="number" placeholder="X" value="${conf.x}" oninput="idCardConfig['${key}'].x = Number(this.value); drawPreview()">
                <input style="background:var(--background); color:var(--text); border-color:var(--text-light);" title="Position Y" type="number" placeholder="Y" value="${conf.y}" oninput="idCardConfig['${key}'].y = Number(this.value); drawPreview()">
                <input style="background:var(--background); color:var(--text); border-color:var(--text-light);" title="Font Size" type="number" placeholder="Font" value="${conf.size}" oninput="idCardConfig['${key}'].size = Number(this.value); drawPreview()">
                <input style="background:var(--background); color:var(--text); border-color:var(--text-light);" title="Text Color" type="color" value="${conf.color}" oninput="idCardConfig['${key}'].color = this.value; drawPreview()">
                <select onchange="idCardConfig['${key}'].align = this.value; drawPreview()" style="background:var(--background); color:var(--text); grid-column: span 2; padding: 0.75rem; border: 1px solid var(--text-light); border-radius: 8px;">
                    <option value="left" ${conf.align === "left" ? "selected" : ""}>Left Align</option>
                    <option value="center" ${conf.align === "center" ? "selected" : ""}>Center Align</option>
                    <option value="right" ${conf.align === "right" ? "selected" : ""}>Right Align</option>
                </select>
            </div>
        </div>`;
    }

    html += `<button class="btn btn-primary" style="width: 100%; margin-top: 1rem;" onclick="saveConfig()">Save Canvas Design</button>`;
    document.getElementById('designer-fields').innerHTML = html;
}

if (canvas) {
    canvas.style.cursor = 'grab';

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleRatio = canvas.width / rect.width;
        const mouseX = (e.clientX - rect.left) * scaleRatio;
        const mouseY = (e.clientY - rect.top) * scaleRatio;

        if (idCardConfig.photo.show && mouseX >= idCardConfig.photo.x && mouseX <= idCardConfig.photo.x + idCardConfig.photo.w &&
            mouseY >= idCardConfig.photo.y && mouseY <= idCardConfig.photo.y + idCardConfig.photo.h) {
            isDragging = true; dragTarget = 'photo';
            dragOffsetX = mouseX - idCardConfig.photo.x;
            dragOffsetY = mouseY - idCardConfig.photo.y;
            canvas.style.cursor = 'grabbing';
            return;
        }

        for (let key of Object.keys(idCardConfig)) {
            if (key === 'photo' || !idCardConfig[key].show) continue;
            const conf = idCardConfig[key];
            if (Math.abs(mouseX - conf.x) < 150 && Math.abs(mouseY - conf.y) < conf.size * 1.5) {
                isDragging = true; dragTarget = key;
                dragOffsetX = mouseX - conf.x;
                dragOffsetY = mouseY - conf.y;
                canvas.style.cursor = 'grabbing';
                return;
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging || !dragTarget) return;
        const rect = canvas.getBoundingClientRect();
        const scaleRatio = canvas.width / rect.width;
        const mouseX = (e.clientX - rect.left) * scaleRatio;
        const mouseY = (e.clientY - rect.top) * scaleRatio;

        idCardConfig[dragTarget].x = Math.round(mouseX - dragOffsetX);
        idCardConfig[dragTarget].y = Math.round(mouseY - dragOffsetY);

        const inputs = document.getElementById('designer-fields').querySelectorAll('input[type="number"]');
        if (dragTarget === 'photo') {
            if (inputs.length >= 4) { inputs[0].value = idCardConfig.photo.x; inputs[1].value = idCardConfig.photo.y; }
        } else {
            renderDesignerFields();
        }
        drawPreview();
    });

    const stopDrag = () => { isDragging = false; dragTarget = null; canvas.style.cursor = 'grab'; };
    canvas.addEventListener('mouseup', stopDrag);
    canvas.addEventListener('mouseleave', stopDrag);
}

function drawPreview() {
    if (!idCardFrameData || !canvas) return;

    const img = new Image();
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Photo mockup bounds
        if (idCardConfig.photo.show) {
            const p = idCardConfig.photo;
            ctx.fillStyle = 'rgba(37, 99, 235, 0.4)';
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x, p.y, p.w, p.h);
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('Photo Box', p.x + 10, p.y + 30);
        }

        const mockData = {
            name: "Student Name",
            id: "ST-001",
            classInfo: "10-A",
            roll: "15",
            father: "Father Name",
            mother: "Mother Name",
            contact: "9876543210",
            address: "123 Main St, City",
            dob: "15-08-2010",
            blood: "O+"
        };

        for (let key of Object.keys(idCardConfig)) {
            if (key === 'photo' || !idCardConfig[key].show) continue;
            const conf = idCardConfig[key];
            ctx.fillStyle = conf.color;
            ctx.font = `${key === 'name' ? 'bold ' : ''}${conf.size}px Arial`;
            ctx.textBaseline = 'top';
            ctx.textAlign = conf.align || 'left';
            ctx.fillText(mockData[key] || conf.label, conf.x, conf.y);
        }
    };
    img.src = idCardFrameData;
}

function openDesignerModal() {
    if (currentRole !== 'admin') {
        alert("Only admins can design ID cards.");
        return;
    }

    if (!idCardFrameData) {
        alert('Please upload an ID Card Frame design template first!');
        return;
    }
    document.getElementById('designerModal').classList.add('active');
    document.getElementById('no-frame-text').style.display = 'none';
    document.getElementById('designer-canvas').style.display = 'block';

    renderDesignerFields();
    drawPreview();
}

function closeDesignerModal() {
    document.getElementById('designerModal').classList.remove('active');
}

async function saveConfig() {
    if (currentRole !== 'admin') {
        alert("Only admins can update ID card designs.");
        return;
    }

    const activeProjId = currentProject ? currentProject.id : null;
    const configUrl = activeProjId ? `/api/config?project_id=${activeProjId}` : '/api/config';
    
    try {
        const res = await apiRequest(configUrl, {
            method: "POST",
            body: {
                frame_data: idCardFrameData,
                config_json: idCardConfig
            }
        });
        if (res.success) {
            if (res.frame_data) {
                idCardFrameData = res.frame_data;
                const frameStatus = document.getElementById('frame-status');
                if (frameStatus) frameStatus.textContent = "Frame Saved";
            }
            alert('Design template layout updated successfully!');
            closeDesignerModal();
        }
    } catch (err) {
        alert(err.message || "Failed to update layout configurations.");
    }
}

async function fetchStudentsForExport() {
    if (!(currentRole === 'admin' || currentRole === 'staff')) {
        return students;
    }
    let url = "/api/students";
    const params = new URLSearchParams();
    if (currentRole === 'admin' && currentProject) {
        params.set('project_id', currentProject.id);
    }
    params.set('search', currentSearch);
    params.set('sort', tableSort.key);
    params.set('direction', tableSort.direction);
    params.set('include_archived', includeArchived ? 'true' : 'false');
    params.set('all', 'true');
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
    const res = await apiRequest(url);
    return res.success ? (res.students || []) : students;
}

// EXPORT TO HIGH DEFINITION CARD PDF (Client-side optimized)
async function downloadIdCards() {
    if (currentRole !== 'admin') {
        alert("Only admins can download ID cards.");
        return;
    }

    try {
        if (!idCardFrameData) {
            alert('Please upload an ID Card Frame template first!');
            return;
        }
        const exportStudents = await fetchStudentsForExport();
        if (exportStudents.length === 0) {
            alert('No student records found in current project database.');
            return;
        }

        alert('Compiling ID Cards locally... This may take a minute.');

        const { jsPDF } = window.jspdf;
        const frameDataUrl = await imageSourceToDataUrl(idCardFrameData);
        const img = new Image();
        img.src = frameDataUrl;

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error("Failed to render background image. Please re-upload ID template."));
        });

        const frameW = img.width;
        const frameH = img.height;
        const orientation = frameW > frameH ? 'l' : 'p';

        const doc = new jsPDF({
            orientation: orientation,
            unit: 'px',
            format: [frameW, frameH]
        });

        for (let i = 0; i < exportStudents.length; i++) {
            if (i > 0) doc.addPage([frameW, frameH], orientation);
            const s = exportStudents[i];

            const frameFormat = frameDataUrl.startsWith('data:image/png') ? 'PNG' :
                                (frameDataUrl.startsWith('data:image/webp') ? 'WEBP' : 'JPEG');

            doc.addImage(frameDataUrl, frameFormat, 0, 0, frameW, frameH);

            if (idCardConfig.photo.show && s.photo_data) {
                try {
                    const photoDataUrl = await imageSourceToDataUrl(s.photo_data);
                    const photoFormat = photoDataUrl.startsWith('data:image/png') ? 'PNG' :
                                        (photoDataUrl.startsWith('data:image/webp') ? 'WEBP' : 'JPEG');
                    doc.addImage(photoDataUrl, photoFormat, idCardConfig.photo.x, idCardConfig.photo.y, idCardConfig.photo.w, idCardConfig.photo.h);
                } catch (photoErr) {
                    console.warn("Failed to attach photo to student document", s.id, photoErr);
                }
            }

            const sData = {
                name: s.name,
                id: s.id,
                classInfo: `${s.class || ''}${s.section ? '-' + s.section : ''}`,
                roll: s.roll_number || '',
                father: s.father_name || '',
                mother: s.mother_name || '',
                contact: s.contact || '',
                address: s.address || '',
                dob: s.dob || '',
                blood: s.blood_group || ''
            };

            for (let key of Object.keys(idCardConfig)) {
                if (key === 'photo' || !idCardConfig[key].show) continue;
                const conf = idCardConfig[key];
                const textValue = sData[key] || '';
                if (!textValue) continue;

                doc.setTextColor(conf.color);
                doc.setFontSize(conf.size);
                if (key === 'name') doc.setFont('helvetica', 'bold');
                else doc.setFont('helvetica', 'normal');

                doc.text(String(textValue), conf.x, conf.y, { baseline: 'top', align: conf.align || 'left' });
            }
        }

        const cleanProjectName = currentProject ? currentProject.name.replace(/\s+/g, '_') : 'School';
        doc.save(`${cleanProjectName}_ID_Cards.pdf`);
    } catch (err) {
        console.error(err);
        alert('An error occurred during compilation: ' + err.message);
    }
}

// DOWNLOAD MASTER DATABASE REPORT
async function downloadFinal() {
    if (currentRole !== 'admin') {
        alert("Only admins can download the master PDF.");
        return;
    }

    const exportStudents = await fetchStudentsForExport();
    if (exportStudents.length === 0) {
        alert('No data records available for report download.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');

    doc.setFontSize(18);
    const activeName = currentProject ? currentProject.name : 'Database';
    doc.text(`Satish Ad Agency - Student Database Report (${activeName})`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 30);

    const verified = exportStudents.filter(s => s.status === 'verified').length;
    const withPhoto = exportStudents.filter(s => s.photo_data).length;
    doc.text(`Total Records: ${exportStudents.length} | Verified: ${verified} | Photos Matching: ${withPhoto}`, 14, 38);

    const tableColumn = ["ID", "Roll No", "Photo", "Name", "Class", "Sec", "F. Name", "M. Name", "DOB", "Blood", "Contact", "Address", "Status"];
    const tableRows = [];
    const reportPhotoData = await Promise.all(exportStudents.map(async student => {
        if (!student.photo_data) return null;
        try {
            return await imageSourceToDataUrl(student.photo_data);
        } catch (error) {
            console.warn("Failed to prepare report photo", student.id, error);
            return null;
        }
    }));

    exportStudents.forEach(student => {
        tableRows.push([
            student.id,
            student.roll_number || '-',
            "", // Hook placeholder
            student.name,
            student.class || '-',
            student.section || '-',
            student.father_name || '-',
            student.mother_name || '-',
            student.dob || '-',
            student.blood_group || '-',
            student.contact || '-',
            student.address || '-',
            student.status.toUpperCase()
        ]);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 50,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8, cellPadding: 2, minCellHeight: 15, valign: 'middle', halign: 'center' },
        columnStyles: {
            0: { cellWidth: 20 },
            2: { cellWidth: 20 }, // Photo column width
            11: { cellWidth: 35 } // Address column width
        },
        didDrawCell: function (data) {
            if (data.column.index === 2 && data.cell.section === 'body') {
                const photoDataUrl = reportPhotoData[data.row.index];
                if (photoDataUrl) {
                    try {
                        const photoFormat = photoDataUrl.startsWith('data:image/png') ? 'PNG' :
                                            (photoDataUrl.startsWith('data:image/webp') ? 'WEBP' : 'JPEG');
                        doc.addImage(photoDataUrl, photoFormat, data.cell.x + 2, data.cell.y + 2, 10, 10);
                    } catch (e) {}
                }
            }
        }
    });

    const reportName = currentProject ? currentProject.name.replace(/\s+/g, '_') : 'Report';
    doc.save(`${reportName}_Master_Database.pdf`);
}

// SAVE & VIEW ID CARD FRAME
async function saveFrameToServer() {
    if (!idCardFrameData) {
        showToast('Please upload an ID Card Frame image first using the upload zone above.', 'error');
        return;
    }
    if (currentRole !== 'admin') {
        showToast('Only admins can save the ID card frame.', 'error');
        return;
    }
    if (!currentProject) {
        showToast('Please select a school first.', 'error');
        return;
    }

    const btn = document.getElementById('save-frame-btn');
    const frameStatus = document.getElementById('frame-status');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Saving\u2026'; }

    try {
        const res = await apiRequest(`/api/config?project_id=${currentProject.id}`, {
            method: 'POST',
            body: {
                frame_data: idCardFrameData,
                config_json: null
            }
        });
        if (res.success) {
            if (res.frame_data) idCardFrameData = res.frame_data;
            if (frameStatus) {
                frameStatus.textContent = '\u2713 Frame Saved to Server';
                frameStatus.style.color = '#22c55e';
            }
            showToast('\u2713 ID Card Frame saved! It will persist across logins and devices.', 'success');
        } else {
            showToast(res.message || 'Server rejected the save. Try again.', 'error');
        }
    } catch (err) {
        showToast(err.message || 'Failed to save frame. Check your connection.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = origHtml; }
    }
}

function viewIdCardFrame() {
    if (!idCardFrameData) {
        showToast('No ID Card Frame loaded. Please upload one first, then click \u201cSave Frame to Server\u201d.', 'error');
        return;
    }

    if (idCardFrameData.startsWith('data:')) {
        // Chrome blocks window.open(dataURL) — convert to Blob URL first
        try {
            const [header, base64] = idCardFrameData.split(',');
            const mime = header.match(/:(.*?);/)[1];
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes], { type: mime });
            const blobUrl = URL.createObjectURL(blob);
            const win = window.open(blobUrl, '_blank');
            if (!win) showToast('Could not open preview. Please allow pop-ups for this site.', 'error');
            // Revoke after 2 minutes to free memory
            setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
        } catch (e) {
            showToast('Could not open preview. Try saving the frame to server first, then viewing.', 'error');
        }
    } else {
        // Server path — build full URL
        const url = idCardFrameData.startsWith('/') ? (window.location.origin + idCardFrameData) : idCardFrameData;
        const win = window.open(url, '_blank');
        if (!win) showToast('Could not open preview. Please allow pop-ups for this site.', 'error');
    }
}

// Toast notification helper
function showToast(message, type = 'info') {
    const existing = document.getElementById('app-toast');
    if (existing) existing.remove();

    const colors = { success: '#22c55e', error: '#ef4444', info: '#3b82f6' };
    const icons  = { success: '\u2713', error: '\u2717', info: '\u2139' };

    const toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.style.cssText = `
        position: fixed; bottom: 2rem; right: 2rem; z-index: 99999;
        background: #1e293b; color: #f8fafc;
        border-left: 4px solid ${colors[type]};
        border-radius: 10px; padding: 1rem 1.5rem;
        max-width: 380px; font-size: 0.95rem; font-weight: 500;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        display: flex; align-items: center; gap: 0.75rem;
        animation: toast-in 0.3s ease;
    `;
    toast.innerHTML = `<span style="color:${colors[type]};font-size:1.2rem;">${icons[type]}</span> ${message}`;

    if (!document.getElementById('toast-style')) {
        const style = document.createElement('style');
        style.id = 'toast-style';
        style.textContent = '@keyframes toast-in { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }';
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.4s'; setTimeout(() => toast.remove(), 400); }, 4000);
}

// DOM INITIALIZATION & LINK HANDLERS
window.addEventListener('DOMContentLoaded', async () => {
    // 1. Theme Configuration
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
        const icon = document.querySelector('.theme-toggle ion-icon');
        if (icon) icon.setAttribute('name', 'sunny-outline');
    }

    // 2. Session verification on load
    const cachedToken = localStorage.getItem("sa_session_token");
    const cachedRole = localStorage.getItem("sa_user_role");
    const cachedCtx = localStorage.getItem("sa_user_ctx");

    if (cachedToken && cachedRole && cachedCtx) {
        currentRole = cachedRole;
        currentUser = JSON.parse(cachedCtx);

        if (currentRole === 'admin') {
            await loadProjects();
        } else if (currentRole === 'staff') {
            currentProject = { id: currentUser.project_id, name: currentUser.project_name };
        }

        await loadProjectData();
    } else {
        showRoleSelection();
    }

    // Transition loaded state
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);

    // 3. Document File upload triggers
    const frameInput = document.getElementById('frame-input');
    if (frameInput) {
        frameInput.addEventListener('change', function () {
            const file = this.files.length > 0 ? this.files[0] : null;
            if (file) {
                document.getElementById('frame-status').textContent = file.name;
                const reader = new FileReader();
                reader.onload = (e) => {
                    idCardFrameData = e.target.result;
                    drawPreview();
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const photoInput = document.getElementById('photo-input');
    if (photoInput) {
        photoInput.addEventListener('change', function () {
            const count = this.files.length;
            document.getElementById('photo-status').textContent = count > 0 ? `${count} Photos Selected` : '';
        });
    }

    const excelInput = document.getElementById('excel-input');
    if (excelInput) {
        excelInput.addEventListener('change', function () {
            const name = this.files.length > 0 ? this.files[0].name : '';
            document.getElementById('excel-status').textContent = name;
        });
    }

    const catalogModal = document.getElementById('catalogModal');
    if (catalogModal) {
        catalogModal.addEventListener('click', event => {
            if (event.target === catalogModal) closeCatalogModal();
        });
    }
});

// UI helpers
function showRoleSelection() {
    const roleSelection = document.getElementById('role-selection');
    if (roleSelection) {
        roleSelection.classList.remove('hidden');
        roleSelection.style.display = 'grid';
    }
    document.querySelectorAll('.login-form-container').forEach(el => el.classList.remove('active'));
}

function showLoginForm(role) {
    const roleSelection = document.getElementById('role-selection');
    if (roleSelection) roleSelection.style.display = 'none';
    const form = document.getElementById(`${role}-login`);
    if (form) form.classList.add('active');
}

function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark');
    const icon = document.querySelector('.theme-toggle ion-icon');

    if (body.classList.contains('dark')) {
        if (icon) icon.setAttribute('name', 'sunny-outline');
        localStorage.setItem('theme', 'dark');
    } else {
        if (icon) icon.setAttribute('name', 'moon-outline');
        localStorage.setItem('theme', 'light');
    }
}

// Link exiting logic
document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', e => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript') || href.includes(':')) return;

        e.preventDefault();
        document.body.classList.remove('loaded');
        setTimeout(() => {
            window.location.href = href;
        }, 600);
    });
});

// Search filter implementation
function filterTable() {
    const input = document.getElementById('search-input');
    currentSearch = input ? input.value.trim() : "";
    currentPage = 1;

    if (currentRole === 'admin' || currentRole === 'staff') {
        clearTimeout(serverSearchTimer);
        serverSearchTimer = setTimeout(() => loadProjectData(), 250);
        return;
    }

    const filter = currentSearch.toUpperCase();
    const table = document.getElementById('main-table');
    if (!table) return;
    const tr = table.getElementsByTagName('tr');

    for (let i = 1; i < tr.length; i++) {
        const textContent = tr[i].textContent || tr[i].innerText;
        tr[i].style.display = textContent.toUpperCase().indexOf(filter) > -1 ? "" : "none";
    }
}
