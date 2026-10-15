# Contributing to BlueSPACE Leave Management System

Thank you for considering contributing to our project! This document outlines our contribution process and coding standards.

## How to Contribute

### Reporting Issues
- Use the GitHub issue tracker
- Provide clear, descriptive titles
- Include steps to reproduce for bugs
- Suggest expected behavior
- Add screenshots when relevant

### Suggesting Features
- Check existing issues to avoid duplicates
- Clearly describe the problem and proposed solution
- Consider usability, accessibility, and performance implications
- Be open to feedback and alternative approaches

### Submitting Changes
1. Fork the repository
2. Create a new branch for your feature/fix
3. Make your changes following our coding standards
4. Add or update tests as appropriate
5. Ensure all tests pass
6. Submit a pull request with a clear description

## Coding Standards

### General Principles
- Write clear, self-documenting code
- Follow existing patterns in the codebase
- Prioritize readability over cleverness
- Consider accessibility and performance implications
- Keep functions focused and small

### JavaScript/React Specific
- Use functional components with hooks
- Prefer named exports over default exports when appropriate
- Use destructuring for props
- Handle errors gracefully
- Use PropTypes or TypeScript for prop validation
- Follow the existing file and folder structure

### CSS/Tailwind Specific
- Use utility-first approach when possible
- Follow the design tokens defined in DESIGN.md
- Keep custom CSS in @layer sections
- Use semantic class names when creating custom classes
- Responsive design: mobile-first approach

### Accessibility
- Ensure all interactive elements are keyboard accessible
- Use semantic HTML elements
- Provide appropriate ARIA labels
- Ensure sufficient color contrast
- Test with screen readers when making significant UI changes

### Performance
- Avoid unnecessary re-renders in React
- Use React.memo, useCallback, useMemo judiciously
- Optimize images and assets
- Consider lazy loading for below-the-fold content
- Bundle size awareness

## Anti-Slop Guidelines

Our project uses [anti-slop](https://github.com/miqdadbadjuber/anti-slop) to filter out generic AI-generated UI designs, text, and code. When contributing:

1. **Avoid generic patterns**: Don't use placeholder text like "Lorem ipsum", "NEXT-GEN AI 2.0", or fake statistics
2. **Be specific**: Use real, meaningful content that serves a purpose
3. **Remove decoration without purpose**: Every visual element should serve a clear function
4. **Focus on honesty**: Represent what the system actually does, not aspirational features
5. **Liveliness**: Ensure the UI feels alive and responsive, not sterile

See `DESIGN.md` for our specific design direction that works with anti-slop.

## Pull Request Process

1. Ensure your code lints and passes tests
2. Update documentation as needed
3. The PR description should clearly explain the problem and solution
4. Include screenshots for UI changes
5. Link to any related issues
6. Respond to reviewer feedback promptly
7. Once approved, squash and merge if appropriate

## Code Review Focus Areas

Reviewers will look for:
- Correctness and completeness
- Adherence to coding standards
- Accessibility considerations
- Performance implications
- Test coverage
- Documentation updates
- Anti-slop compliance

## Development Setup

See the main README.md for setup instructions. Key points:
- Node.js 18+
- MySQL/MariaDB with existing database
- npm run install:all to set up dependencies
- Separate terminals for server and client development

## Testing

- Write tests for new functionality
- Ensure existing tests pass
- Consider edge cases and error conditions
- Test accessibility when making UI changes
- Performance testing for significant changes

## Questions?

Feel free to ask for clarification in your pull request or issue comments. We're happy to help!