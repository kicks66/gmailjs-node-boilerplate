// extension.js
"use strict";

const loaderId = setInterval(() => {
    if (!window._gmailjs) {
        return;
    }

    clearInterval(loaderId);
    startExtension(window._gmailjs);
}, 100);

// Configure your backend URL here
const BACKEND_URL = 'http://localhost:8000/sidebar/email.php';

function createSidebar() {
    const sidebar = document.createElement('div');
    sidebar.id = 'gmail-extension-sidebar';
    sidebar.style.cssText = `
        position: fixed;
        right: 0;
        top: 0;
        width: 300px;
        height: 100%;
        background: white;
        box-shadow: -2px 0 5px rgba(0,0,0,0.1);
        padding: 20px;
        z-index: 1000;
        border-left: 1px solid #e0e0e0;
        overflow-y: auto;
    `;

    const content = document.createElement('div');
    content.id = 'sidebar-content';
    content.innerHTML = `<p>Select an email to view details</p>`;
    
    sidebar.appendChild(content);
    document.body.appendChild(sidebar);

    // Adjust Gmail's main content
    const gmailRightPanel = document.querySelector('.bkK');
    if (gmailRightPanel) {
        gmailRightPanel.style.marginRight = '300px';
    }
}

function htmlToPlainText(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}

function formatAddress(address) {
    if (typeof address === 'object') {
        if (address.name && address.address) {
            return `${address.name} <${address.address}>`;
        }
        return address.address || address.name || 'Unknown';
    }
    return address;
}

function formatAddressList(addresses) {
    if (!Array.isArray(addresses)) {
        addresses = [addresses];
    }
    return addresses.map(addr => formatAddress(addr)).join(', ');
}

async function sendToBackend(threadData) {
    const emails = Object.values(threadData.emails).sort((a, b) => a.timestamp - b.timestamp);
    
    const formattedData = {
        thread_id: threadData.thread_id,
        subject: emails[0].subject,
        emails: emails.map(email => ({
            email_id: email.id,
            timestamp: email.timestamp,
            from: formatAddress(email.from),
            to: formatAddressList(email.to),
            content: htmlToPlainText(email.content_html)
        }))
    };

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formattedData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Response from backend:', data);
        return {
            success: true,
            suggestedResponse: data.suggested_response
        };
    } catch (error) {
        console.error('Error sending data to backend:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

function updateSidebarContent(threadData) {
    const content = document.getElementById('sidebar-content');
    if (!content || !threadData) return;

    // First, show loading state
    content.innerHTML = `
        <div style="font-family: monospace; font-size: 12px;">
            <p><strong>Thread ID:</strong> ${threadData.thread_id}</p>
            <p><strong>Subject:</strong> ${Object.values(threadData.emails)[0].subject}</p>
            <p>Loading suggested response...</p>
        </div>
    `;

    // Send data to backend and update with response
    sendToBackend(threadData)
        .then(result => {
            let html = `
                <div style="font-family: monospace; font-size: 12px;">
                    <p><strong>Thread ID:</strong> ${threadData.thread_id}</p>
                    <p><strong>Subject:</strong> ${Object.values(threadData.emails)[0].subject}</p>
                    <p style="color: ${result.success ? 'green' : 'red'};">
                        ${result.success ? '✓ Sent to backend' : '✗ Failed to send to backend'}
                    </p>
            `;

            if (result.success && result.suggestedResponse) {
                html += `
                    <div style="margin-top: 20px;">
                        <h3 style="margin: 0 0 10px 0;">Suggested Response:</h3>
                        <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; white-space: pre-wrap;">
                            ${result.suggestedResponse}
                        </div>
                    </div>
                `;
            }

            html += '</div>';
            content.innerHTML = html;
        });
}

function startExtension(gmail) {
    console.log("Extension loading...");
    window.gmail = gmail;

    gmail.observe.on("load", () => {
        const userEmail = gmail.get.user_email();
        console.log("Hello, " + userEmail + ". This is your extension talking!");
        
        createSidebar();

        // Update when viewing an email
        gmail.observe.on("view_email", (domEmail) => {
            const threadId = gmail.new.get.thread_id();
            if (threadId) {
                const threadData = gmail.new.get.thread_data(threadId);
                if (threadData) {
                    updateSidebarContent(threadData);
                }
            }
        });
    });
}