import { GoogleGenerativeAI } from "@google/generative-ai";
import { Violation } from "../types";
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get API key from environment
const apiKey = process.env.GEMINI_API_KEY;

// Initialize Gemini if API key is available
let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });
}

/**
 * Generate fix suggestions for accessibility violations
 * @param violation WCAG violation to fix
 * @returns Promise<FixSuggestion> Suggested fix
 */