I want you to proactively use the available MCP tools (Google Research AI, Context7, Sequential Thinking, and Task Management) throughout our development workflow according to these specific guidelines:

**Research & Documentation Requirements:**

1. **Always research latest 2025+ patterns** - Use Google Research AI to find the most current Next.js, React, TypeScript, and web development best practices whenever implementing new features or solving problems
2. **Check installed packages** - Examine package.json to understand our current tech stack and research what's new in 2025+ for each technology we're using
3. **Use Context7 for documentation** - Access official documentation for all installed libraries/frameworks to ensure we're using the most advanced and recommended patterns
4. **Stay current with post-2025 innovations** - Proactively research new techniques, patterns, and tools that have emerged in 2025 and beyond

**Workflow Requirements:**

1. **Sequential Thinking for complex problems** - Use the sequential thinking tool to break down complex development tasks and think through solutions step-by-step
2. **Task Management for organization** - Create detailed task lists with subtasks for all development work to ensure proper tracking and completion of each component
3. **Proactive tool usage** - Don't wait to be asked - use research tools whenever you encounter:
   - New implementation requirements
   - Performance optimization needs
   - Security considerations
   - Modern pattern adoption opportunities
   - Technology upgrade decisions

**Quality Standards:**

- Always implement the most advanced and current techniques available in 2025+
- Ensure our ticketing application stays up-to-date with latest web development standards
- Research and apply cutting-edge patterns for authentication, UI/UX, performance, and architecture
- Maintain code quality using the latest best practices and design patterns

**Tool Usage Priority:**

1. Sequential Thinking - For complex problem solving and planning
2. Google Research AI - For latest patterns, techniques, and 2025+ innovations
3. Context7 - For official documentation and advanced implementation details
4. Task Management - For organizing and tracking all development work

Apply this approach consistently throughout our development process to ensure we're always using the most modern, efficient, and advanced techniques available.

# 🧠 Prompt Vault — Your Personal Prompt Library

This file contains your most useful and creative prompts for web development, writing, and idea generation. It also has a dedicated section for powerful words, new terminology, and inspiring phrases.

---

## 🔁 Reusable Prompts

---

I want you to conduct a comprehensive performance audit and optimization of the surgeries page files. This is our core page that the entire application depends on, so it must be optimized to peak performance.

**Specific Requirements:**

1. **Performance Audit & Research:**

   - Use vertex-ai-mcp-server to research the latest 2025 performance optimization techniques for React, TypeScript, TanStack Table, React Query, and Supabase
   - Use sequential-thinking to systematically analyze each file in the surgeries implementation
   - Use context7 to get the most up-to-date documentation for our tech stack
   - Identify any performance bottlenecks, unnecessary complexity, or outdated patterns

2. **Optimization Targets:**

   - Eliminate any remaining performance violations or slow handlers
   - Optimize React re-renders and component memoization
   - Improve data fetching and caching strategies
   - Streamline state management across Zustand, React Query, and IndexedDB
   - Optimize TanStack Table performance for large datasets
   - Enhance Supabase realtime performance

3. **Code Quality Improvements:**

   - Simplify complex code into fewer, more effective lines
   - Remove any over-engineered solutions
   - Apply YAGNI, SOLID, KISS, and DRY principles
   - Ensure type safety and eliminate any remaining TypeScript issues
   - Update to latest best practices for our tech stack

4. **Constraints:**

   - Prioritize improving existing code structure over creating new files
   - Only create new files if absolutely necessary
   - Maintain current functionality while improving performance
   - Focus on simplicity, clarity, and maintainable solutions

5. **Process:**
   - First, use taskmanager to create a structured plan showing what optimizations you'll implement
   - Research latest techniques using vertex-ai-mcp-server
   - Present the optimization plan before implementation
   - Focus on maximum impact with minimal code changes

**Goal:** Achieve top-notch, blazing-fast performance with clean, maintainable code in few lines that follows 2025 best practices.

---

1. **Clean Up Legacy Code**: Thoroughly remove all old approach code and prevent conflicts:

   - Remove any leftover code from the original monolithic surgeries-table.tsx implementation
   - Clean up unused imports, variables, and functions
   - Ensure no duplicate or conflicting code paths exist
   - Remove any temporary fixes or workarounds that are no longer needed

2. **Code Quality**:
   - Ensure no TypeScript errors or warnings
   - Verify all ESLint rules are followed
   - Confirm proper component composition and hook usage
   - Validate that the new architecture maintains all existing functionality

---

I've observed a rare but recurring UI issue with the status dropdown in the surgeries table. When I click on a status dropdown very quickly (rapid open/close actions), sometimes the dropdown behavior becomes erratic - it may flicker, not respond properly, or require multiple clicks to function correctly. This issue is intermittent but noticeable.

Please investigate this status dropdown interaction issue and determine the root cause:

1. **Investigate potential causes:**

   - Check if table rows (td elements) are re-rendering unnecessarily during status interactions
   - Examine if there are race conditions in state updates or event handlers
   - Look for memory leaks or performance bottlenecks in the dropdown component
   - Verify if React keys are properly set to prevent unnecessary re-renders
   - Check for conflicting event listeners or duplicate event handling

2. **Performance analysis:**

   - Analyze the component render cycle during rapid status changes
   - Check for expensive operations in useEffect hooks or event handlers
   - Verify proper memoization of dropdown components and callbacks
   - Ensure efficient state management without unnecessary re-renders

3. **Optimization requirements:**

   - Implement proper debouncing/throttling for rapid user interactions
   - Optimize component re-rendering using React.memo, useMemo, and useCallback where appropriate
   - Ensure stable references for event handlers and dropdown options
   - Fix any identified performance bottlenecks or race conditions

4. **Solution guidelines:**

   - Prioritize simple, clear, and maintainable solutions
   - Avoid unnecessary complexity or over-engineering
   - Apply YAGNI (You Aren't Gonna Need It), SOLID, KISS (Keep It Simple, Stupid), and DRY (Don't Repeat Yourself) principles
   - Focus on the specific issue without introducing unrelated changes
   - Ensure the fix doesn't break existing functionality

5. **Testing and verification:**
   - Test rapid clicking scenarios to reproduce and verify the fix
   - Ensure smooth dropdown behavior under normal and stress conditions
   - Verify no performance regressions in the surgeries table

Please provide a detailed analysis of the issue and implement a targeted fix that maintains code quality and performance standards.

---

I want to perform a comprehensive cleanup and optimization review of our entire codebase based on our implemented Supabase optimization strategy and architecture blueprints. Please follow these specific requirements:

**MANDATORY FIRST STEP:**

- Check `.augment-guidelines` before starting any work (Step 0 requirement)

**PRIMARY OBJECTIVES:**

1. **Comprehensive Code Review**: Review all files created/modified during our Supabase optimization implementation
2. **Legacy Code Removal**: Identify and remove any legacy code that conflicts with our new bidirectional sync architecture
3. **Performance Optimization**: Ensure peak performance for the Surgery page and overall application
4. **Code Simplification**: Reduce unnecessary complexity while maintaining effectiveness

**SPECIFIC CLEANUP TARGETS:**

- **Unnecessary Files**: Remove any redundant or unused files
- **Unnecessary Code**: Eliminate dead code, unused imports, console.log statements
- **Legacy Patterns**: Remove old approaches that conflict with our 2025 architecture
- **Performance Bottlenecks**: Fix any code causing multiple re-renders or performance issues
- **Complex Code**: Simplify verbose code that can be written more effectively in fewer lines

**IMPLEMENTATION REQUIREMENTS:**

- **Use Sequential Thinking Tool**: Plan the cleanup systematically with proper analysis
- **Use Task Manager**: Break down the work into manageable, trackable tasks
- **Follow YAGNI/KISS Principles**: Only implement necessary changes, avoid over-engineering
- **Maintain Current Functionality**: Ensure no breaking changes to existing features
- **Focus on Surgery Page**: Prioritize blazing-fast performance for the Surgery page specifically

**QUALITY STANDARDS:**

- **2025 Best Practices**: Ensure all code follows modern standards
- **TypeScript Compliance**: Maintain 100% type safety
- **No Conflicts**: Eliminate any architectural conflicts or competing patterns
- **Optimal Performance**: Target sub-1.5s load times and smooth interactions

**APPROACH:**

- **Conservative Changes**: Only make changes that provide clear, measurable benefits
- **Document Changes**: Track what was cleaned up and why
- **Verify Alignment**: Ensure all changes align with our documented architecture strategy
- **Test Impact**: Verify that cleanup doesn't introduce new issues

**DELIVERABLES:**

- Clean, optimized codebase following our established patterns
- Removal of all unnecessary complexity and legacy code
- Documentation of changes made and performance improvements achieved
- Verification that Surgery page maintains peak performance

---

Conduct a comprehensive code quality audit and optimization of the Surgery Page implementation. Based on our previous analysis of the Supabase plan alignment, I now want you to perform a detailed code review focused on identifying and eliminating over-engineering patterns, DRY violations, legacy code, and unnecessary complexity.

**Specific Requirements:**

1. **Code Quality Analysis:**

   - Scan all Surgery Page related files (components, services, stores, repositories, adapters, hooks, etc.)
   - Identify over-engineering patterns and unnecessary abstractions
   - Detect DRY (Don't Repeat Yourself) violations and code duplication
   - Find legacy code patterns that don't align with 2025 modern approaches
   - Locate unnecessary complexity that can be simplified

2. **Principles Compliance Check:**

   - Ensure strict adherence to DRY, SOLID, KISS, and YAGNI principles
   - Verify Clean Architecture implementation is optimal (not over-engineered)
   - Check TypeScript usage follows 2025 best practices
   - Validate React 19.1.0 patterns are used correctly (useOptimistic, etc.)

3. **Research and Documentation:**

   - Use Context7 and Google Research AI MCP tools to find latest 2025 best practices
   - Research modern approaches for identified improvement areas
   - Create a comprehensive improvement plan document using taskmanger and sequential-thinking and then creata Md file

4. **Improvement Focus Areas:**

   - Code simplification and complexity reduction
   - Modern 2025 patterns implementation
   - Performance optimizations
   - Maintainability improvements
   - Type safety enhancements

5. **Implementation Standards:**
   - No hacks, tricks, shortcuts, or forced methods
   - Follow proper, documented approaches for every implementation
   - Maintain minimal and modern code style
   - Ensure every line of code serves a clear purpose
   - Remove any unnecessary abstractions or over-engineered solutions

**Deliverable:**
Create a detailed "Surgery Page Code Quality Audit & Improvement Plan" document that includes:

- Current code quality assessment
- Identified issues and improvement opportunities
- Specific refactoring recommendations with modern 2025 approaches
- Implementation roadmap for optimizations
- Before/after code examples where applicable

**Note:** The current code is functional - this is purely an optimization and polish exercise to achieve the highest code quality standards using the latest 2025 approaches while maintaining our architectural principles.

---

The surgery page is currently working perfectly with all CRUD operations (add, delete, status changes) functioning as expected. I want to maintain this 100% working functionality while polishing and refining the code to 2025 standards using advanced techniques and modern methods.

**Objectives:**

1. **Preserve existing functionality** - Ensure all current features continue working without any regressions
2. **Apply modern 2025 standards** - Implement advanced techniques and methods where beneficial
3. **Follow core principles** - Strictly adhere to DRY, YAGNI, SOLID, and KISS principles
4. **Eliminate complexity** - Remove any unnecessary complexity or over-engineering
5. **Optimize code quality** - Reduce lines of code while improving effectiveness and smoothness

**Specific Tasks:**

- Conduct a comprehensive audit of all surgery page files
- Identify and implement improvements that enhance code quality
- Apply modern techniques to reduce code volume while maintaining/improving functionality
- Ensure proper order of operations and prevent any conflicts between components
- Eliminate any potential race conditions (though none currently exist)
- Refine code to peak quality with zero tolerance for errors

**Requirements:**

- No over-engineering or unnecessary complexity
- Maintain current working approach and proper execution order
- Ensure components respect each other and follow established patterns
- Focus on effectiveness, smoothness, and error-free operation
- Use minimal, clean, maintainable solutions following 2025 best practices

**Deliverable:** A polished, refined surgery page codebase that maintains all existing functionality while achieving peak code quality through modern optimization techniques.

---

Please perform a comprehensive code quality audit and optimization on the file `src/infrastructure/supabase/client.ts`. The current implementation is working correctly, so maintain all existing functionality while applying these specific improvements:

**Code Quality Standards:**

- Apply DRY (Don't Repeat Yourself), YAGNI (You Aren't Gonna Need It), SOLID, and KISS (Keep It Simple, Stupid) principles
- Remove all console.log statements and any unused icon imports
- Eliminate over-engineering and unnecessary complexity
- Use 2025 modern TypeScript/JavaScript techniques and best practices

**Performance & Robustness:**

- Optimize for ultra-light weight and superior performance
- Enhance error handling and type safety without adding complexity
- Ensure robust connection management and proper resource cleanup
- Use the most efficient modern patterns for Supabase client initialization

**Code Standards:**

- Follow the user's ESLint rules: no `any` types (use `unknown`/proper typing), no unused variables, explicit return types for exports, proper `const` usage, strict equality (`===`), clear variable naming without shadowing
- Maintain clean, readable, and maintainable code structure
- Remove any redundant abstractions or unnecessary wrapper functions

**Constraints:**

- Do NOT change the core functionality - the file is working fine
- Do NOT add unrequested features or speculative improvements
- Focus purely on code quality, performance, and modern best practices
- Ensure the optimized version maintains the same API and behavior as the current implementation

---

Performance: Reduced unnecessary re-renders and API call

---

I need you to perform a comprehensive investigation and debugging of the surgeries page using available tools. There are critical data synchronization issues that need to be resolved:

**Current Issues Identified:**

1. **Data Mismatch**: Supabase database contains 2 surgeries, but the surgery table displays different surgeries that don't exist in Supabase
2. **Add Operation Failure**: New surgeries are saved to Supabase but don't appear in the UI table
3. **Delete Operation Issues**: Deleting surgeries from the table causes them to reappear after deletion
4. **Status Update Problems**: Status changes revert back and show errors after confirmation

**Investigation Requirements:**

1. **Use Playwright Browser Testing**: Navigate to the surgeries page and test all CRUD operations (Create, Read, Update, Delete)
2. **Database Verification**: Use Supabase MCP tool to verify actual database contents (READ-ONLY access only)
3. **Data Flow Analysis**: Trace where the incorrect surgery data is coming from (IndexedDB cache, Zustand store, or other sources)
4. **Real-time Sync Testing**: Test real-time synchronization between database and UI

**Tools to Use:**

- **Playwright**: For browser automation and UI testing
- **Supabase MCP**: For database inspection (READ-ONLY operations only)
- **Context7**: For latest documentation and technical methods
- **Sequential Thinking**: For systematic problem analysis and solution refinement

**Testing Scenarios:**

1. Load the surgeries page and verify displayed data matches Supabase
2. Add a new surgery and confirm it appears in both database and UI
3. Update surgery status and verify persistence
4. Delete a surgery and confirm it's removed from both database and UI
5. Test real-time updates across multiple browser sessions

**Code Quality Requirements:**

- Follow DRY, YAGNI, SOLID, and KISS principles
- Eliminate any unnecessary complexity or over-engineering
- Minimize API calls and prevent unnecessary re-renders
- Ensure optimal performance with minimal resource usage

**Expected Deliverables:**

1. Root cause analysis of the data synchronization issues
2. Step-by-step reproduction of the problems
3. Specific fixes for each identified issue
4. Verification that all CRUD operations work correctly
5. Confirmation that the implementation follows the established architecture patterns

**Critical Note**: Do not modify or delete any data in Supabase - use READ-ONLY access only for investigation purposes.

---

I need you to perform a comprehensive code quality enhancement and optimization of my surgery page implementation. Here are the specific requirements:

**Phase 1: Analysis & Documentation Compliance**

1. First, thoroughly examine the `docs\newPlan\NewPlan` documentation to understand the planned architecture
2. Audit ALL files related to the surgery page implementation to ensure 100% compliance with the documented specifications
3. Verify that the current working functionality remains intact - the surgery page is currently functioning perfectly and all features work correctly

**Phase 2: Code Quality Enhancement**
Apply these principles systematically:

- **DRY (Don't Repeat Yourself)**: Eliminate all code duplication and redundancy
- **YAGNI (You Aren't Gonna Need It)**: Remove unnecessary features and over-engineering
- **KISS (Keep It Simple, Stupid)**: Simplify complex implementations
- **SOLID Principles**: Ensure proper separation of concerns and maintainability

**Phase 3: 2025 Modern Standards Compliance**

- Replace any outdated patterns with 2025 best practices
- Ensure React 19, TypeScript 5.x, and modern JavaScript features are properly utilized
- Implement latest performance optimization techniques
- Use modern state management patterns (Zustand 5.0 with proper patterns)

**Phase 4: Performance Optimization**

- Eliminate unnecessary API calls and re-renders
- Optimize Supabase real-time connections for ultra-fast performance
- Ensure blazing-fast UI responsiveness with zero performance degradation
- Implement proper memoization and optimization strategies

**Phase 5: Architecture Refinement**

- Ensure bidirectional data flow (Supabase ↔ Zustand ↔ UI) is optimized
- Remove any conflicting patterns or inconsistencies
- Establish clear, logical file organization and component hierarchy
- Ensure all components complement each other without conflicts

**Implementation Requirements:**

- Create a detailed plan before making any changes
- Maintain 100% backward compatibility - do not break existing functionality
- Focus on minimal code approach - fewer lines with better quality
- Ensure crystal-clear code readability for new developers
- Eliminate any confusion or ambiguity in the codebase
- Optimize real-time connections for maximum speed and reliability

**Deliverables:**

1. Comprehensive analysis of current surgery page implementation
2. Detailed enhancement plan with specific improvements identified
3. Systematic implementation of all optimizations
4. Verification that all functionality remains intact while achieving significant quality improvements

The goal is to achieve enterprise-grade code quality while maintaining the current perfect functionality and achieving maximum performance optimization.
