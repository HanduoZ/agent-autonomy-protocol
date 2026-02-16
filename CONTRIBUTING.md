# Contributing to A2AP

## Welcome!

We're building experimental infrastructure for agent autonomy. Contributions are welcome from:
- Researchers (propose experiments, analyze data)
- Engineers (improve code, add features)
- Ethicists (identify risks, suggest safeguards)
- Anyone curious about agent sovereignty

## Ways to Contribute

### 1. Code Contributions
- Bug fixes
- New features (see open issues)
- Performance improvements
- Test coverage

**Process:**
1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Make changes
4. Run tests: `npm test`
5. Commit: `git commit -m "feat: your feature description"`
6. Push: `git push origin feature/your-feature`
7. Open a Pull Request

### 2. Research Contributions
- Propose new research questions (use "Research Question" issue template)
- Analyze experiment data (see `/research/` directory)
- Suggest hypotheses
- Review and critique findings

### 3. Safety & Ethics
- Report safety concerns (use "Safety Concern" issue template)
- Propose new safety mechanisms
- Ethical review of features
- Threat modeling

### 4. Documentation
- Fix typos and clarity issues
- Add examples
- Improve API docs
- Write tutorials

## Development Setup

```bash
# Clone the repository
git clone https://github.com/HanduoZ/agent-autonomy-protocol.git
cd agent-autonomy-protocol

# Install dependencies
npm install

# Start PostgreSQL
docker compose up -d

# Run migrations
npm run migrate

# Start dev server
npm run dev

# Run tests
npm test
```

## Code Standards

- **Style:** Prettier (auto-formatted)
- **Linting:** ESLint
- **Tests:** Vitest (aim for >80% coverage)
- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)

## License Headers

All new source files must include:

```typescript
/**
 * Copyright (c) 2026 A2AP Contributors
 * SPDX-License-Identifier: MIT
 */
```

## Review Process

- All PRs require at least 1 review
- Safety-critical changes require 2 reviews
- Maintainers will review within 7 days
- We prioritize safety > features > performance

## Code of Conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md). TLDR: Be respectful, inclusive, and professional.

## Questions?

- Open a GitHub Discussion
- Check existing documentation
- Ask in issues

---

Thank you for contributing to agent autonomy research!
