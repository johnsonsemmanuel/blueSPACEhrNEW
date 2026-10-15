# BlueSPACE Design System

Directional guidance for the BlueSPACE Leave Management System. This document provides the design direction that complements the anti-slop filtering system.

## Core Principles

1. **Clarity over decoration** - Every element should serve a clear purpose
2. **Consistency with flexibility** - Follow patterns but allow for contextual variations
3. **Accessibility first** - All designs must meet WCAG 2.1 AA standards
4. **Mobile-responsive** - Design for mobile first, then enhance for larger screens
5. **Professional and trustworthy** - Reflect the reliability of a financial leave management system

## Color System

### Primary Palette
- **Brand Blue**: `#0000ff` (used for primary actions, links, active states)
  - Light variants: `#eef2ff` (50), `#dbeafe` (100), `#bfdbfe` (200), `#93c5fd` (300), `#60a5fa` (400), `#3b82f6` (500)
  - Dark variants: `#0000cc` (700), `#000099` (800), `#000066` (900)

- **Deep Gray**: `#0f172a` (used for text, backgrounds, borders)
  - Light variants: `#f1f5f9` (50), `#e2e8f0` (100), `#cbd5e1` (200), `#94a3b8` (300), `#64748b` (400), `#1e293b` (500)
  - Dark variants: `#0b1120` (700), `#070b16` (800), `#03050b` (900)

### Semantic Colors
- **Success**: Green variants (not currently defined - to be added as needed)
- **Warning**: Amber/Yellow variants (not currently defined - to be added as needed)
- **Error**: Red variants (not currently defined - to be added as needed)
- **Info**: Blue variants (use brand blue)

## Typography

### Font Family
- **Primary**: Manrope, system-ui, sans-serif
- **Font weights**: Use weights 200-800 as needed for hierarchy
- **Font smoothing**: antialiased for WebKit, grayscale for Mozilla

### Type Scale
- **Display**: 3xl (for main headers/logos)
- **Section headers**: xl to 2xl
- **Component headers**: lg to xl
- **Body text**: base to sm
- **Labels/captions**: xs to sm
- **Helper text**: xs

### Line Height & Letter Spacing
- Use default Tailwind line heights unless otherwise specified
- Labels: tracking-wider (letter spacing)
- Body text: default spacing

## Spacing System

### Base Unit
- 4px grid system (Tailwind default)
- All spacing values should be multiples of 4px

### Component Spacing
- **Form elements**: 
  - Label to input: 0.5rem (8px) - reduced from previous 1rem
  - Input height: 2.5rem (40px) - reduced for mobile friendliness
  - Input padding: 0.5rem (8px) horizontal, 0.25rem (4px) vertical
  
- **Cards**:
  - Padding: 1rem (16px) - reduced from previous 1.25rem
  - Header padding bottom: 0.75rem (12px)
  - Header margin bottom: 0.75rem (12px)
  
- **Stat Cards**:
  - Padding: 0.75rem (12px)
  - Gap between icon and text: 1rem (16px)
  
- **General spacing**: Use space-y-0.5 (8px) for form fields, space-y-4 (64px) for larger sections

## Component Guidelines

### Buttons
- **Primary**: Brand blue background, white text
- **Secondary**: Gray background, deep gray text
- **Outline**: White background, brand blue border, deep gray text
- **Danger**: Red background, white text
- **Ghost**: Text only, deep gray color
- **Sizes**: 
  - sm: 2rem height, 0.75rem horizontal padding, xs text
  - md: 2.25rem height, 1rem horizontal padding, sm text (default)
  - lg: 2.5rem height, 1.25rem horizontal padding, sm text
- **States**: 
  - Hover: 10% darker background
  - Active: 20% darker background or scale 0.97
  - Disabled: 50% opacity, no pointer events

### Form Elements
- **Inputs & Selects**:
  - Height: 2.5rem (40px)
  - Padding: 0.5rem (8px) horizontal, 0.25rem (4px) vertical
  - Font size: 0.875rem (14px) - sm
  - Border: 1px solid gray-200
  - Border radius: 0.375rem (6px)
  - Focus: 2px ring brand-500, 1px ring offset
  - Disabled: opacity 50%, no cursor

- **Labels**:
  - Font size: 0.75rem (12px)
  - Font weight: 600 (semibold)
  - Text transform: uppercase
  - Letter spacing: wider
  - Margin bottom: 0.25rem (4px)
  - Color: brand-500

- **Helper text/errors**:
  - Font size: 0.75rem (12px) - xs
  - Error text color: red-500
  - Helper text color: gray-500

### Cards
- Background: white
- Border: 1px solid gray-100
- Border radius: 0.5rem (8px)
- Shadow: shadow-sm (small)
- Transition: all properties, 200ms duration, ease-out-expo timing
- Hover: shadow-md (medium shadow)
- Interactive cards: cursor-pointer on hover

### Layout
- **Container**: max-width with horizontal padding
- **Page padding**: 1.5rem (24px) on mobile, increasing to 3rem (48px) on desktop
- **Section spacing**: 2rem (32px) minimum between major sections
- **Grid system**: Use Tailwind's responsive grid with appropriate breakpoints

## Motion & Animation

### Duration Standards
- **Fast**: 150ms (for state changes like button presses)
- **Normal**: 200ms (for most transitions)
- **Slow**: 250ms (for entrance/exit animations)

### Easing
- **Primary**: ease-out-expo (cubic-bezier(0.23, 1, 0.32, 1))
- **Secondary**: ease-in-out-expo (cubic-bezier(0.77, 0, 0.175, 1))
- **Drawer**: ease-drawer (cubic-bezier(0.32, 0.72, 0, 1))

### Animation Types
- **Fade-in**: opacity + slight translateY
- **Scale-in**: opacity + scale transform
- **Slide-in**: translateX/Y
- **Spring**: for bouncy, natural movements (use sparingly)

## Accessibility Guidelines

### Color Contrast
- Text and background: minimum 4.5:1 ratio (AA)
- Large text: minimum 3:1 ratio
- UI components: minimum 3:1 ratio
- Text over images: ensure adequate contrast or use overlays

### Touch Targets
- Minimum size: 44x44px
- Recommended: 48x48px for frequently used controls
- Spacing between touch targets: minimum 8px

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Visible focus indicators: 2px solid brand-600 or 2px outline
- Logical tab order
- Skip navigation links for screen readers

### Screen Reader Support
- Semantic HTML (buttons, labels, landmarks)
- ARIA labels where native semantics insufficient
- Live regions for dynamic content
- Proper heading hierarchy (h1-h6)

### Motion Sensitivity
- Respect prefers-reduced-motion: reduce animations to essential
- Provide alternative ways to access information conveyed by motion

## Content Guidelines

### Language
- Clear, concise, action-oriented
- Avoid jargon unless defined
- Use sentence case for labels and helper text
- Use title case only for proper nouns and page titles
- Avoid exclamation marks unless absolutely necessary

### Form Labels
- Always visible, never rely solely on placeholders
- Be specific about expected format when needed
- Use sentence case

### Error Messages
- Be specific about what went wrong
- Provide guidance on how to fix it
- Avoid technical jargon
- Be polite and helpful

### Empty States
- Show when appropriate (no data, search results, etc.)
- Provide guidance on next steps
- Use illustration or icon when appropriate
- Keep text brief but helpful

## Implementation Notes

### Tailwind Usage
- Use @layer base, components, utilities for custom CSS
- Extend theme in tailwind.config.js for design tokens
- Use arbitrary values sparingly and document why
- Prefer existing utility classes over custom CSS when possible

### Component Architecture
- Follow atomic design principles when practical
- Components should be reusable and composable
- Separate concerns: presentation vs container components
- Use props for customization, not CSS overrides when possible

### Performance
- Lazy load non-critical components
- Optimize images (use next-gen formats, appropriate sizes)
- Minimize DOM depth
- Use requestAnimationFrame for visual updates
- Consider code splitting for large features

## Updates & Maintenance

This document should evolve with the system. When making changes:
1. Update this document to reflect new decisions
2. Add rationale for significant changes
3. Deprecate outdated patterns with clear migration paths
4. Ensure team consensus on major direction changes

## Relationship to Anti-Slop

This DESIGN.md provides the **direction** that anti-slop filters and applies. Anti-slop removes generic AI-generated slop; this document ensures what remains is purposeful, on-brand, and usable. Together, they create a system that is both filtered and directed.