loadFileList();

function loadFileList() {
  fetch('/files')
    .then(r => r.json())
    .then(data => {
      if (data.files && data.files.length > 0) {
        const systemFiles = ['cli.js', 'file-gui.js', 'about.snowdon', 'package.json', 'README.md', '.gitignore'];
        const html = data.files.map(file => {
          const isSystem = systemFiles.includes(file);
          return '<div class="file-item">' +
            '<span class="file-name">' + file + '</span>' +
            (isSystem ? '<span class="system-file">System File</span>' : '<button class="delete-btn" data-file="' + file + '">Delete</button>') +
          '</div>';
        }).join('');
        document.getElementById('fileList').innerHTML = html;
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            const filename = this.getAttribute('data-file');
            if (confirm('Delete ' + filename + '?')) {
              fetch('/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: filename })
              })
              .then(r => r.json())
              .then(data => {
                if (data.success) {
                  loadFileList();
                } else {
                  alert('Delete failed');
                }
              });
            }
          });
        });
      } else {
        document.getElementById('fileList').innerHTML = '<p class="empty-files">No files uploaded yet</p>';
      }
    })
    .catch(err => {
      document.getElementById('fileList').innerHTML = '<p style="color: red;">Error loading files</p>';
    });
}

document.querySelector('form').addEventListener('submit', function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const btn = document.querySelector('button');
  btn.disabled = true;
  btn.textContent = 'Uploading...';
  
  fetch('/upload', { method: 'POST', body: formData })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        let html = '<p class="success">Upload successful. ' + data.count + ' file(s) uploaded.</p>';
        
        if (data.singleFile) {
          html += '<div id="renamePrompt" style="margin-top: 15px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">';
          html += '<strong>Set as index.html?</strong><br>';
          html += 'Only one file was uploaded. Would you like to rename it to index.html so it loads automatically?<br><br>';
          html += '<button id="renameBtn" style="background: #ffc107; color: #333; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Rename to index.html</button>';
          html += ' <button onclick="this.parentElement.innerHTML=\'<p>File kept with original name.</p>\'" style="background: #6c757d; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">Cancel</button>';
          html += '</div>';
        }
        
        document.getElementById('results').innerHTML = html;
        
        if (data.singleFile) {
          document.getElementById('renameBtn').addEventListener('click', function() {
            fetch('/rename', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ oldName: data.filename, newName: 'index.html' })
            })
            .then(r => r.json())
            .then(data => {
              if (data.success) {
                document.getElementById('renamePrompt').innerHTML = '<p class="success">File renamed to index.html successfully!</p>';
                loadFileList();
              } else {
                document.getElementById('renamePrompt').innerHTML = '<p style="color: red;">Rename failed</p>';
              }
            });
          });
        }
        
        loadFileList();
      } else {
        document.getElementById('results').innerHTML = '<p style="color: red;">Upload failed</p>';
      }
      btn.disabled = false;
      btn.textContent = 'Upload Files';
    })
    .catch(err => {
      document.getElementById('results').innerHTML = '<p style="color: red;">Upload failed: ' + err.message + '</p>';
      btn.disabled = false;
      btn.textContent = 'Upload Files';
    });
});
