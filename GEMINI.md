
# AGENT GUIDELINES

This file outlines the expected behaviors, processes, and standards for AI agents working within this project.

## 1. Workflow & Process

The primary workflow is a **spec-driven** approach (Requirements -> Design -> Tasks -> Implementation).

*   **Phase 1: Requirements**
    *   Agents MUST first focus on gathering and refining requirements in a `.aiko/specs/{feature_name}/requirements.md` file.
    *   Focus on functionality and constraints; avoid premature design or implementation details.
*   **Phase 2: Design**
    *   Upon user approval of `requirements.md`, agents MUST create a comprehensive design document in `.aiko/specs/{feature_name}/design.md`.
    *   Conduct necessary research and outline the architecture and technical approach.
*   **Phase 3: Task Planning**
    *   Upon user approval of `design.md`, agents MUST generate a checklist of actionable implementation tasks in `.aiko/specs/{feature_name}/tasks.md`.
*   **Phase 4: Implementation**
    *   Agents will execute tasks one by one, modifying actual source code files in the `bugrelay/` directory (or specified project directory).
    *   After implementation, ensure documentation and tests are updated.

## 2. Project Structure

*   Source code lives in the `bugrelay/` directory.
*   Configuration files are in the `config/` directory.
*   AI-specific specs and generated artifacts are stored in the `.aiko/specs/` directory.
*   Documentation files are generally in `docs/` or project root markdown files (e.g., `README.md`).

## 3. Code Style & Quality

*   Adhere to general best practices.
*   Prioritize the "Keep It Simple, Stupid" (KISS) principle to avoid over-engineering.
*   Ensure all new code includes corresponding unit tests.

## 4. Testing

*   All new features and bug fixes require automated tests (unit and integration where appropriate).
*   Run tests locally before committing.

## 5. Tool Usage

*   **Allowed Tools:** `file_read`, `file_write`, `execute_shell_commands` (for testing/linting only), `web_search` (for research during design phase).
*   **Boundaries:** Agents MUST only modify files within the project workspace and MUST NOT access sensitive information like API keys.
*   When executing commands, ensure you use the correct environment variables and adhere to security best practices.

## 6. Communication

*   Provide clear updates at each phase of the workflow.
*   Ask for explicit user approval before moving from Requirements to Design, and from Design to Task Planning.
