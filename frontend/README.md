# Group Trip Planner Frontend

React + TypeScript + Vite + Material-UI frontend for the group trip planner application.

## Features

- ⚛️ React 18 with TypeScript
- ⚡ Vite for fast development and builds
- 🎨 Material-UI (MUI) v5 with custom theme
- 🏗️ Component-based architecture
- 📱 Responsive design
- 🔧 ESLint for code quality

## Getting Started

1. Install dependencies:
   ```bash
   bun install
   ```

2. Start development server:
   ```bash
   bun dev
   ```

3. Build for production:
   ```bash
   bun build
   ```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── theme/         # MUI theme configuration
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
├── hooks/         # Custom React hooks
├── App.tsx        # Main App component
└── main.tsx       # Application entry point
```

## Testing

- **44 tests** with **100% pass rate** (44 pass, 0 fail)
- **Bun test** framework with native TypeScript support
- **React Testing Library** for component testing
- **JSDOM** environment for DOM simulation
- **Fast execution** (8.48 seconds for full test suite)

### Run Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test LoginForm.test.tsx
```

See [TESTING.md](./TESTING.md) for comprehensive testing documentation.

## Development

- The app runs on port 5173 by default
- Hot reload is enabled for development
- TypeScript checking happens during build
- ESLint rules are enforced for code quality