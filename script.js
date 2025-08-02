/**
 * CIB Pop Write - Text Workflow JavaScript
 * Provides basic interactivity for the text workflow application
 */

// DOM Elements
const inputText = document.getElementById('input-text');
const pseudonymizedText = document.getElementById('pseudonymized-text');
const improvedText = document.getElementById('improved-text');
const finalText = document.getElementById('final-text');
const currentPrompt = document.getElementById('current-prompt');

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeWorkflow();
    setupEventListeners();
});

/**
 * Initialize the workflow with default states
 */
function initializeWorkflow() {
    // Set default prompt
    const defaultPrompt = 'Verbessere den folgenden Text in Bezug auf Grammatik, Stil und Lesbarkeit, behalte aber den ursprünglichen Sinn und Ton bei:';
    if (currentPrompt) {
        currentPrompt.textContent = `Standardprompt: "${defaultPrompt}"`;
    }
    
    // Add placeholder animations on focus/blur
    addPlaceholderAnimations();
}

/**
 * Setup event listeners for text areas
 */
function setupEventListeners() {
    // Input text changes trigger pseudonymization simulation
    if (inputText) {
        inputText.addEventListener('input', debounce(handleInputChange, 500));
    }
    
    // Pseudonymized text changes trigger improvement simulation
    if (pseudonymizedText) {
        pseudonymizedText.addEventListener('input', debounce(handlePseudonymizedChange, 500));
    }
    
    // Improved text changes trigger vibe texting simulation
    if (improvedText) {
        improvedText.addEventListener('input', debounce(handleImprovedChange, 500));
    }
}

/**
 * Handle input text changes (simulate pseudonymization)
 */
function handleInputChange() {
    const text = inputText.value.trim();
    if (text && pseudonymizedText) {
        // Simulate pseudonymization process
        const pseudonymized = simulatePseudonymization(text);
        pseudonymizedText.value = pseudonymized;
        
        // Trigger visual feedback
        addProcessingAnimation(pseudonymizedText);
    }
}

/**
 * Handle pseudonymized text changes (simulate ChatGPT improvement)
 */
function handlePseudonymizedChange() {
    const text = pseudonymizedText.value.trim();
    if (text && improvedText) {
        // Simulate ChatGPT improvement
        const improved = simulateTextImprovement(text);
        improvedText.value = improved;
        
        // Trigger visual feedback
        addProcessingAnimation(improvedText);
    }
}

/**
 * Handle improved text changes (simulate vibe texting and de-pseudonymization)
 */
function handleImprovedChange() {
    const text = improvedText.value.trim();
    if (text && finalText) {
        // Simulate vibe texting and de-pseudonymization
        const final = simulateVibeTexting(text);
        finalText.value = final;
        
        // Trigger visual feedback
        addProcessingAnimation(finalText);
    }
}

/**
 * Simulate pseudonymization process
 */
function simulatePseudonymization(text) {
    // Simple simulation - replace names with placeholders
    return text
        .replace(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, '[PERSON]')
        .replace(/\b\d{4,}\b/g, '[NUMMER]')
        .replace(/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
}

/**
 * Simulate text improvement process
 */
function simulateTextImprovement(text) {
    // Simple simulation - add some improvement indicators
    return text + '\n\n[ChatGPT Verbesserung: Text wurde für bessere Lesbarkeit optimiert]';
}

/**
 * Simulate vibe texting and de-pseudonymization
 */
function simulateVibeTexting(text) {
    // Simple simulation - restore pseudonymized elements and add final polish
    return text
        .replace(/\[PERSON\]/g, 'Max Mustermann')
        .replace(/\[NUMMER\]/g, '12345')
        .replace(/\[EMAIL\]/g, 'beispiel@email.de')
        .replace(/\[ChatGPT Verbesserung:[^\]]+\]/g, '');
}

/**
 * Add processing animation to text area
 */
function addProcessingAnimation(element) {
    element.classList.add('processing');
    setTimeout(() => {
        element.classList.remove('processing');
    }, 1000);
}

/**
 * Add placeholder animations
 */
function addPlaceholderAnimations() {
    const textAreas = document.querySelectorAll('textarea');
    textAreas.forEach(textarea => {
        textarea.addEventListener('focus', function() {
            this.classList.add('focused');
        });
        
        textarea.addEventListener('blur', function() {
            this.classList.remove('focused');
        });
    });
}

/**
 * Debounce function to limit rapid function calls
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Utility function to check if element is in viewport
 */
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Export functions for potential use in other scripts
window.CIBPopWrite = {
    simulatePseudonymization,
    simulateTextImprovement,
    simulateVibeTexting
};