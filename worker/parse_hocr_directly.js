#!/usr/bin/env node
/**
 * Parse HOCR file directly without cibai library to extract x_entity mappings
 */

import * as cheerio from 'cheerio';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Parse HOCR file directly and create a mapping x_entity → concatenated original text.
 * 
 * @param {string} hocrFile - Path to the HOCR file
 * @returns {Object} Dictionary mapping entity names to their concatenated text
 */
function getEntitiesTextMappingFromHocr(hocrFile) {
    const content = readFileSync(hocrFile, 'utf-8');
    
    // Parse the HTML/XML content
    const $ = cheerio.load(content);
    
    // Find all word elements (spans with class ocrx_word)
    const wordElements = $('.ocrx_word');
    
    const mapping = {};
    
    wordElements.each((index, element) => {
        const $element = $(element);
        const title = $element.attr('title') || '';
        const text = $element.text().trim();
        
        // Parse the title attribute to find x_entity
        const xEntity = extractXEntityFromTitle(title);
        
        if (xEntity) {
            if (!mapping[xEntity]) {
                mapping[xEntity] = [];
            }
            mapping[xEntity].push(text);
        }
    });
    
    // Join the text parts for each entity
    const result = {};
    for (const [key, value] of Object.entries(mapping)) {
        result[key] = value.join(' ');
    }
    
    return result;
}

/**
 * Extract x_entity value from the title attribute.
 * 
 * Example title: "x_sensibility 1; bbox 414 176 526 200; x_entity first_name 0"
 * Should return: "first_name"
 * 
 * @param {string} title - The title attribute string
 * @returns {string|null} The entity name or null if not found
 */
function extractXEntityFromTitle(title) {
    if (!title.includes('x_entity')) {
        return null;
    }
    
    // Split by semicolon and find the x_entity part
    const parts = title.split(';');
    for (const part of parts) {
        const trimmedPart = part.trim();
        if (trimmedPart.startsWith('x_entity')) {
            // Extract just the entity name (everything after 'x_entity' but before any trailing number/space)
            const entityPart = trimmedPart.replace('x_entity', '').trim();
            // Take everything except the last token (which is usually a number)
            const tokens = entityPart.split(/\s+/);
            if (tokens.length > 0) {
                return tokens.length === 1 ? tokens[0] : tokens.slice(0, -1).join(' ');
            }
        }
    }
    
    return null;
}

/**
 * Check if the HOCR file has any x_entity annotations.
 * 
 * @param {string} hocrFile - Path to the HOCR file
 * @returns {boolean} True if any word has x_entity attribute, False otherwise
 */
function hasXEntityAnnotationInHocr(hocrFile) {
    const content = readFileSync(hocrFile, 'utf-8');
    
    // Simple check - just look for x_entity in the content
    return content.includes('x_entity');
}

/**
 * Main function
 */
function main() {
    const hocrFile = resolve('output.hocr');
    
    if (!existsSync(hocrFile)) {
        console.log(`Error: ${hocrFile} not found!`);
        return;
    }
    
    console.log(`Parsing HOCR file: ${hocrFile}`);
    
    // Check if file has x_entity annotations
    const hasEntities = hasXEntityAnnotationInHocr(hocrFile);
    console.log(`Has x_entity annotations: ${hasEntities}`);
    
    if (hasEntities) {
        // Get the entities text mapping
        const mapping = getEntitiesTextMappingFromHocr(hocrFile);
        
        console.log('\nEntity mappings found:');
        console.log('-'.repeat(40));
        for (const [entity, text] of Object.entries(mapping)) {
            console.log(`${entity}: ${text}`);
        }
        
        console.log(`\nTotal entities found: ${Object.keys(mapping).length}`);
        
        // Show some additional info about the entities
        console.log('\nDetailed entity information:');
        console.log('-'.repeat(40));
        
        const content = readFileSync(hocrFile, 'utf-8');
        const $ = cheerio.load(content);
        const wordElements = $('.ocrx_word');
        
        let entityCount = 0;
        wordElements.each((index, element) => {
            const $element = $(element);
            const title = $element.attr('title') || '';
            const text = $element.text().trim();
            const xEntity = extractXEntityFromTitle(title);
            
            if (xEntity) {
                entityCount++;
                console.log(`Word ${entityCount}: '${text}' -> entity: '${xEntity}'`);
            }
        });
    } else {
        console.log('No x_entity annotations found in the HOCR file.');
    }
}

// Run main function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

// Export functions for module usage
export { getEntitiesTextMappingFromHocr, extractXEntityFromTitle, hasXEntityAnnotationInHocr };