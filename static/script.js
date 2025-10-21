// script.js
document.addEventListener('DOMContentLoaded', function() {
    // Terminal functionality
    const terminal = document.getElementById('terminal');
    const toggleTerminal = document.getElementById('toggle-terminal');
    const terminalOutput = document.getElementById('terminal-output');
    
    function addTerminalLine(message) {
        const line = document.createElement('div');
        line.className = 'terminal-line';
        line.textContent = message;
        terminalOutput.appendChild(line);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    toggleTerminal.addEventListener('click', function() {
        terminal.classList.toggle('expanded');
        const icon = toggleTerminal.querySelector('i');
        if (terminal.classList.contains('expanded')) {
            icon.className = 'fas fa-chevron-up';
        } else {
            icon.className = 'fas fa-chevron-down';
        }
    });

    // Register domain form
    const registerForm = document.getElementById('register-form');
    const registerResult = document.getElementById('register-result');

    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const domainName = document.getElementById('domain-name').value + '.block';
        const ipAddress = document.getElementById('ip-address').value;
        const owner = document.getElementById('owner').value;
        
        // Validate IP address (basic validation)
        const ipPattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        if (!ipPattern.test(ipAddress)) {
            showResult(registerResult, 'Invalid IP address format. Please use format: 192.168.1.1', 'error');
            return;
        }
        
        fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                domain_name: domainName,
                ip_address: ipAddress,
                owner: owner
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showResult(registerResult, data.message, 'success');
                registerForm.reset();
                loadDomains();
                loadBlockchain();
                addTerminalLine(`Domain registered: ${domainName} → ${ipAddress} (Owner: ${owner})`);
            } else {
                showResult(registerResult, data.message, 'error');
                addTerminalLine(`Domain registration failed: ${domainName} - ${data.message}`);
            }
        })
        .catch(error => {
            showResult(registerResult, 'Error connecting to server', 'error');
            addTerminalLine(`Error: ${error.message}`);
        });
    });

    // Lookup domain form
    const lookupForm = document.getElementById('lookup-form');
    const lookupResult = document.getElementById('lookup-result');

    lookupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const domainName = document.getElementById('lookup-domain').value;
        
        fetch(`/api/lookup/${domainName}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const domain = data.domain;
                showResult(
                    lookupResult, 
                    `<strong>Domain:</strong> ${domain.domain_name}<br>
                    <strong>IP Address:</strong> ${domain.ip_address}<br>
                    <strong>Owner:</strong> ${domain.owner}<br>
                    <strong>Registered:</strong> ${domain.registered_at}`,
                    'info'
                );
                addTerminalLine(`Domain lookup: ${domainName} → ${domain.ip_address}`);
            } else {
                showResult(lookupResult, data.message, 'error');
                addTerminalLine(`Domain lookup failed: ${domainName} - ${data.message}`);
            }
        })
        .catch(error => {
            showResult(lookupResult, 'Error connecting to server', 'error');
            addTerminalLine(`Error: ${error.message}`);
        });
    });

    // Helper function to show results
    function showResult(element, message, type) {
        element.innerHTML = message;
        element.className = 'result-box result-' + type;
    }

    // Load and display domains
    const domainsList = document.getElementById('domains-list');
    const refreshDomains = document.getElementById('refresh-domains');

    function loadDomains() {
        domainsList.innerHTML = '<tr><td colspan="4" class="pulse">Loading domains...</td></tr>';
        
        fetch('/api/domains')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.domains.length === 0) {
                    domainsList.innerHTML = '<tr><td colspan="4">No domains registered yet</td></tr>';
                    return;
                }
                
                domainsList.innerHTML = '';
                data.domains.forEach(domain => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${domain.domain_name}</td>
                        <td>${domain.ip_address}</td>
                        <td>${domain.owner}</td>
                        <td>${domain.registered_at}</td>
                    `;
                    domainsList.appendChild(row);
                });
                addTerminalLine(`Loaded ${data.domains.length} domains`);
            } else {
                domainsList.innerHTML = '<tr><td colspan="4">Error loading domains</td></tr>';
                addTerminalLine('Error loading domains');
            }
        })
        .catch(error => {
            domainsList.innerHTML = '<tr><td colspan="4">Error connecting to server</td></tr>';
            addTerminalLine(`Error: ${error.message}`);
        });
    }

    refreshDomains.addEventListener('click', loadDomains);

    // Load and display blockchain
    const blockchainContainer = document.getElementById('blockchain-container');
    const chainLength = document.getElementById('chain-length');
    const chainStatus = document.getElementById('chain-status');
    const validateChain = document.getElementById('validate-chain');

    function loadBlockchain() {
        blockchainContainer.innerHTML = '<div class="pulse">Loading blockchain...</div>';
        
        fetch('/api/chain')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                blockchainContainer.innerHTML = '';
                chainLength.textContent = data.length;
                
                data.chain.reverse().forEach(block => {
                    const blockEl = document.createElement('div');
                    blockEl.className = 'block';
                    
                    let domainsHtml = '';
                    if (block.domains.length > 0) {
                        block.domains.forEach(domain => {
                            domainsHtml += `
                                <div class="domain-item">
                                    <strong>${domain.domain_name}</strong> → ${domain.ip_address} (Owner: ${domain.owner})
                                </div>
                            `;
                        });
                    } else {
                        domainsHtml = '<div class="domain-item">No domains in this block (Genesis)</div>';
                    }
                    
                    blockEl.innerHTML = `
                        <div class="block-header">
                            <div class="block-title">Block #${block.index}</div>
                            <div class="block-timestamp">${block.timestamp}</div>
                        </div>
                        <div class="block-hash">
                            <strong>Hash:</strong> ${block.hash.substring(0, 20)}...
                        </div>
                        <div class="block-hash">
                            <strong>Prev:</strong> ${block.previous_hash.substring(0, 20)}...
                        </div>
                        <div class="block-content">
                            <div class="block-domains">
                                ${domainsHtml}
                            </div>
                        </div>
                    `;
                    
                    blockchainContainer.appendChild(blockEl);
                });
                
                addTerminalLine(`Loaded blockchain with ${data.length} blocks`);
            } else {
                blockchainContainer.innerHTML = '<div>Error loading blockchain</div>';
                addTerminalLine('Error loading blockchain');
            }
        })
        .catch(error => {
            blockchainContainer.innerHTML = '<div>Error connecting to server</div>';
            addTerminalLine(`Error: ${error.message}`);
        });
    }

    // Validate blockchain
    validateChain.addEventListener('click', function() {
        chainStatus.textContent = 'Checking...';
        
        fetch('/api/validate')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.valid) {
                    chainStatus.textContent = 'Valid ✓';
                    chainStatus.style.color = 'var(--success-color)';
                    addTerminalLine('Blockchain validation: VALID');
                } else {
                    chainStatus.textContent = 'Invalid ✗';
                    chainStatus.style.color = 'var(--error-color)';
                    addTerminalLine('Blockchain validation: INVALID');
                }
            } else {
                chainStatus.textContent = 'Error';
                addTerminalLine('Error validating blockchain');
            }
        })
        .catch(error => {
            chainStatus.textContent = 'Error';
            addTerminalLine(`Error: ${error.message}`);
        });
    });

    // Initialize the application
    addTerminalLine('Blockchain DNS Frontend Initialized');
    loadDomains();
    loadBlockchain();
});
const activityLog = document.getElementById('activity-log');

function addLogEntry(message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = message;
    activityLog.appendChild(entry);
    activityLog.scrollTop = activityLog.scrollHeight;
}

// Add log entries for all main operations
registerForm.addEventListener('submit', function(e) {
    // ... existing code ...
    if (data.success) {
        // ... existing code ...
        addLogEntry(`Domain registered: ${domainName} → ${ipAddress} (Owner: ${owner})`);
    }
});

lookupForm.addEventListener('submit', function(e) {
    // ... existing code ...
    if (data.success) {
        // ... existing code ...
        addLogEntry(`Domain lookup: ${domainName} → ${domain.ip_address}`);
    }
});

// Modify the addTerminalLine function to ensure visibility
function addTerminalLine(message) {
    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.textContent = message;
    terminalOutput.appendChild(line);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
    
    // Make sure terminal is visible after important operations
    if (message.includes('registered') || message.includes('lookup')) {
        terminal.classList.add('expanded');
        const icon = toggleTerminal.querySelector('i');
        icon.className = 'fas fa-chevron-up';
    }
    
    console.log("Terminal:", message); // Also log to browser console
}

// Ensure terminal is expanded on first load
window.addEventListener('load', function() {
    terminal.classList.add('expanded');
    addTerminalLine("Blockchain DNS System ready for use");
});