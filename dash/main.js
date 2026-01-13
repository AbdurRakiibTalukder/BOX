 const app = {
            conf: { user:'', name:'', repo:'', owner:'', token:'', path:'', avatar:'' },
            data: [], repos: [], pinned: [], selectedRepo: null, filterType: 'all',
            editFile: null, confirmResolver: null, pendingFile: null, editor: null,

            types: {
                img: ['png','svg','jpg','jpeg','gif','webp','ico','bmp'],
                doc: ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','md','rtf','csv'],
                audio: ['mp3','wav','ogg'],
                video: ['mp4','webm','mkv','mov','avi'],
                archive: ['zip','rar','7z','tar','gz','iso'],
                code: ['html','css','js','json','py','php','java','c','cpp','sql','xml','yml','sh','ts','jsx','gitignore','env','htaccess'],
                exec: ['exe','msi','apk','bat','bin','dmg']
            },

            init: () => {
                const storedAuth = localStorage.getItem('box_auth');
                if(storedAuth) {
                    const d = JSON.parse(storedAuth);
                    document.getElementById('user').value = d.user;
                    document.getElementById('token').value = d.token;
                    app.conf.avatar = d.avatar; 
                    app.conf.name = d.name || d.user; 
                    app.conf.repo = d.repo || '';
                    app.conf.owner = d.owner || d.user;
                    app.verifyAuth();
                }
                
                const themeIcon = document.getElementById('theme-icon');
                const sidebarLogo = document.getElementById('sidebar-logo');
                const loginLogo = document.getElementById('login-logo');
                
                if(localStorage.getItem('box_theme') === 'dark') {
                    document.body.classList.add('dark-mode');
                    if(themeIcon) themeIcon.className = 'ri-sun-line';
                    if(sidebarLogo) sidebarLogo.src = '../white.svg';
                    if(loginLogo) loginLogo.src = '../white.svg';
                } else {
                    if(themeIcon) themeIcon.className = 'ri-moon-line';
                    if(sidebarLogo) sidebarLogo.src = '../dark.svg';
                    if(loginLogo) loginLogo.src = '../dark.svg';
                }
                
                window.onclick = (e) => {
                    if(!e.target.closest('.dropdown')) document.querySelector('.dd-menu').classList.remove('show');
                    if(e.target.closest('main') && !e.target.closest('#menu-btn') && window.innerWidth < 768) app.toggleSidebar(false);
                    if(!e.target.closest('.card-menu-btn') && !e.target.closest('#context-menu')) document.getElementById('context-menu').style.display = 'none';
                }
            },

            toggleSidebar: (force) => {
                const sb = document.getElementById('sidebar');
                const ol = document.getElementById('sidebar-overlay');
                if(typeof force === 'boolean') {
                    if(force) { sb.classList.add('show'); ol.classList.add('show'); }
                    else { sb.classList.remove('show'); ol.classList.remove('show'); }
                } else {
                    sb.classList.toggle('show'); ol.classList.toggle('show');
                }
            },

            verifyAuth: async () => {
                const u = document.getElementById('user').value.trim();
                const t = document.getElementById('token').value.trim();
                const btn = document.getElementById('btn-auth');
                const msg = document.getElementById('msg');
                if(!u || !t) return;
                btn.disabled = true; btn.innerText = "Verifying..."; msg.innerText = "";

                try {
                    const userRes = await fetch('https://api.github.com/user', { headers: {'Authorization': `token ${t}`} });
                    if(!userRes.ok) throw new Error("Invalid Token or Connection Failed");
                    const userData = await userRes.json();
                    
                    const res = await fetch(`https://api.github.com/user/repos?per_page=100&sort=updated&type=all`, { headers: {'Authorization': `token ${t}`} });
                    if(!res.ok) throw new Error("Could not fetch repositories.");
                    
                    app.repos = await res.json();
                    app.conf.user = userData.login; 
                    app.conf.name = userData.name || userData.login; 
                    app.conf.token = t; 
                    app.conf.avatar = userData.avatar_url;

                    localStorage.setItem('box_auth', JSON.stringify({ 
                        user:app.conf.user, 
                        name:app.conf.name, 
                        token:t, 
                        avatar:app.conf.avatar, 
                        repo: app.conf.repo,
                        owner: app.conf.owner 
                    }));

                    if(app.conf.repo && app.repos.find(r => r.name === app.conf.repo)) {
                        app.selectedRepo = app.conf.repo; app.finalizeLogin();
                    } else {
                        document.getElementById('step-auth').classList.add('hidden'); 
                        document.getElementById('step-repo').classList.remove('hidden'); 
                        app.renderRepos();
                    }
                } catch(e) {
                    msg.innerText = e.message; 
                    document.getElementById('step-auth').classList.remove('hidden'); 
                    document.getElementById('step-repo').classList.add('hidden');
                } finally { btn.disabled = false; btn.innerText = "Connect Account"; }
            },

            renderRepos: () => {
                const list = document.getElementById('repo-list'); list.innerHTML = '';
                if(app.repos.length === 0) { list.innerHTML = '<div style="padding:20px; text-align:center; color:var(--muted)">No repositories found.</div>'; return; }
                app.repos.forEach(r => {
                    const el = document.createElement('div'); 
                    el.className = 'repo-item'; 
                    el.dataset.name = r.name.toLowerCase();
                    el.dataset.owner = r.owner.login;
                    const isPrivate = r.private ? '<i class="ri-lock-fill r-lock" title="Private"></i>' : '';
                    el.innerHTML = `<div class="r-name"><span>${r.name}</span>${isPrivate}</div><div class="r-desc">${r.owner.login} • ${r.description || 'No description'}</div>`;
                    el.onclick = () => {
                        document.querySelectorAll('.repo-item').forEach(x => x.classList.remove('selected'));
                        el.classList.add('selected'); 
                        app.selectedRepo = r.name; 
                        app.conf.owner = r.owner.login;
                        document.getElementById('btn-select').disabled = false;
                    };
                    list.appendChild(el);
                });
            },

            filterRepos: (query) => {
                const q = query.toLowerCase(); document.querySelectorAll('.repo-item').forEach(el => { el.classList.toggle('hidden', !el.dataset.name.includes(q)); });
            },

            finalizeLogin: () => {
                if(!app.selectedRepo) return;
                app.conf.repo = app.selectedRepo;
                if(!app.conf.owner && app.repos.length) {
                    const r = app.repos.find(x => x.name === app.conf.repo);
                    if(r) app.conf.owner = r.owner.login;
                    else app.conf.owner = app.conf.user;
                }

                localStorage.setItem('box_auth', JSON.stringify({ 
                    user:app.conf.user, 
                    name:app.conf.name, 
                    token:app.conf.token, 
                    avatar:app.conf.avatar, 
                    repo: app.conf.repo,
                    owner: app.conf.owner
                }));
                
                document.getElementById('login').classList.add('hidden'); 
                document.getElementById('app').classList.remove('hidden');
                document.getElementById('d-name').innerText = app.conf.name; 
                document.getElementById('d-user').innerText = '@' + app.conf.user; 
                if(app.conf.avatar) document.getElementById('d-avatar').src = app.conf.avatar;
                
                app.loadPinned(); 
                app.loadPath('');
            },

            loadPinned: () => {
                const key = `box_pinned_${app.conf.repo}`; const raw = localStorage.getItem(key);
                app.pinned = raw ? JSON.parse(raw) : []; app.renderPinned();
            },
            
            togglePin: (f) => {
                const key = `box_pinned_${app.conf.repo}`; const idx = app.pinned.findIndex(p => p.path === f.path);
                if(idx > -1) app.pinned.splice(idx, 1);
                else app.pinned.push({ name: f.name, path: f.path, type: f.type, url: f.download_url });
                localStorage.setItem(key, JSON.stringify(app.pinned)); app.renderPinned(); document.getElementById('context-menu').style.display='none';
            },

            renderPinned: () => {
                const c = document.getElementById('pinned-list'); c.innerHTML = '';
                if(app.pinned.length === 0) { c.innerHTML = '<div style="padding:10px; color:var(--muted); font-size:0.8rem;">No pinned files</div>'; return; }
                app.pinned.forEach(p => {
                    const div = document.createElement('div'); div.className = 'menu-item pin-item';
                    
                    let ico = 'ri-file-line';
                    const ext = p.name.split('.').pop().toLowerCase();
                    if(p.type === 'dir') ico = 'ri-folder-fill';
                    else if(app.types.img.includes(ext)) ico = 'ri-image-fill';
                    else if(app.types.code.includes(ext)) ico = 'ri-code-s-slash-line';
                    else if(app.types.audio.includes(ext)) ico = 'ri-music-2-fill';
                    else if(app.types.video.includes(ext)) ico = 'ri-movie-fill';
                    else if(app.types.archive.includes(ext)) ico = 'ri-file-zip-fill';
                    else if(app.types.doc.includes(ext)) ico = 'ri-file-text-fill';
                    else if(app.types.exec.includes(ext)) ico = ext === 'apk' ? 'ri-android-fill' : 'ri-install-fill';

                    div.innerHTML = `<div style="display:flex; gap:10px; align-items:center; overflow:hidden;"><i class="${ico}"></i><span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.name}</span></div><i class="ri-close-line pin-del" onclick="event.stopPropagation(); app.togglePin({path:'${p.path}'})"></i>`;
                    div.onclick = () => { p.type === 'dir' ? app.loadPath(p.path) : app.openFile({ name:p.name, path:p.path, download_url:p.url }); };
                    c.appendChild(div);
                });
            },

            openLogoutModal: () => document.getElementById('m-logout').classList.remove('hidden'),
            changeRepo: () => {
                app.selectedRepo = null; app.conf.repo = ''; app.conf.owner = '';
                localStorage.setItem('box_auth', JSON.stringify({ user:app.conf.user, name:app.conf.name, token:app.conf.token, avatar:app.conf.avatar, repo: '', owner:'' }));
                document.getElementById('btn-select').disabled = true; document.querySelectorAll('.repo-item').forEach(x => x.classList.remove('selected'));
                document.getElementById('m-logout').classList.add('hidden'); document.getElementById('app').classList.add('hidden'); document.getElementById('login').classList.remove('hidden');
                document.getElementById('step-auth').classList.add('hidden'); document.getElementById('step-repo').classList.remove('hidden'); app.renderRepos(); 
            },
            logoutComplete: () => { localStorage.removeItem('box_auth'); location.reload(); },

            loadPath: async (path) => {
                app.toggleSidebar(false); 
                const l = document.getElementById('loader'); const g = document.getElementById('grid'); l.classList.remove('hidden'); g.innerHTML = '';
                try {
                    const res = await fetch(`https://api.github.com/repos/${app.conf.owner}/${app.conf.repo}/contents/${path}?t=${Date.now()}`, { headers: { 'Authorization': `token ${app.conf.token}` }, cache: "no-store" });
                    if(!res.ok) throw new Error();
                    const json = await res.json(); let raw = Array.isArray(json) ? json : [json];
                    app.data = raw.filter(f => f.name !== '.gitkeep');
                    app.conf.path = path; 
                    app.renderCrumbs(); 
                    app.render(); 
                    app.renderSidebarFolders(); 
                } catch(e) { app.data = []; app.conf.path = path; app.renderCrumbs(); app.render(); } finally { l.classList.add('hidden'); }
            },

            // --- DRAG & DROP LOGIC ---
            handleDragStart: (e, fileString) => {
                e.dataTransfer.setData("text/plain", fileString);
                e.target.classList.add('dragging');
            },
            
            handleDragEnd: (e) => {
                e.target.classList.remove('dragging');
                document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
            },

            handleDragOver: (e) => { e.preventDefault(); e.currentTarget.classList.add('drop-target'); },
            handleDragLeave: (e) => { e.currentTarget.classList.remove('drop-target'); },

            handleDrop: (e, targetPath) => {
                e.preventDefault();
                e.currentTarget.classList.remove('drop-target');
                const raw = e.dataTransfer.getData("text/plain");
                if(!raw) return; 
                try {
                    const item = JSON.parse(decodeURIComponent(raw));
                    const currentDir = app.conf.path;
                    const itemDir = item.path.substring(0, item.path.lastIndexOf('/'));
                    const targetDir = targetPath; 
                    const normItemDir = itemDir === -1 ? '' : itemDir;
                    const normTarget = targetDir;
                    if(normItemDir === normTarget) return; 
                    if(item.path === targetPath) return; 
                    const newPath = targetPath ? `${targetPath}/${item.name}` : item.name;
                    app.rename(item.name, item.name, item.path, item.sha, newPath);
                } catch(err) { console.error("Drop error", err); }
            },

            renderSidebarFolders: () => {
                const c = document.getElementById('sidebar-folders'); c.innerHTML = '';
                const folders = app.data.filter(i => i.type === 'dir');
                if(folders.length === 0) { c.innerHTML = '<div style="padding:10px; color:var(--muted); font-size:0.8rem;">No subfolders</div>'; return; }
                folders.forEach(f => {
                    const div = document.createElement('div');
                    div.className = 'menu-item';
                    div.innerHTML = `<i class="ri-folder-line"></i> <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.name}</span>`;
                    div.onclick = () => app.loadPath(f.path);
                    div.ondragover = (e) => app.handleDragOver(e);
                    div.ondragleave = (e) => app.handleDragLeave(e);
                    div.ondrop = (e) => app.handleDrop(e, f.path);
                    c.appendChild(div);
                });
            },

            render: () => {
                const g = document.getElementById('grid'); g.innerHTML = '';
                const items = app.data.filter(i => {
                    const isDir = i.type === 'dir'; 
                    const ext = i.name.split('.').pop().toLowerCase();
                    if(app.filterType === 'all') return true; 
                    if(app.filterType === 'folder') return isDir; 
                    if(isDir) return false; 
                    if(app.filterType === 'image') return app.types.img.includes(ext); 
                    if(app.filterType === 'code') return app.types.code.includes(ext);
                    if(app.filterType === 'doc') return app.types.doc.includes(ext);
                    if(app.filterType === 'audio') return app.types.audio.includes(ext);
                    if(app.filterType === 'video') return app.types.video.includes(ext);
                    if(app.filterType === 'archive') return app.types.archive.includes(ext);
                    return false;
                });
                
                items.sort((a,b) => (a.type===b.type?0:a.type==='dir'?-1:1));
                if(items.length === 0) { g.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--muted); margin-top:50px;">Folder is empty</p>'; return; }

                items.forEach(f => {
                    const isDir = f.type === 'dir'; 
                    const ext = f.name.split('.').pop().toLowerCase(); 
                    
                    let ico = 'ri-file-line';
                    if(isDir) ico = 'ri-folder-fill'; 
                    else if(app.types.img.includes(ext)) ico = 'ri-image-fill'; 
                    else if(app.types.code.includes(ext)) ico = 'ri-code-s-slash-line'; 
                    else if(app.types.audio.includes(ext)) ico = 'ri-music-2-fill'; 
                    else if(app.types.video.includes(ext)) ico = 'ri-movie-fill'; 
                    else if(app.types.archive.includes(ext)) ico = 'ri-file-zip-fill'; 
                    else if(app.types.doc.includes(ext)) ico = 'ri-file-text-fill';
                    else if(app.types.exec.includes(ext)) ico = ext === 'apk' ? 'ri-android-fill' : 'ri-install-fill';

                    const el = document.createElement('div'); el.className = `card ${isDir?'folder':''}`;
                    el.draggable = true;
                    const fStr = encodeURIComponent(JSON.stringify({ name: f.name, path: f.path, type: f.type, size: f.size, download_url: f.download_url, sha: f.sha }));
                    
                    el.ondragstart = (e) => app.handleDragStart(e, fStr);
                    el.ondragend = (e) => app.handleDragEnd(e);

                    if(isDir) {
                        el.ondragover = (e) => app.handleDragOver(e);
                        el.ondragleave = (e) => app.handleDragLeave(e);
                        el.ondrop = (e) => app.handleDrop(e, f.path);
                    }

                    el.innerHTML = `
                        <i class="icon ${ico}"></i>
                        <div class="fname" title="${f.name}">${f.name}</div>
                        <div class="fsize">${isDir?'Folder':app.fmt(f.size)}</div>
                        <button class="card-menu-btn" onclick="event.stopPropagation(); app.showContextMenu(event, '${fStr}')">
                            <i class="ri-more-2-fill"></i>
                        </button>
                    `;
                    el.onclick = () => isDir ? app.loadPath(f.path) : app.openFile(f);
                    g.appendChild(el);
                });
            },

            showContextMenu: (e, fStr) => {
                const f = JSON.parse(decodeURIComponent(fStr));
                const menu = document.getElementById('context-menu'); const header = document.getElementById('cm-header'); const body = document.getElementById('cm-body');
                const isDir = f.type === 'dir';
                const isPinned = app.pinned.some(p => p.path === f.path);
                const ext = f.name.split('.').pop().toLowerCase();
                const isCode = app.types.code.includes(ext) || app.types.doc.includes(ext) || !f.name.includes('.');

                header.innerHTML = `<div class="cm-name">${f.name}</div><div class="cm-meta">${isDir ? 'Folder' : ext.toUpperCase() + ' File'} • ${isDir?'--':app.fmt(f.size)}</div>`;

                let html = '';
                if(isDir) {
                    html += `<div class="cm-item" onclick="app.loadPath('${f.path}');document.getElementById('context-menu').style.display='none'"><i class="ri-folder-open-line"></i> Open Folder</div>`;
                    html += `<div class="cm-item" onclick="app.dlFolder('${f.path}','${f.name}');document.getElementById('context-menu').style.display='none'"><i class="ri-file-zip-line"></i> Download as ZIP</div>`;
                } else if(isCode) {
                    html += `<div class="cm-item" onclick="app.openFile({name:'${f.name}',path:'${f.path}',download_url:'${f.download_url}'});document.getElementById('context-menu').style.display='none'"><i class="ri-edit-line"></i> Edit File</div>`;
                } else {
                    html += `<div class="cm-item" onclick="app.openFile({name:'${f.name}',path:'${f.path}',download_url:'${f.download_url}'});document.getElementById('context-menu').style.display='none'"><i class="ri-eye-line"></i> View File</div>`;
                }

                html += `<div class="cm-item" onclick="app.togglePin({name:'${f.name}',path:'${f.path}',type:'${f.type}',download_url:'${f.download_url}'})"><i class="${isPinned?'ri-pushpin-fill':'ri-pushpin-line'}"></i> ${isPinned?'Unpin Item':'Pin Item'}</div>`;
                
                if(!isDir) {
                    html += `<div class="cm-item" onclick="app.modal('rename', '${f.name}', '${f.path}', '${f.sha}');document.getElementById('context-menu').style.display='none'"><i class="ri-pencil-line"></i> Rename</div>`;
                    html += `<div class="cm-item" onclick="app.copy('${f.download_url}');document.getElementById('context-menu').style.display='none'"><i class="ri-link"></i> Copy Link</div>`;
                    html += `<div class="cm-item" onclick="app.dl('${f.download_url}','${f.name}');document.getElementById('context-menu').style.display='none'"><i class="ri-download-line"></i> Download</div>`;
                }
                
                html += `<div class="cm-item danger" onclick="app.del('${f.path}','${f.sha}','${f.type}');document.getElementById('context-menu').style.display='none'"><i class="ri-delete-bin-line"></i> Delete</div>`;

                body.innerHTML = html;
                menu.style.display = 'block';
                
                if(window.innerWidth < 768) {
                    // Handled by CSS on mobile
                } else {
                    const mw = menu.offsetWidth; const mh = menu.offsetHeight;
                    let top = e.clientY + 10; let left = e.clientX - mw + 20; 
                    if(left < 10) left = 10; if(top + mh > window.innerHeight) top = e.clientY - mh - 10;
                    menu.style.top = top + 'px'; menu.style.left = left + 'px';
                }
            },

            api: async (name, content, msg, sha=null, method='PUT') => {
                const cleanPath = app.conf.path ? `${app.conf.path}/${name}` : name;
                if(method === 'PUT' && !sha) {
                    if(app.data.length === 0) app.deleteGitkeep();
                    try {
                        const check = await fetch(`https://api.github.com/repos/${app.conf.owner}/${app.conf.repo}/contents/${encodeURIComponent(cleanPath)}?t=${Date.now()}`, { headers: { 'Authorization': `token ${app.conf.token}` }, cache: 'no-store' });
                        if(check.ok) sha = (await check.json()).sha;
                    } catch(e) {}
                }
                try {
                    const res = await fetch(`https://api.github.com/repos/${app.conf.owner}/${app.conf.repo}/contents/${encodeURIComponent(cleanPath)}`, { method: method, headers: { 'Authorization': `token ${app.conf.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message:msg, content:content, sha:sha }) });
                    if(!res.ok) throw new Error((await res.json()).message);
                    setTimeout(()=>app.loadPath(app.conf.path), 800);
                } catch(e) { app.showAlert("Error: " + e.message); }
            },

            rename: async (oldName, newName, oldPath, sha, forcedNewPath = null) => {
                if(oldName === newName && !forcedNewPath) return;
                
                let newPath = forcedNewPath;
                if(!newPath) {
                    const pathParts = oldPath.split('/'); pathParts.pop();
                    const basePath = pathParts.join('/');
                    newPath = basePath ? `${basePath}/${newName}` : newName;
                }

                try {
                    const res = await fetch(`https://api.github.com/repos/${app.conf.owner}/${app.conf.repo}/contents/${oldPath}`, { headers: { 'Authorization': `token ${app.conf.token}` } });
                    const d = await res.json();
                    
                    await fetch(`https://api.github.com/repos/${app.conf.owner}/${app.conf.repo}/contents/${newPath}`, {
                        method: 'PUT', headers: { 'Authorization': `token ${app.conf.token}` },
                        body: JSON.stringify({ message: `Move/Rename ${oldName} to ${newName}`, content: d.content, sha: null }) 
                    });
                    
                    await fetch(`https://api.github.com/repos/${app.conf.owner}/${app.conf.repo}/contents/${oldPath}`, {
                        method: 'DELETE', headers: { 'Authorization': `token ${app.conf.token}` },
                        body: JSON.stringify({ message: `Delete old ${oldName}`, sha: d.sha }) 
                    });
                    setTimeout(()=>app.loadPath(app.conf.path), 1500);
                } catch(e) { app.showAlert("Action failed: " + e.message); }
            },

            deleteGitkeep: async () => { const gkPath = app.conf.path ? `${app.conf.path}/.gitkeep` : '.gitkeep'; try { const r = await fetch(`https://api.github.com/repos/${app.conf.owner}/${app.conf.repo}/contents/${gkPath}`, { headers: {'Authorization': `token ${app.conf.token}`} }); if(r.ok) { const d = await r.json(); await fetch(`https://api.github.com/repos/${app.conf.owner}/${app.conf.repo}/contents/${gkPath}`, { method: 'DELETE', headers: {'Authorization': `token ${app.conf.token}`}, body: JSON.stringify({ message: "Remove gitkeep", sha: d.sha }) }); } } catch(e) {} },
            createGitkeep: async () => { const gkPath = app.conf.path ? `${app.conf.path}/.gitkeep` : '.gitkeep'; await fetch(`https://api.github.com/repos/${app.conf.owner}/${app.conf.repo}/contents/${gkPath}`, { method: 'PUT', headers: {'Authorization': `token ${app.conf.token}`}, body: JSON.stringify({ message: "Keep folder", content: "" }) }); },

            del: async (path, sha, type) => {
                let finalSha = sha; let finalPath = path;
                if(await app.showConfirm("Delete this item?")) {
                    if(type === 'dir') {
                        try {
                            const res = await fetch(`https://api.github.com/repos/${app.conf.owner}/${app.conf.repo}/contents/${path}?t=${Date.now()}`, { headers: { 'Authorization': `token ${app.conf.token}` } });
                            if(!res.ok) throw new Error("Could not check folder");
                            const contents = await res.json();
                            if(contents.filter(f => f.name !== '.gitkeep').length > 0) { app.showAlert("Folder is not empty."); return; }
                            const gk = contents.find(f => f.name === '.gitkeep');
                            if(gk) { finalSha = gk.sha; finalPath = gk.path; } else if(contents.length > 0) { finalSha = contents[0].sha; finalPath = contents[0].path; }
                        } catch(e) { app.showAlert("Error: " + e.message); return; }
                    }
                    if(app.data.length === 1 && type !== 'dir') await app.createGitkeep();
                    try {
                         const res = await fetch(`https://api.github.com/repos/${app.conf.owner}/${app.conf.repo}/contents/${encodeURIComponent(finalPath)}`, { method: 'DELETE', headers: { 'Authorization': `token ${app.conf.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: "Delete", sha: finalSha }) });
                        if(!res.ok) throw new Error(); setTimeout(()=>app.loadPath(app.conf.path), 1000); 
                    } catch { app.showAlert("Delete failed"); }
                }
            },

            upload: (file) => {
                if(!file) return;
                if(app.data.find(f => f.name === file.name)) {
                    app.pendingFile = file; document.getElementById('conflict-name').innerText = file.name; document.getElementById('m-conflict').classList.remove('hidden');
                } else { app.processUpload(file, file.name); }
            },
            processUpload: (file, name) => {
                const r = new FileReader(); r.readAsDataURL(file); r.onload = () => app.api(name, r.result.split(',')[1], 'Upload');
            },
            resolveConflict: (action) => {
                const file = app.pendingFile; document.getElementById('m-conflict').classList.add('hidden'); if(!file) return;
                if(action === 'replace') app.processUpload(file, file.name);
                else if(action === 'keep') {
                    const parts = file.name.split('.'); const ext = parts.length > 1 ? parts.pop() : ''; const base = parts.join('.'); let i = 1;
                    let newName = ext ? `${base} ${i}.${ext}` : `${base} ${i}`;
                    while(app.data.find(f => f.name === newName)) { i++; newName = ext ? `${base} ${i}.${ext}` : `${base} ${i}`; }
                    app.processUpload(file, newName);
                }
                app.pendingFile = null;
            },

            showConfirm: (msg) => { return new Promise((resolve) => { document.getElementById('c-msg').innerText = msg; document.getElementById('m-confirm').classList.remove('hidden'); app.confirmResolver = resolve; }); },
            resolveConfirm: (val) => { document.getElementById('m-confirm').classList.add('hidden'); if(app.confirmResolver) app.confirmResolver(val); },
            showAlert: (msg) => { document.getElementById('a-msg').innerText = msg; document.getElementById('m-alert').classList.remove('hidden'); },

            onDragOver: (e) => { e.preventDefault(); document.getElementById('drop-overlay').classList.add('active'); },
            onDragLeave: (e) => { document.getElementById('drop-overlay').classList.remove('active'); },
            onDrop: (e) => { e.preventDefault(); document.getElementById('drop-overlay').classList.remove('active'); if(e.dataTransfer.files[0]) app.upload(e.dataTransfer.files[0]); },

            openFile: async (f) => {
                const ext = f.name.split('.').pop().toLowerCase(); 
                const isCode = app.types.code.includes(ext) || app.types.doc.includes(ext) || !f.name.includes('.');
                const m = document.getElementById('m-viewer'); const body = document.getElementById('v-body'); const btn = document.getElementById('btn-save');
                document.getElementById('v-title').innerText = f.name; m.classList.remove('hidden'); body.innerHTML = '<div class="loader"></div>'; btn.classList.add('hidden');

                if(app.types.img.includes(ext)) {
                    // IMAGE VIEWER
                    try {
                        const res = await fetch(`https://api.github.com/repos/${app.conf.owner}/${app.conf.repo}/git/blobs/${f.sha}`, {
                            headers: { 'Authorization': `token ${app.conf.token}` }
                        });
                        if(!res.ok) throw new Error("Failed to load image");
                        const data = await res.json();
                        
                        let mime = 'image/png'; // Default
                        if(ext === 'svg') mime = 'image/svg+xml';
                        else if(ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
                        else if(ext === 'gif') mime = 'image/gif';
                        else if(ext === 'webp') mime = 'image/webp';
                        else if(ext === 'ico') mime = 'image/x-icon';
                        
                        const src = `data:${mime};base64,${data.content}`;
                        body.innerHTML = `<img src="${src}" class="img-preview">`;
                    } catch(e) { 
                        console.error(e);
                        body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted)">Preview failed.<br>Try downloading.</div>'; 
                    }
                } else if(app.types.audio.includes(ext) || app.types.video.includes(ext)) {
                    // MEDIA PLAYER
                    try {
                        if(f.size > 99 * 1024 * 1024) throw new Error("File too large for preview");

                        const res = await fetch(`https://api.github.com/repos/${app.conf.owner}/${app.conf.repo}/git/blobs/${f.sha}`, {
                            headers: { 'Authorization': `token ${app.conf.token}` }
                        });
                        if(!res.ok) throw new Error("Failed to load media");
                        const data = await res.json();
                        
                        const byteCharacters = atob(data.content);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        
                        let mime = app.types.video.includes(ext) ? `video/${ext}` : `audio/${ext}`;
                        if(ext === 'mkv') mime = 'video/webm'; 

                        const blob = new Blob([byteArray], {type: mime});
                        const url = URL.createObjectURL(blob);
                        
                        const tag = app.types.video.includes(ext) ? 'video' : 'audio';
                        body.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:100%; background:#000;"><${tag} controls autoplay src="${url}" style="max-width:100%; max-height:100%; width: 100%;"></${tag}></div>`;
                    } catch(e) { 
                        body.innerHTML = `<div style="padding:40px;text-align:center;color:var(--muted)">Playback failed (${e.message || 'Error'}).<br>Download to play.</div>`; 
                    }
                } else if(isCode) {
                    // CODE EDITOR
                    try {
                        const res = await fetch(`https://api.github.com/repos/${app.conf.owner}/${app.conf.repo}/contents/${f.path}?t=${Date.now()}`, { headers: { 'Authorization': `token ${app.conf.token}` } });
                        if(!res.ok) throw new Error("Could not load file");
                        const data = await res.json();
                        const txt = decodeURIComponent(escape(window.atob(data.content.replace(/\s/g, ''))));
                        app.editFile = { path:f.path, sha:data.sha, name:f.name };
                        body.innerHTML = '<div id="ace-editor"></div>'; btn.classList.remove('hidden');
                        app.editor = ace.edit("ace-editor"); const isDark = document.body.classList.contains('dark-mode');
                        app.editor.setTheme(isDark ? "ace/theme/twilight" : "ace/theme/chrome");
                        let mode = "ace/mode/text";
                        if(ext==='js' || ext==='ts') mode = "ace/mode/javascript"; 
                        else if(ext==='html') mode = "ace/mode/html"; 
                        else if(ext==='css') mode = "ace/mode/css"; 
                        else if(ext==='json') mode = "ace/mode/json"; 
                        else if(ext==='py') mode = "ace/mode/python"; 
                        else if(ext==='php') mode = "ace/mode/php";
                        app.editor.session.setMode(mode); app.editor.setValue(txt, -1);
                        app.editor.on("change", () => document.getElementById('v-unsaved').classList.remove('hidden'));
                    } catch(e) { body.innerText = "Error loading content: " + e.message; }
                } else { body.innerHTML = '<div style="padding:40px; text-align:center; color:var(--muted)">Preview not available.<br>Download to view.</div>'; }
            },

            saveFile: async () => {
                const val = app.editor.getValue(); const b64 = btoa(unescape(encodeURIComponent(val)));
                await app.api(app.editFile.name, b64, 'Update file', app.editFile.sha);
                document.getElementById('v-unsaved').classList.add('hidden'); app.closeM();
            },

            copy: (url) => { navigator.clipboard.writeText(url); const t = document.getElementById('toast'); t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 2000); },
            dl: async (url, name) => { try { const r = await fetch(url, { headers: {'Authorization': `token ${app.conf.token}`} }); const b = await r.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click(); } catch { window.open(url, '_blank'); } },
            
            dlFolder: async (path, name) => {
                app.showAlert("Zipping folder... please wait.");
                try {
                    const res = await fetch(`https://api.github.com/repos/${app.conf.owner}/${app.conf.repo}/contents/${path}?t=${Date.now()}`, { headers: { 'Authorization': `token ${app.conf.token}` } });
                    const contents = await res.json();
                    if(!Array.isArray(contents)) return;
                    const zip = new JSZip();
                    for (const item of contents) {
                        if (item.type === 'file') {
                            const fRes = await fetch(item.download_url, { headers: {'Authorization': `token ${app.conf.token}`} }); 
                            const fBlob = await fRes.blob(); zip.file(item.name, fBlob);
                        }
                    }
                    const zipBlob = await zip.generateAsync({type:"blob"});
                    saveAs(zipBlob, `${name}.zip`);
                } catch(e) { app.showAlert("Error creating zip: " + e.message); }
            },

            renderCrumbs: () => {
                const parts = app.conf.path.split('/').filter(p=>p); let h = `<span class="crumb" onclick="app.loadPath('')" ondragover="app.handleDragOver(event)" ondrop="app.handleDrop(event, '')">${app.conf.repo}</span>`;
                let acc = ''; 
                parts.forEach(p => { 
                    acc += (acc?'/':'')+p; 
                    h += ` / <span class="crumb" onclick="app.loadPath('${acc}')" ondragover="app.handleDragOver(event)" ondrop="app.handleDrop(event, '${acc}')">${p}</span>`; 
                });
                document.getElementById('crumbs').innerHTML = h;
            },
            toggleDD: () => document.querySelector('.dd-menu').classList.toggle('show'),
            filter: (type, label) => { app.filterType = type; document.getElementById('dd-label').innerText = label; document.querySelectorAll('.dd-item').forEach(el => el.classList.toggle('selected', el.innerText === label)); app.render(); },
            
            modal: (type, oldName=null, oldPath=null, sha=null) => {
                document.getElementById('m-input').classList.remove('hidden'); 
                const inp = document.getElementById('i-val');
                inp.value = oldName || ''; 
                document.getElementById('i-title').innerText = type==='rename' ? 'Rename File' : (type==='folder'?'New Folder':'New File');
                const btn = document.getElementById('i-btn'); btn.replaceWith(btn.cloneNode(true));
                
                document.getElementById('i-btn').onclick = () => { 
                    const val = document.getElementById('i-val').value.trim(); 
                    if(val) { 
                        if(type === 'rename') app.rename(oldName, val, oldPath, sha);
                        else if(type === 'folder') app.api(`${val}/.gitkeep`, '', 'Create Folder'); 
                        else app.api(val, '', 'Create File'); 
                    } 
                    app.closeM(); 
                };
            },
            closeM: () => {
                document.querySelectorAll('.modal-overlay').forEach(e=>e.classList.add('hidden'));
                document.getElementById('v-body').innerHTML = ''; 
            },
            
            toggleTheme: () => {
                document.body.classList.toggle('dark-mode'); 
                const isDark = document.body.classList.contains('dark-mode');
                localStorage.setItem('box_theme', isDark ? 'dark' : 'light');
                document.getElementById('theme-icon').className = isDark ? 'ri-sun-line' : 'ri-moon-line';
                if(app.editor) app.editor.setTheme(isDark ? "ace/theme/twilight" : "ace/theme/chrome");
                
                const newLogo = isDark ? '../white.svg' : '../dark.svg';
                if(document.getElementById('sidebar-logo')) document.getElementById('sidebar-logo').src = newLogo;
                if(document.getElementById('login-logo')) document.getElementById('login-logo').src = newLogo;
            },
            
            fmt: (b) => { if(b===0)return '0 B'; const i = Math.floor(Math.log(b)/Math.log(1024)); return (b/Math.pow(1024,i)).toFixed(1)+' '+['B','KB','MB','GB'][i]; }
        };

        app.init();