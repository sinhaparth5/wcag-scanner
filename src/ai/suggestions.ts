import { GoogleGenerativeAI } from "@google/generative-ai";
import { Violation, FixSuggestion } from "../types";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// Get API key from environment
const apiKey = process.env.GEMINI_API_KEY;

// Initialize Gemini if API key is available
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

/**
 * Generate fix suggestions for accessibility violations
 * @param violation WCAG violation to fix
 * @returns Promise<FixSuggestion> Suggested fix
 */
export async function generateFixSuggestion(violation: Violation): Promise<FixSuggestion> {
    // Ig Gemini is not available, use rule-based suggestion
    if (!model) {
        console.log('Gemini AI not available, using rule-based suggestion');
        return generateRuleBasedSuggestion(violation);
    }

    try {
        // Create prompt for Gemini
        const prompt = `
            As a web accessibility expert, I need a fix for this WCAG issue:
            Rule: ${violation.rule || ''}
            Description: ${violation.description || ''}

            HTML code with issue:
            ${violation.snippet || ''}

            Please provide a corrected version of the code and a brief explanation.
        `;

        // Generate content with Gemini
        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Extract code and explanation from response
        const codeMatch = response.match(/```(?:html)?\s*([\s\S]*?)\s*```/);
        const code = codeMatch ? codeMatch[1].trim() : '';

        // Remove code block for clean explanation
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

/**
 * Generate basic rule-based suggestion as fallback
 * @param violation WCAG violation
 * @returns FixSuggestion
 */
function generateRuleBasedSuggestion(violation: Violation): FixSuggestion {
    const rule = violation.rule || '';
    
    if (rule.includes('img-alt')) {
      return {
        code: violation.snippet?.replace(/<img/i, '<img alt="Descriptive text"') || '',
        description: 'Add alt text to image',
        explanation: 'Images need alternative text for screen readers'
      };
    }
    
    if (rule.includes('contrast')) {
      return {
        code: '/* Increase color contrast to at least 4.5:1 ratio */',
        description: 'Increase color contrast',
        explanation: 'Text needs sufficient contrast with its background'
      };
    }
    
    return {
      code: '',
      description: 'Fix needed',
      explanation: violation.help || 'Fix this issue to improve accessibility'
    };
  }
  
  export default {
    generateFixSuggestion
  };