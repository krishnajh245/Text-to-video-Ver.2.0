# Aurora Video AI - Design System Documentation

## 🎨 Design System Concept: "Nebula Minimal"

A futuristic, tech-focused design system that conveys **innovation, precision, and creative power** while maintaining **clean simplicity**. The aesthetic combines **dark luxury** with **neon accents** to create an interface that feels both professional and cutting-edge.

### 🎯 Design Philosophy
- **Purpose**: Convey the power and sophistication of AI video generation
- **Emotion**: Users should feel empowered, creative, and confident in the technology
- **Target**: Content creators, developers, and researchers who value both aesthetics and functionality
- **Personality**: Futuristic, reliable, innovative, and accessible

---

## 🎨 Color System

### Primary Colors
- **Aurora Blue**: `#00D4FF` (HEX) | `rgb(0, 212, 255)` | `hsl(192, 100%, 50%)`
  - Usage: Primary CTAs, active states, progress indicators
  - Emotion: Innovation, trust, technology

- **Deep Space**: `#0A0A0F` (HEX) | `rgb(10, 10, 15)` | `hsl(240, 20%, 5%)`
  - Usage: Primary background, main containers
  - Emotion: Sophistication, focus, depth

### Secondary Colors
- **Nebula Purple**: `#8B5CF6` (HEX) | `rgb(139, 92, 246)` | `hsl(252, 87%, 69%)`
  - Usage: Secondary actions, highlights, accent elements
  - Emotion: Creativity, magic, transformation

- **Cosmic Gray**: `#1A1A2E` (HEX) | `rgb(26, 26, 46)` | `hsl(240, 28%, 14%)`
  - Usage: Secondary backgrounds, cards, panels
  - Emotion: Stability, structure, balance

### Accent Colors
- **Quantum Green**: `#10B981` (HEX) | `rgb(16, 185, 129)` | `hsl(158, 84%, 40%)`
  - Usage: Success states, completion indicators
  - Emotion: Growth, success, completion

- **Plasma Red**: `#EF4444` (HEX) | `rgb(239, 68, 68)` | `hsl(0, 84%, 60%)`
  - Usage: Error states, warnings, destructive actions
  - Emotion: Alert, attention, caution

### Neutral Colors
- **Starlight**: `#F8FAFC` (HEX) | `rgb(248, 250, 252)` | `hsl(210, 40%, 98%)`
  - Usage: Primary text on dark backgrounds
  - Emotion: Clarity, readability, purity

- **Moon Dust**: `#94A3B8` (HEX) | `rgb(148, 163, 184)` | `hsl(215, 20%, 65%)`
  - Usage: Secondary text, placeholders
  - Emotion: Subtlety, support, hierarchy

- **Void**: `#000000` (HEX) | `rgb(0, 0, 0)` | `hsl(0, 0%, 0%)`
  - Usage: Pure black for maximum contrast
  - Emotion: Depth, focus, intensity

---

## ✍️ Typography

### Font Families
- **Primary**: `Inter` - Modern, clean, highly readable
  - Usage: All UI text, headings, body text
  - Personality: Professional, approachable, tech-forward

- **Secondary**: `JetBrains Mono` - Monospace for code/technical content
  - Usage: Code snippets, technical parameters, system info
  - Personality: Technical, precise, developer-friendly

### Font Weights & Roles
- **Light (300)**: Subtle labels, captions
- **Regular (400)**: Body text, descriptions
- **Medium (500)**: UI labels, navigation
- **Semibold (600)**: Subheadings, important labels
- **Bold (700)**: Main headings, emphasis
- **Extrabold (800)**: Hero text, major headings

### Font Sizes & Line Heights

#### Mobile (320px - 768px)
- **Hero**: 32px / 40px line-height
- **H1**: 28px / 36px line-height
- **H2**: 24px / 32px line-height
- **H3**: 20px / 28px line-height
- **Body**: 16px / 24px line-height
- **Small**: 14px / 20px line-height
- **Caption**: 12px / 16px line-height

#### Tablet (768px - 1024px)
- **Hero**: 40px / 48px line-height
- **H1**: 32px / 40px line-height
- **H2**: 28px / 36px line-height
- **H3**: 24px / 32px line-height
- **Body**: 18px / 28px line-height
- **Small**: 16px / 24px line-height
- **Caption**: 14px / 20px line-height

#### Desktop (1024px+)
- **Hero**: 48px / 56px line-height
- **H1**: 40px / 48px line-height
- **H2**: 32px / 40px line-height
- **H3**: 28px / 36px line-height
- **Body**: 18px / 28px line-height
- **Small**: 16px / 24px line-height
- **Caption**: 14px / 20px line-height

---

## 📏 Spacing & Layout

### Grid System
- **Container Max Width**: 1200px
- **Grid Columns**: 12 columns
- **Gutter**: 24px (desktop), 16px (tablet), 12px (mobile)
- **Breakpoints**: 
  - Mobile: 320px - 767px
  - Tablet: 768px - 1023px
  - Desktop: 1024px+

### Spacing Scale (8px base)
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **2xl**: 48px
- **3xl**: 64px
- **4xl**: 96px
- **5xl**: 128px

### Container Widths
- **Narrow**: 600px (forms, focused content)
- **Standard**: 800px (main content areas)
- **Wide**: 1200px (galleries, dashboards)
- **Full**: 100vw (hero sections, full-width elements)

---

## 🧱 Component Guidelines

### Buttons
- **Primary**: Aurora Blue background, white text, 8px border-radius
- **Secondary**: Transparent background, Aurora Blue border, Aurora Blue text
- **Ghost**: Transparent background, no border, Aurora Blue text
- **Destructive**: Plasma Red background, white text
- **Sizes**: sm (32px), md (40px), lg (48px)
- **States**: Hover (10% lighter), Active (20% darker), Disabled (50% opacity)

### Inputs
- **Background**: Cosmic Gray
- **Border**: 1px solid Moon Dust (default), Aurora Blue (focus)
- **Text**: Starlight
- **Placeholder**: Moon Dust at 70% opacity
- **Border-radius**: 8px
- **Padding**: 12px 16px
- **Focus**: Aurora Blue glow effect

### Cards
- **Background**: Cosmic Gray
- **Border**: 1px solid rgba(139, 92, 246, 0.1)
- **Border-radius**: 12px
- **Shadow**: 0 4px 20px rgba(0, 0, 0, 0.3)
- **Hover**: Subtle Aurora Blue glow
- **Padding**: 24px

### Modals
- **Background**: Deep Space with 90% opacity overlay
- **Content**: Cosmic Gray background
- **Border-radius**: 16px
- **Shadow**: 0 20px 60px rgba(0, 0, 0, 0.5)
- **Animation**: Fade in + scale up

### Navigation
- **Background**: Deep Space with subtle transparency
- **Height**: 64px
- **Border-bottom**: 1px solid rgba(139, 92, 246, 0.1)
- **Logo**: Aurora Blue
- **Links**: Moon Dust (default), Starlight (active)

---

## ✨ Animations & Visuals

### Motion Rules
- **Duration**: 200ms (micro), 300ms (standard), 500ms (complex)
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (smooth, natural)
- **Delay**: 50ms between staggered elements

### Microinteractions
- **Button Hover**: Scale 1.02, Aurora Blue glow
- **Card Hover**: Translate Y -2px, subtle glow
- **Input Focus**: Aurora Blue border glow
- **Loading**: Aurora Blue pulse animation
- **Success**: Quantum Green checkmark with scale animation

### Transitions
- **Page Transitions**: Fade in/out with 300ms duration
- **Modal**: Scale + fade with 200ms duration
- **Dropdown**: Slide down with 150ms duration
- **Progress**: Smooth width animation with 100ms duration

---

## 🚫 Do's and Don'ts

### Do's
- ✅ Use Aurora Blue for primary actions and focus states
- ✅ Maintain consistent 8px spacing scale
- ✅ Apply subtle glows and shadows for depth
- ✅ Use Inter font for all UI text
- ✅ Keep animations smooth and purposeful
- ✅ Ensure 4.5:1 contrast ratio for accessibility

### Don'ts
- ❌ Don't use more than 3 colors in a single component
- ❌ Don't exceed 500ms for any animation
- ❌ Don't use pure white text on light backgrounds
- ❌ Don't mix different border-radius values
- ❌ Don't use excessive shadows or glows
- ❌ Don't ignore focus states for keyboard navigation

---

## 🎯 Visual Hierarchy Strategy

### Primary User Action Flow
1. **Hero Section**: "Generate Video" CTA with Aurora Blue button
2. **Prompt Input**: Large, prominent text area with Aurora Blue focus
3. **Generate Button**: Primary Aurora Blue button with loading animation
4. **Progress Indicator**: Aurora Blue progress bar with real-time updates
5. **Video Result**: Centered video player with Aurora Blue accent

### Attention Flow
- **Aurora Blue**: Draws attention to primary actions
- **Nebula Purple**: Highlights secondary features and creativity
- **Quantum Green**: Confirms success and completion
- **Plasma Red**: Alerts to errors and warnings
- **Starlight**: Ensures readability and clarity

---

## 💡 Creative Interaction Patterns

### 1. Aurora Loading Animation
- **Pattern**: Aurora Blue particles that flow and pulse during video generation
- **Purpose**: Creates anticipation and visual interest during wait times
- **Implementation**: CSS animations with staggered particle movement

### 2. Nebula Card Hover
- **Pattern**: Cards that reveal subtle nebula-like gradients on hover
- **Purpose**: Adds depth and interactivity to the gallery
- **Implementation**: CSS gradients with smooth transitions

### 3. Quantum Progress Visualization
- **Pattern**: Progress bars that fill with quantum-like particle effects
- **Purpose**: Makes progress feel more engaging and futuristic
- **Implementation**: Animated background patterns with Aurora Blue particles

---

## 🌐 Accessibility Standards

### Color Contrast
- **Normal Text**: 4.5:1 minimum contrast ratio
- **Large Text**: 3:1 minimum contrast ratio
- **UI Components**: 3:1 minimum contrast ratio

### Focus Visibility
- **Focus Ring**: 2px Aurora Blue outline with 2px offset
- **Focus Indicators**: Visible on all interactive elements
- **Keyboard Navigation**: Full keyboard accessibility

### Screen Reader Support
- **Alt Text**: Descriptive alt text for all images
- **ARIA Labels**: Proper labeling for complex interactions
- **Semantic HTML**: Use proper heading hierarchy and landmarks

---

This design system ensures that Aurora Video AI feels **cohesive, distinctive, and non-generic** while maintaining the **futuristic, tech-focused aesthetic** that conveys innovation and creative power. Every element is designed to support the user's journey from idea to video creation.
