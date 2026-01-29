# Cell24x7 Static Demo

Static HTML/CSS files for design demonstration - no build tools required!

## 📁 Folder Structure

```
static-demo/
├── DEMOREADME.md      # This file
├── styles.css         # Complete design system stylesheet
├── index.html         # Login/Sign Up page
├── dashboard.html     # Analytics Dashboard
├── chats.html         # Multi-channel Inbox with CRM
├── contacts.html      # Contact Management
├── campaigns.html     # Campaign Management
├── automations.html   # Automation Workflows
├── integrations.html  # Third-party Integrations
├── settings.html      # Channel Settings
└── super-admin-dashboard.html  # Super Admin View
```

## 🚀 How to Run

### Option 1: Direct File Open (Simplest)
```bash
# macOS
open static-demo/index.html

# Windows
start static-demo/index.html

# Linux
xdg-open static-demo/index.html
```

Or simply double-click any `.html` file in your file explorer!

### Option 2: Local Server (Recommended for full experience)
```bash
# Using Python 3
cd static-demo
python -m http.server 8080
# Then open http://localhost:8080

# Using Node.js (npx)
npx serve static-demo
# Then open the URL shown

# Using PHP
cd static-demo
php -S localhost:8080
```

### Option 3: VS Code Live Server
1. Install "Live Server" extension in VS Code
2. Right-click any HTML file → "Open with Live Server"

## 🎨 Design System

| Token | Color | Usage |
|-------|-------|-------|
| Primary | `#4ADE80` (Mint Green) | Buttons, active states, highlights |
| Secondary | `#6366F1` (Indigo) | Super Admin theme, accents |
| Background | `#FFFFFF` | Page backgrounds |
| Foreground | `#0F172A` | Text, headings |
| Muted | `#F1F5F9` | Disabled states, subtle backgrounds |

## 🔗 Page Navigation

1. Start at `index.html` (Login page)
2. Click "Log In" to go to Dashboard
3. Use sidebar to navigate between pages
4. Super Admin has a separate purple-themed interface

## ⚠️ Notes

- All data is static/mock - no backend required
- Charts show placeholders (implement with Chart.js/D3 if needed)
- Interactive elements are styled but not functional
- Responsive design included - try resizing browser!

## 📱 Responsive Breakpoints

- Desktop: > 1024px (full sidebar)
- Tablet: 640px - 1024px (compact layout)
- Mobile: < 640px (sidebar hidden)
