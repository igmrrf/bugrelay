# Contributing to BUGMIRROR

Thank you for considering contributing to **BUGMIRROR**! 🎉  
This guide will help you set up your local environment, follow contribution standards, and make valuable pull requests.

---

## 🧭 Development Workflow

### 1. Fork the Repository
Click "Fork" at the top-right of the GitHub page to create your copy.

### 2. Clone Your Fork
```bash
git clone https://github.com/igmrrf/bugmirror.git
cd bugmirror
```

### 3. Create a Branch
Follow a naming convention that matches your change type:
```
git checkout -b feature/add-company-claim
git checkout -b fix/bug-submission-error
```

### 4. Make Changes
Follow code quality and formatting rules:
- Use TypeScript consistently.
- Follow project’s ESLint + Prettier configuration.
- Write meaningful commit messages.

### 5. Test Your Code
Ensure everything runs without errors before committing:
```bash
npm run lint
npm run test
```

### 6. Commit & Push
```bash
git add .
git commit -m "feat: add company claim verification"
git push origin feature/add-company-claim
```

### 7. Open a Pull Request
Go to your GitHub repo and click **Compare & Pull Request**.

---

## 🧩 Code Guidelines
- Follow consistent naming conventions (`camelCase` for variables, `PascalCase` for components).
- Keep logic modular; avoid large functions or components.
- Comment complex code, especially around API calls and auth flows.

---

## 🧪 Testing
- Unit tests for backend logic (NestJS)
- Integration tests for API routes
- Frontend component tests using React Testing Library

---

## 🔒 Code of Conduct
Respect everyone’s opinions. No harassment or discrimination will be tolerated.

