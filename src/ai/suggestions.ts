import { GoogleGenerativeAI } from "@google/generative-ai";
import { Violation, FixSuggestion } from "../types";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Original comments and initialization preserved
dotenv.config();
const apiKey = process.env.GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

if (apiKey) {
    try {
        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });
        console.log('Gemini AI initialized');
    } catch (error) {
        console.error('Error initializing Gemini AI:', error);
    }
}

// Main function preserved with enhanced rule-based suggestions
export async function generateFixSuggestion(violation: Violation): Promise<FixSuggestion> {
    if (!model) {
        console.log('Gemini AI not available, using rule-based suggestion');
        return generateRuleBasedSuggestion(violation);
    }

    try {
        // Original prompt structure preserved
        const prompt = `
            As a web accessibility expert, I need a fix for this WCAG issue:
            Rule: ${violation.rule || ''}
            Description: ${violation.description || ''}

            HTML code with issue:
            ${violation.snippet || ''}

            Please provide a corrected version of the code and a brief explanation.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Original response processing logic preserved
        const codeMatch = response.match(/```(?:html)?\s*([\s\S]*?)\s*```/);
        const code = codeMatch ? codeMatch[1].trim() : '';

        const explanation = response
            .replace(/```(?:html)?\s*[\s\S]*?\s*```/g, '')
            .trim();

        return {
            code: code || 'Unable to generate specific code fix',
            description: 'AI-suggested fix',
            explanation: explanation || 'Fix the accessibility issue as suggested by the AI'
        };
    } catch (error) {
        console.error('Error generating fix suggestion with Gemini AI:', error);
        return generateRuleBasedSuggestion(violation);
    }
}

// Enhanced rule-based suggestions with original structure
function generateRuleBasedSuggestion(violation: Violation): FixSuggestion {
    const rule = violation.rule || '';
    
    // Original image alt rule with enhanced explanation
    if (rule.includes('img-alt')) {
      return {
        code: violation.snippet?.replace(/<img/i, '<img alt="Descriptive text"') || '',
        description: 'Add alt text to image',
        explanation: `Images need alternative text for screen readers. Example fix: ${violation.snippet?.replace(/<img/i, '<img alt="Description"')}`
      };
    }
    
    // Original contrast rule with dynamic ratio display
    if (rule.includes('contrast')) {
      return {
        code: '/* Increase color contrast to at least 4.5:1 ratio */',
        description: 'Increase color contrast',
        explanation: `Low contrast (${violation.issue?.match(/\d+\.?\d*/)?.[0] || 'unknown ratio'} detected). Use contrast checker tools.`
      };
    }

    // New label rule added
    if (rule.includes('label')) {
      return {
        code: '<label for="input-id">Descriptive label:</label>\n<input id="input-id">',
        description: 'Add form label association',
        explanation: 'Form elements require associated labels using for/id attributes'
      };
    }

    // New empty link rule added
    if (rule.includes('empty-link')) {
      return {
        code: violation.snippet?.replace(/<a\s+[^>]*>/, '$&Meaningful text') || '<a href="/">Meaningful link text</a>',
        description: 'Add link content',
        explanation: 'Anchor tags need discernible text content for screen readers'
      };
    }

    // Original fallback with enhanced context
    return {
      code: '',
      description: 'Fix needed',
      explanation: violation.help ? `${violation.help} Context: ${violation.snippet}` : `Address ${rule} issue in: ${violation.snippet}`
    };
}

// Original export preserved
export default {
    generateFixSuggestion
};