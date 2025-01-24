// extension.js
"use strict";

const loaderId = setInterval(() => {
    if (!window._gmailjs) {
        return;
    }

    clearInterval(loaderId);
    startExtension(window._gmailjs);
}, 100);

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
    // Create a temporary div
    const temp = document.createElement('div');
    // Set the HTML content
    temp.innerHTML = html;
    // Get the text content
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

function updateSidebarContent(threadData) {
    const content = document.getElementById('sidebar-content');
    if (!content || !threadData) return;

    // Get emails from thread, sorted by timestamp
    const emails = Object.values(threadData.emails).sort((a, b) => a.timestamp - b.timestamp);
    
    let html = `
        <div style="font-family: monospace; font-size: 12px;">
            <p><strong>Thread ID:</strong> ${threadData.thread_id}</p>
            <p><strong>Subject:</strong> ${emails[0].subject}</p>
            <hr>
    `;

    // Add each email in the thread
    emails.forEach((email, index) => {
        const plainContent = htmlToPlainText(email.content_html);
        
        html += `
            <div style="margin-bottom: 20px;">
                <p><strong>From:</strong> ${formatAddress(email.from)}</p>
                <p><strong>To:</strong> ${formatAddressList(email.to)}</p>
                <pre style="white-space: pre-wrap; margin: 10px 0; background: #f5f5f5; padding: 10px; border-radius: 4px;">${plainContent}</pre>
                <hr>
            </div>
        `;
    });

    html += '</div>';
    content.innerHTML = html;
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