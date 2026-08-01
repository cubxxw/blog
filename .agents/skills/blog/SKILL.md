```markdown
# blog Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and conventions used in the `blog` JavaScript codebase. You'll learn how to structure files, write and organize code, and follow the repository's unique commit and testing practices. This guide is especially useful for contributors aiming for consistency and maintainability in a non-framework, vanilla JavaScript environment.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `blogPost.js`, `userProfile.js`

### Import Style
- Use **relative imports** for modules.
  - Example:
    ```javascript
    import { getUser } from './userUtils.js';
    ```

### Export Style
- Use **named exports**.
  - Example:
    ```javascript
    // In userUtils.js
    export function getUser(id) { ... }
    export function setUser(user) { ... }
    ```

### Commit Patterns
- Commit messages are **freeform**, often prefixed with context like `ui`.
- Average commit message length is around 45 characters.
  - Example: `ui update post list layout`

## Workflows

### Code Contribution
**Trigger:** When adding new features or fixing bugs  
**Command:** `/contribute`

1. Create a new branch for your feature or fix.
2. Follow camelCase naming for new files.
3. Use relative imports and named exports in your modules.
4. Write or update corresponding test files (`*.test.*`).
5. Write a clear, context-prefixed commit message (e.g., `ui improve comment section`).
6. Push your branch and open a pull request.

### Testing
**Trigger:** When verifying code changes  
**Command:** `/test`

1. Identify or create test files matching the `*.test.*` pattern.
2. Run the test suite using the project's preferred method (testing framework is unknown; consult project docs or package.json).
3. Ensure all tests pass before merging or deploying changes.

## Testing Patterns

- Test files are named with the pattern `*.test.*` (e.g., `blogPost.test.js`).
- The specific testing framework is not detected; check for scripts or documentation in the project root.
- Place test files alongside the modules they test or in a dedicated `tests` directory.

  Example test file:
  ```javascript
  // blogPost.test.js
  import { createPost } from './blogPost.js';

  test('createPost returns a post object', () => {
    const post = createPost('Hello', 'World');
    expect(post.title).toBe('Hello');
    expect(post.content).toBe('World');
  });
  ```

## Commands
| Command      | Purpose                                    |
|--------------|--------------------------------------------|
| /contribute  | Guide for contributing code changes         |
| /test        | Steps for running and writing tests         |
```
