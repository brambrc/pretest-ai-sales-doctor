// In-memory data stores

/** @type {Map<string, object>} */
export const leads = new Map();

/** @type {Map<string, object>} */
export const calls = new Map();

/** @type {Map<string, object>} */
export const sessions = new Map();

/** @type {Map<string, object>} */
export const crmActivities = new Map();

// Mock external CRM stores (simulating Salesforce/HubSpot)
/** @type {Map<string, object>} */
export const mockCrmContacts = new Map();

/** @type {Map<string, object>} */
export const mockCrmActivities = new Map();

/** @type {Map<string, object>} */
export const users = new Map();
