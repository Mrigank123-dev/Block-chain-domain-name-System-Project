from flask import Flask, render_template, request, jsonify
import json
import hashlib
from datetime import datetime
import os

app = Flask(__name__)
app.config['DEBUG'] = True

# Simple in-memory storage
domains = {}
pending_domains = []

# Create necessary directories
os.makedirs('templates', exist_ok=True)
os.makedirs('static', exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['POST'])
def register():
    try:
        domain = request.form.get('domain', '')
        ip = request.form.get('ip', '')
        
        if not domain or not ip:
            return jsonify({'success': False, 'message': 'Domain and IP are required'})
        
        if domain in domains:
            return jsonify({'success': False, 'message': 'Domain already registered'})
        
        pending_domains.append({'domain': domain, 'ip': ip})
        return jsonify({'success': True, 'message': 'Domain registration pending'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'})

@app.route('/query', methods=['POST'])
def query():
    try:
        domain = request.form.get('domain', '')
        
        if not domain:
            return jsonify({'success': False, 'message': 'Domain is required'})
        
        if domain in domains:
            return jsonify({'success': True, 'ip': domains[domain]})
        else:
            return jsonify({'success': False, 'message': 'Domain not found'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'})

@app.route('/mine', methods=['GET'])
def mine():
    try:
        if not pending_domains:
            return jsonify({'success': False, 'message': 'No pending domains to mine'})
        
        for record in pending_domains:
            domains[record['domain']] = record['ip']
        
        count = len(pending_domains)
        pending_domains.clear()
        
        return jsonify({'success': True, 'message': f'Mined {count} domains successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'})

@app.route('/chain', methods=['GET'])
def get_chain():
    try:
        return jsonify({
            'success': True,
            'current_records': domains,
            'length': 1,  # Simplified blockchain
            'pending': len(pending_domains)
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'})

# Create HTML file with absolute URLs
with open('templates/index.html', 'w') as f:
    f.write("""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simple Blockchain DNS</title>
    <link rel="stylesheet" href="/static/style.css">
</head>
<body>
    <div class="container">
        <h1>Blockchain Domain Name System</h1>
        <div id="status"></div>
        
        <div class="card">
            <h2>Register a Domain</h2>
            <form id="registerForm">
                <div class="form-group">
                    <label for="domain">Domain Name:</label>
                    <input type="text" id="domain" name="domain" placeholder="example.eth" required>
                </div>
                <div class="form-group">
                    <label for="ip">IP Address:</label>
                    <input type="text" id="ip" name="ip" placeholder="192.168.1.1" required>
                </div>
                <button type="submit" class="btn">Register Domain</button>
            </form>
            <div id="registerResult" class="result"></div>
        </div>
        
        <div class="card">
            <h2>Query a Domain</h2>
            <form id="queryForm">
                <div class="form-group">
                    <label for="queryDomain">Domain Name:</label>
                    <input type="text" id="queryDomain" name="domain" placeholder="example.eth" required>
                </div>
                <button type="submit" class="btn">Query IP</button>
            </form>
            <div id="queryResult" class="result"></div>
        </div>
        
        <div class="card">
            <h2>Mine Pending Registrations</h2>
            <button id="mineBtn" class="btn">Mine Block</button>
            <div id="mineResult" class="result"></div>
        </div>
        
        <div class="card">
            <h2>Blockchain Status</h2>
            <button id="viewChainBtn" class="btn">View Status</button>
            <div id="chainInfo" class="result"></div>
        </div>
    </div>

    <script>
        // Display server connection status
        const statusEl = document.getElementById('status');
        statusEl.innerHTML = '<div class="info">Checking server connection...</div>';
        
        // Test server connection
        fetch('/chain')
            .then(response => {
                if (response.ok) {
                    statusEl.innerHTML = '<div class="success">Connected to server</div>';
                } else {
                    statusEl.innerHTML = '<div class="error">Server error: ' + response.status + '</div>';
                }
            })
            .catch(error => {
                statusEl.innerHTML = '<div class="error">Cannot connect to server. Make sure Flask is running.</div>';
                console.error('Connection error:', error);
            });
        
        // Register Domain
        document.getElementById('registerForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData();
            formData.append('domain', document.getElementById('domain').value);
            formData.append('ip', document.getElementById('ip').value);
            
            fetch('/register', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if(data.success) {
                    document.getElementById('registerResult').innerHTML = `<div class="success">${data.message}</div>`;
                } else {
                    document.getElementById('registerResult').innerHTML = `<div class="error">${data.message}</div>`;
                }
            })
            .catch(error => {
                document.getElementById('registerResult').innerHTML = `<div class="error">Network error: ${error.message}</div>`;
            });
        });
        
        // Query Domain
        document.getElementById('queryForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData();
            formData.append('domain', document.getElementById('queryDomain').value);
            
            fetch('/query', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if(data.success) {
                    document.getElementById('queryResult').innerHTML = `<div class="success">IP Address: ${data.ip}</div>`;
                } else {
                    document.getElementById('queryResult').innerHTML = `<div class="error">${data.message}</div>`;
                }
            })
            .catch(error => {
                document.getElementById('queryResult').innerHTML = `<div class="error">Network error: ${error.message}</div>`;
            });
        });
        
        // Mine Block
        document.getElementById('mineBtn').addEventListener('click', function() {
            fetch('/mine')
            .then(response => response.json())
            .then(data => {
                if(data.success) {
                    document.getElementById('mineResult').innerHTML = `<div class="success">${data.message}</div>`;
                } else {
                    document.getElementById('mineResult').innerHTML = `<div class="error">${data.message}</div>`;
                }
            })
            .catch(error => {
                document.getElementById('mineResult').innerHTML = `<div class="error">Network error: ${error.message}</div>`;
            });
        });
        
        // View Blockchain
        document.getElementById('viewChainBtn').addEventListener('click', function() {
            fetch('/chain')
            .then(response => response.json())
            .then(data => {
                let html = '<div>';
                
                html += `<p>Registered domains: ${Object.keys(data.current_records).length}</p>`;
                html += `<p>Pending domains: ${data.pending}</p>`;
                
                if(Object.keys(data.current_records).length > 0) {
                    html += '<h3>Current Domain Records:</h3><ul>';
                    for(const domain in data.current_records) {
                        html += `<li><strong>${domain}</strong>: ${data.current_records[domain]}</li>`;
                    }
                    html += '</ul>';
                } else {
                    html += '<p>No domains registered yet.</p>';
                }
                
                html += '</div>';
                
                document.getElementById('chainInfo').innerHTML = html;
            })
            .catch(error => {
                document.getElementById('chainInfo').innerHTML = `<div class="error">Network error: ${error.message}</div>`;
            });
        });
    </script>
</body>
</html>""")

# Create CSS file
with open('static/style.css', 'w') as f:
    f.write("""/* General Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: Arial, sans-serif;
}

body {
    background-color: #f0f2f5;
    padding: 20px;
}

.container {
    max-width: 800px;
    margin: 0 auto;
}

h1 {
    text-align: center;
    margin-bottom: 20px;
    color: #333;
}

h2 {
    color: #2c7be5;
    margin-bottom: 15px;
}

/* Card Styles */
.card {
    background-color: white;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

/* Form Styles */
.form-group {
    margin-bottom: 15px;
}

label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
}

input[type="text"] {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.btn {
    background-color: #2c7be5;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 4px;
    cursor: pointer;
}

.btn:hover {
    background-color: #1a68d1;
}

/* Result Styles */
.result {
    margin-top: 15px;
}

.success {
    color: #28a745;
    background-color: #d4edda;
    padding: 10px;
    border-radius: 4px;
}

.error {
    color: #dc3545;
    background-color: #f8d7da;
    padding: 10px;
    border-radius: 4px;
}

.info {
    color: #0c5460;
    background-color: #d1ecf1;
    padding: 10px;
    border-radius: 4px;
}

/* List Styles */
ul {
    margin-top: 10px;
    margin-left: 20px;
}

li {
    margin-bottom: 5px;
}
""")

print("Files created successfully!")
print("Run the Flask app with: flask run")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)