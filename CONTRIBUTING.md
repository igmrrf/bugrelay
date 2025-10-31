# Contributing to BugRelay

Thank you for your interest in contributing to BugRelay! This guide will help you get started with contributing to both the codebase and documentation.

## Getting Started

### Prerequisites

- **Node.js 18+** and npm (for frontend and documentation)
- **Go 1.21+** (for backend development)
- **Docker & Docker Compose** (recommended for development)
- **Git** (version control)

### Quick Setup (5 minutes)

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/your-username/bugrelay.git
   cd bugrelay
   ```

2. **One-command setup:**
   ```bash
   make setup  # Installs all dependencies for frontend, backend, and docs
   ```

3. **Start everything:**
   ```bash
   make docker-up  # Starts all services with Docker
   ```

4. **Verify setup:**
   - Frontend: http://localhost:3000 (Next.js app)
   - Backend: http://localhost:8080/health (API health check)
   - Documentation: http://localhost:3001 (VitePress docs)

### Alternative: Individual Services

If you prefer to run services individually:

```bash
# Terminal 1: Backend
make dev-backend

# Terminal 2: Frontend  
make dev-frontend

# Terminal 3: Documentation
make dev-docs
```

## Contributing Guidelines

### Code Standards

**Frontend (TypeScript/React):**
- ✅ Use TypeScript for all new code (no JavaScript files)
- ✅ Follow React best practices and hooks patterns
- ✅ Use Tailwind CSS for styling (no custom CSS unless necessary)
- ✅ Format with Prettier (`npm run format`)
- ✅ Lint with ESLint (`npm run lint`)
- ✅ Use functional components with hooks
- ✅ Implement proper error boundaries

**Backend (Go):**
- ✅ Follow standard Go conventions and idioms
- ✅ Use `gofmt` for formatting
- ✅ Use `golangci-lint` for comprehensive linting
- ✅ Write tests for all new functionality (aim for >80% coverage)
- ✅ Follow the existing project structure in `internal/`
- ✅ Use proper error handling with wrapped errors
- ✅ Document exported functions and types

**Documentation:**
- ✅ Use clear, concise language suitable for all skill levels
- ✅ Include working code examples that can be copy-pasted
- ✅ Test all code examples before submitting
- ✅ Follow the existing VitePress structure
- ✅ Use proper markdown formatting and syntax highlighting
- ✅ Include screenshots for UI-related documentation

### Commit Messages

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(auth): add OAuth integration with Google
fix(api): resolve bug report creation validation
docs(api): update authentication examples
```

### Pull Request Process

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   # or  
   git checkout -b docs/update-section
   ```

2. **Make your changes:**
   - Write code following our style guidelines
   - Add comprehensive tests for new functionality
   - Update documentation if you change APIs or add features
   - Ensure your code works with the existing system

3. **Test everything:**
   ```bash
   # Run all tests
   make test-frontend
   make test-backend
   make docs-test
   
   # Check code quality
   make lint-frontend
   make lint-backend
   
   # Validate documentation
   make docs-validate
   ```

4. **Update documentation (if needed):**
   ```bash
   # If you added/changed API endpoints
   cd docs
   npm run generate:openapi
   
   # If you added/changed data models
   npm run generate:schemas
   
   # Test documentation locally
   npm run dev
   ```

5. **Commit with conventional format:**
   ```bash
   git add .
   git commit -m "feat(auth): add Google OAuth integration"
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request:**
   - ✅ Use a descriptive title following conventional commits
   - ✅ Fill out the PR template completely
   - ✅ Reference related issues with "Fixes #123" or "Closes #456"
   - ✅ Include screenshots for UI changes
   - ✅ Add reviewers if you know who should review
   - ✅ Mark as draft if it's work in progress

### PR Review Process

- **Automated Checks**: All PRs run automated tests and linting
- **Documentation**: PRs that change APIs must update documentation
- **Code Review**: At least one maintainer review required
- **Testing**: New features must include tests
- **Breaking Changes**: Must be discussed in issues first

## Documentation Contributions

Our documentation system is built with VitePress and includes auto-generation from code.

### Documentation Structure

```
docs/
├── index.md                 # 🏠 Homepage with feature overview
├── api/                     # 🔌 API documentation
│   ├── index.md            # API overview and quick start
│   ├── endpoints/          # Detailed endpoint docs (auto-generated)
│   └── examples/           # Request/response examples
├── authentication/         # 🔐 Auth guides with code samples
├── deployment/            # 🚀 Setup and deployment guides
├── guides/                # 📖 Tutorials and how-tos
│   └── quick-start.md     # Complete getting started guide
├── models/                # 📊 Data model documentation
├── mcp/                   # 🤖 AI integration docs
├── scripts/               # 🔧 Generation and validation scripts
└── .vitepress/           # ⚙️ VitePress configuration
```

### Types of Documentation Contributions

1. **API Documentation:**
   - Most content is auto-generated from Go code comments
   - Add practical examples in `api/examples/`
   - Create endpoint-specific guides in `api/endpoints/`

2. **Guides and Tutorials:**
   - Add step-by-step tutorials in `guides/`
   - Update navigation in `.vitepress/config.js`
   - Include complete, working code examples
   - Test all examples before submitting

3. **Model Documentation:**
   - Schemas auto-generated from Go structs
   - Add human-readable explanations in `models/`
   - Create relationship diagrams with Mermaid
   - Document validation rules and constraints

### Documentation Standards

**✅ Required for all documentation:**
- **Working Examples**: All code must be tested and functional
- **Clear Language**: Write for developers of all experience levels
- **Proper Formatting**: Use consistent markdown and syntax highlighting
- **Internal Links**: Use relative paths for internal documentation
- **Screenshots**: Include for UI-related features (optimized for web)

**📝 Writing Guidelines:**
- Start with a brief overview of what the reader will learn
- Use numbered steps for procedures
- Include expected outputs for commands
- Explain error conditions and troubleshooting
- End with links to related documentation

### Testing Documentation

```bash
cd docs

# Start development server (hot reload)
npm run dev  # http://localhost:3001

# Validate all documentation
npm run validate

# Run comprehensive tests (examples, links, etc.)
npm run test:comprehensive

# Generate fresh content from codebase
npm run generate:all
```

### Documentation Workflow

1. **Make Changes**: Edit markdown files or add new ones
2. **Test Locally**: Run `npm run dev` to preview changes
3. **Validate**: Run `npm run validate` to check for issues
4. **Generate**: Run `npm run generate:all` if you changed backend code
5. **Submit**: Include documentation changes in your PR

## Specific Contribution Areas

### Backend API Development

When adding new API endpoints:

1. **Follow the existing pattern:**
   ```go
   // internal/handlers/bugs.go
   func (h *Handler) CreateBug(c *gin.Context) {
       // Implementation
   }
   ```

2. **Add proper validation:**
   ```go
   type CreateBugRequest struct {
       Title       string   `json:"title" binding:"required,min=5,max=200"`
       Description string   `json:"description" binding:"required,min=10"`
       Priority    string   `json:"priority" binding:"required,oneof=low medium high critical"`
   }
   ```

3. **Include comprehensive tests:**
   ```go
   func TestCreateBug(t *testing.T) {
       // Test implementation
   }
   ```

4. **Update documentation:**
   - The OpenAPI spec will be auto-generated
   - Add examples in `docs/api/examples/`
   - Update any relevant guides

### Frontend Development

When adding new components:

1. **Use TypeScript:**
   ```typescript
   interface BugCardProps {
     bug: Bug;
     onVote: (bugId: string, voteType: 'up' | 'down') => void;
   }
   
   export function BugCard({ bug, onVote }: BugCardProps) {
     // Component implementation
   }
   ```

2. **Add proper styling:**
   ```typescript
   <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
     {/* Component content */}
   </div>
   ```

3. **Include tests:**
   ```typescript
   import { render, screen } from '@testing-library/react';
   import { BugCard } from './BugCard';
   
   test('renders bug card with title', () => {
     // Test implementation
   });
   ```

### Database Changes

When modifying the database schema:

1. **Create migration files:**
   ```sql
   -- migrations/001_create_bugs_table.up.sql
   CREATE TABLE bugs (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       title VARCHAR(200) NOT NULL,
       -- Other columns
   );
   ```

2. **Update Go models:**
   ```go
   type Bug struct {
       ID          uuid.UUID `json:"id" db:"id"`
       Title       string    `json:"title" db:"title"`
       // Other fields
   }
   ```

3. **Regenerate documentation:**
   ```bash
   cd docs
   npm run generate:schemas
   ```

## Priority Contribution Areas

We especially welcome contributions in these areas:

### 🔥 High Priority
- **Backend API Development**: Implementing core bug tracking endpoints
- **Authentication System**: JWT and OAuth integration
- **Database Models**: Designing and implementing data structures
- **API Testing**: Comprehensive test coverage for all endpoints

### 📚 Documentation
- **Code Examples**: More language-specific examples (Python, JavaScript, etc.)
- **Integration Guides**: How to integrate BugRelay with popular tools
- **Video Tutorials**: Screen recordings for complex setup procedures
- **Troubleshooting**: Common issues and solutions

### 🎨 Frontend Development
- **React Components**: Reusable UI components with TypeScript
- **State Management**: Zustand store implementations
- **User Experience**: Improving forms, navigation, and interactions
- **Responsive Design**: Mobile-first component development

### 🧪 Testing & Quality
- **Unit Tests**: Frontend and backend test coverage
- **Integration Tests**: End-to-end testing scenarios
- **Performance Testing**: Load testing and optimization
- **Security Testing**: Vulnerability assessment and fixes

## Getting Help

### 📖 Documentation First
- **Start Here**: [Quick Start Guide](docs/guides/quick-start.md)
- **API Reference**: [Complete API Documentation](docs/api/)
- **Troubleshooting**: [Common Issues](docs/guides/troubleshooting.md)

### 💬 Community Support
- **🐛 Bug Reports**: Use GitHub Issues with the bug template
- **💡 Feature Requests**: Use GitHub Issues with the feature template  
- **❓ Questions**: Start a GitHub Discussion
- **💬 Real-time Chat**: Discord community (coming soon)

### 🚨 Getting Unstuck
If you're stuck on setup or development:

1. **Check Documentation**: Most issues are covered in our guides
2. **Search Issues**: Someone might have had the same problem
3. **Ask in Discussions**: Don't hesitate to ask questions
4. **Join Office Hours**: Weekly contributor meetups (coming soon)

## Recognition

Contributors are recognized in several ways:

- **README Credits**: All contributors listed in the main README
- **Release Notes**: Significant contributions highlighted in releases
- **Contributor Badge**: Special GitHub badge for regular contributors
- **Swag**: BugRelay stickers and swag for active contributors

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code. Please report unacceptable behavior to the maintainers.

## License

By contributing to BugRelay, you agree that your contributions will be licensed under the MIT License, the same as the project.

---

## Thank You! 🙏

Every contribution, no matter how small, helps make BugRelay better for everyone. Whether you're fixing a typo, adding a feature, or improving documentation, your work is valued and appreciated.

**Ready to contribute?** Start with our [Quick Start Guide](docs/guides/quick-start.md) and join our growing community of contributors! 🚀