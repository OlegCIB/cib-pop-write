/**
 * CIB Pop Write - Text Workflow JavaScript
 * Provides basic interactivity for the text workflow application
 */

// DOM Elements
const inputText = document.getElementById('input-text');
const pseudonymizedText = document.getElementById('pseudonymized-text');
const improvedText = document.getElementById('improved-text');
const finalText = document.getElementById('final-text');

// Global variable to store entity mappings from HOCR processing
let storedEntityMappings = {};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeWorkflow();
    setupEventListeners();
});

/**
 * Initialize the workflow with default states
 */
function initializeWorkflow() {
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
 * Handle input text changes (process text with HOCR backend)
 */
async function handleInputChange() {
    const text = inputText.value.trim();
    if (text && pseudonymizedText) {
        // Show loading state
        pseudonymizedText.value = 'Pseudonymisierung läuft...';
        addProcessingAnimation(pseudonymizedText);
        
        try {
            // Call HOCR processing endpoint
            const hocrResult = await processTextWithHocr(text);

            /*
            // Store entity mappings for later use in de-pseudonymization
            storedEntityMappings = hocrResult.entityMappings || {};
            
            // Create pseudonymized text by replacing entities with placeholders
            const pseudonymized = createPseudonymizedText(text, storedEntityMappings);
            */
            pseudonymizedText.value = hocrResult.pseudonymizedText || text;
            
        } catch (error) {
            console.error('HOCR processing failed:', error);
            // Fallback to simulation if API fails
            const pseudonymized = simulatePseudonymization(text);
            pseudonymizedText.value = pseudonymized;
            storedEntityMappings = {}; // Clear stored mappings on fallback
        }
        
        // Trigger visual feedback
        addProcessingAnimation(pseudonymizedText);
        
        // Manually trigger the next step in the cascade
        handlePseudonymizedChange();
    }
}

/**
 * Handle pseudonymized text changes (ChatGPT improvement via API)
 */
async function handlePseudonymizedChange() {
    const text = pseudonymizedText.value.trim();
    if (text && improvedText) {
        // Show loading state
        improvedText.value = 'ChatGPT verbessert den Text...';
        addProcessingAnimation(improvedText);
        
        try {
            // Call ChatGPT improvement API (no longer sending prompt from frontend)
            const improved = await improveTextWithChatGPT(text);
            improvedText.value = improved;
        } catch (error) {
            console.error('Text improvement failed:', error);
            improvedText.value = text + '\n\n[Fehler: ChatGPT Verbesserung nicht verfügbar]';
        }
        
        // Manually trigger the next step in the cascade
        handleImprovedChange();
    }
}

/**
 * Handle improved text changes (restore original entities using stored mappings)
 */
function handleImprovedChange() {
    const text = improvedText.value.trim();
    if (text && finalText) {
        // Use stored entity mappings to restore original values
        const final = restoreOriginalEntities(text, storedEntityMappings);
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
 * Process text using HOCR via Cloudflare Worker
 */
async function processTextWithHocr(text) {
    const workerUrl = getWorkerUrl();
    
    try {
        const response = await fetch(`${workerUrl}/hocr`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.entityMappings) {
            return data;
        } else {
            throw new Error('Invalid response from HOCR processing service');
        }
        
    } catch (error) {
        console.error('Error processing text with HOCR:', error);
        throw error;
    }
}

/**
 * Create pseudonymized text by replacing entities with placeholders
 */
function createPseudonymizedText(text, entityMappings) {
    let pseudonymized = text;
    
    // Replace actual entity values with generic placeholders
    for (const [entityType, entityValue] of Object.entries(entityMappings)) {
        if (entityValue && entityValue.trim()) {
            // Create a placeholder based on entity type
            let placeholder = `[${entityType.toUpperCase()}]`;
            
            // Use more specific placeholders for common entity types
            if (entityType.includes('name')) {
                placeholder = '[PERSON]';
            } else if (entityType.includes('number') || entityType.includes('id')) {
                placeholder = '[NUMMER]';
            } else if (entityType.includes('email')) {
                placeholder = '[EMAIL]';
            } else if (entityType.includes('address')) {
                placeholder = '[ADRESSE]';
            } else if (entityType.includes('phone')) {
                placeholder = '[TELEFON]';
            }
            
            // Replace all occurrences of the entity value with the placeholder
            const regex = new RegExp(escapeRegExp(entityValue), 'gi');
            pseudonymized = pseudonymized.replace(regex, placeholder);
        }
    }
    
    return pseudonymized;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Restore original entities using stored entity mappings
 */
function restoreOriginalEntities(text, entityMappings) {
    let restored = text;
    
    // If no entity mappings available, fall back to simulation
    if (!entityMappings || Object.keys(entityMappings).length === 0) {
        return simulateVibeTexting(text);
    }
    
    // Create reverse mapping from placeholders to original values
    const placeholderMap = {};
    
    for (const [entityType, entityValue] of Object.entries(entityMappings)) {
        if (entityValue && entityValue.trim()) {
            // Determine placeholder based on entity type
            let placeholder = `[${entityType.toUpperCase()}]`;
            
            // Use more specific placeholders for common entity types
            if (entityType.includes('name')) {
                placeholder = '[PERSON]';
            } else if (entityType.includes('number') || entityType.includes('id')) {
                placeholder = '[NUMMER]';
            } else if (entityType.includes('email')) {
                placeholder = '[EMAIL]';
            } else if (entityType.includes('address')) {
                placeholder = '[ADRESSE]';
            } else if (entityType.includes('phone')) {
                placeholder = '[TELEFON]';
            }
            
            placeholderMap[placeholder] = entityValue;
        }
    }
    
    // Replace placeholders with original values
    for (const [placeholder, originalValue] of Object.entries(placeholderMap)) {
        const regex = new RegExp(escapeRegExp(placeholder), 'gi');
        restored = restored.replace(regex, originalValue);
    }
    
    // Clean up any ChatGPT improvement annotations
    restored = restored.replace(/\[ChatGPT Verbesserung:[^\]]+\]/g, '');
    
    return restored;
}

/**
 * Improve text using ChatGPT via Cloudflare Worker
 */
async function improveTextWithChatGPT(text) {
    const workerUrl = getWorkerUrl();
    
    try {
        const response = await fetch(`${workerUrl}/improve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text
                // Note: Prompt is no longer sent from frontend - it's configured in the backend
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.improvedText) {
            return data.improvedText;
        } else {
            throw new Error('Invalid response from text improvement service');
        }
        
    } catch (error) {
        console.error('Error improving text:', error);
        // Fallback to simulation if API fails
        return simulateTextImprovement(text);
    }
}

/**
 * Simulate text improvement process (fallback)
 */
function simulateTextImprovement(text) {
    // Simple simulation - add some improvement indicators
    return text + '\n\n[ChatGPT Verbesserung: Text wurde für bessere Lesbarkeit optimiert (Simulation - API nicht verfügbar)]';
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

/**
 * Get the Cloudflare Worker URL from environment or default
 */
function getWorkerUrl() {
    // Try to get from meta tag or environment variable
    const metaTag = document.querySelector('meta[name="worker-url"]');
    if (metaTag) {
        return metaTag.getAttribute('content');
    }
    
    // Default to production worker URL (update this with your actual worker URL)
    return 'https://cib-pop-write-text-improver-prod.olegsk.workers.dev';
}

// Export functions for potential use in other scripts
window.CIBPopWrite = {
    simulatePseudonymization,
    processTextWithHocr,
    createPseudonymizedText,
    restoreOriginalEntities,
    improveTextWithChatGPT,
    simulateTextImprovement,
    simulateVibeTexting,
    getWorkerUrl
};
