import axios from 'axios';
import * as cheerio from 'cheerio';
import yaml from 'js-yaml';
import { createLogger } from '../logger.js';

const logger = createLogger('DataActivities');

/**
 * Parse JSON data
 * @param {Object} params - Parse parameters
 * @param {string} params.data - JSON string to parse
 * @param {string} [params.path] - JSONPath expression for data extraction
 * @returns {Object} Parsed JSON data
 */
export async function parseJson(params) {
  logger.info('Parsing JSON data');
  
  try {
    let parsed;
    if (typeof params.data === 'string') {
      parsed = JSON.parse(params.data);
    } else {
      parsed = params.data;
    }

    // Apply JSONPath if provided
    if (params.path) {
      return extractJsonPath(parsed, params.path);
    }

    return { success: true, data: parsed };
  } catch (error) {
    logger.error('JSON parsing failed:', error.message);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Parse XML data
 * @param {Object} params - Parse parameters
 * @param {string} params.data - XML string to parse
 * @param {string} [params.selector] - CSS selector for data extraction
 * @returns {Object} Parsed XML data
 */
export async function parseXml(params) {
  logger.info('Parsing XML data');
  
  try {
    const $ = cheerio.load(params.data, { xmlMode: true });
    
    if (params.selector) {
      const selected = $(params.selector);
      const results = [];
      selected.each((_, element) => {
        results.push({
          text: $(element).text(),
          html: $(element).html(),
          attributes: element.attribs
        });
      });
      return { success: true, data: results };
    }

    // Return full parsed structure
    return {
      success: true,
      data: {
        text: $.text(),
        html: $.html(),
        root: $.root().get(0)?.tagName
      }
    };
  } catch (error) {
    logger.error('XML parsing failed:', error.message);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Parse HTML data
 * @param {Object} params - Parse parameters
 * @param {string} params.data - HTML string to parse
 * @param {string} [params.selector] - CSS selector for data extraction
 * @returns {Object} Parsed HTML data
 */
export async function parseHtml(params) {
  logger.info('Parsing HTML data');
  
  try {
    const $ = cheerio.load(params.data);
    
    if (params.selector) {
      const selected = $(params.selector);
      const results = [];
      selected.each((_, element) => {
        results.push({
          text: $(element).text(),
          html: $(element).html(),
          attributes: element.attribs
        });
      });
      return { success: true, data: results };
    }

    // Extract common elements
    return {
      success: true,
      data: {
        title: $('title').text(),
        headings: $('h1, h2, h3, h4, h5, h6').map((_, el) => $(el).text()).get(),
        links: $('a').map((_, el) => ({
          text: $(el).text(),
          href: $(el).attr('href')
        })).get(),
        text: $('body').text()
      }
    };
  } catch (error) {
    logger.error('HTML parsing failed:', error.message);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Parse YAML data
 * @param {Object} params - Parse parameters
 * @param {string} params.data - YAML string to parse
 * @returns {Object} Parsed YAML data
 */
export async function parseYaml(params) {
  logger.info('Parsing YAML data');
  
  try {
    const parsed = yaml.load(params.data);
    return { success: true, data: parsed };
  } catch (error) {
    logger.error('YAML parsing failed:', error.message);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Transform data using mapping rules
 * @param {Object} params - Transform parameters
 * @param {Object} params.data - Data to transform
 * @param {Object} params.mapping - Mapping rules
 * @returns {Object} Transformed data
 */
export async function transformData(params) {
  logger.info('Transforming data with mapping rules');
  
  try {
    const result = {};
    
    for (const [targetKey, mapping] of Object.entries(params.mapping)) {
      if (typeof mapping === 'string') {
        // Simple path mapping
        result[targetKey] = extractJsonPath(params.data, mapping);
      } else if (typeof mapping === 'object' && mapping.path) {
        // Complex mapping with transformations
        let value = extractJsonPath(params.data, mapping.path);
        
        // Apply transformations
        if (mapping.transform) {
          switch (mapping.transform.type) {
            case 'uppercase':
              value = String(value).toUpperCase();
              break;
            case 'lowercase':
              value = String(value).toLowerCase();
              break;
            case 'number':
              value = Number(value);
              break;
            case 'boolean':
              value = Boolean(value);
              break;
            case 'date':
              value = new Date(value).toISOString();
              break;
            case 'split':
              value = String(value).split(mapping.transform.delimiter || ',');
              break;
          }
        }
        
        result[targetKey] = value;
      }
    }

    return { success: true, data: result };
  } catch (error) {
    logger.error('Data transformation failed:', error.message);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Extract data using JSONPath-like expressions
 * @param {Object} data - Source data
 * @param {string} path - JSONPath expression
 * @returns {*} Extracted value
 */
function extractJsonPath(data, path) {
  if (!path || path === '$') return data;
  
  // Remove leading $. if present
  if (path.startsWith('$.')) {
    path = path.slice(2);
  }
  
  const parts = path.split('.');
  let current = data;
  
  for (const part of parts) {
    if (current == null) return null;
    
    // Handle array indices
    if (part.includes('[') && part.includes(']')) {
      const [key, indexStr] = part.split('[');
      const index = parseInt(indexStr.replace(']', ''));
      
      if (key) {
        current = current[key];
      }
      
      if (Array.isArray(current) && !isNaN(index)) {
        current = current[index];
      }
    } else {
      current = current[part];
    }
  }
  
  return current;
}