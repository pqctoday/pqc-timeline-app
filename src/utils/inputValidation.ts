/**
 * Input validation and sanitization utilities
 * Prevents injection attacks and ensures data integrity
 */

/**
 * Sanitize a string for use in OpenSSL subject DN fields
 * Removes or escapes characters that could break the DN format
 *
 * @param input - The input string to sanitize
 * @param maxLength - Maximum allowed length (default: 64)
 * @returns Sanitized string safe for DN fields
 */
export const sanitizeDNField = (input: string, maxLength: number = 64): string => {
    if (!input) return '';

    // Remove or escape special characters that could break DN formatting
    // DN fields should not contain: / = , + " \ < > ; newlines
    const sanitized = input
        .replace(/[\\/=,+"<>;]/g, '') // Remove DN special characters
        .replace(/[\r\n\t]/g, '')      // Remove control characters
        .trim()
        .slice(0, maxLength);          // Enforce max length

    return sanitized;
};

/**
 * Validate and sanitize country code (must be exactly 2 uppercase letters)
 *
 * @param input - The input string to validate
 * @returns Sanitized 2-letter country code or empty string
 */
export const sanitizeCountryCode = (input: string): string => {
    if (!input) return '';

    // Country code must be exactly 2 uppercase letters (ISO 3166-1 alpha-2)
    const cleaned = input.trim().toUpperCase().replace(/[^A-Z]/g, '');
    return cleaned.slice(0, 2);
};

/**
 * Validate common name (domain name or hostname)
 * Allows: alphanumerics, dots, hyphens, asterisks (for wildcards)
 *
 * @param input - The input string to validate
 * @param maxLength - Maximum allowed length (default: 64)
 * @returns Sanitized common name
 */
export const sanitizeCommonName = (input: string, maxLength: number = 64): string => {
    if (!input) return '';

    // Allow domain-safe characters: alphanumerics, dots, hyphens, asterisks
    const sanitized = input
        .replace(/[^a-zA-Z0-9.*\-]/g, '') // Keep only safe characters
        .trim()
        .slice(0, maxLength);

    return sanitized;
};

/**
 * Validate organization name
 *
 * @param input - The input string to validate
 * @param maxLength - Maximum allowed length (default: 64)
 * @returns Sanitized organization name
 */
export const sanitizeOrganization = (input: string, maxLength: number = 64): string => {
    return sanitizeDNField(input, maxLength);
};

/**
 * Validate file name to prevent path traversal
 *
 * @param input - The input string to validate
 * @returns Sanitized file name
 */
export const sanitizeFileName = (input: string): string => {
    if (!input) return '';

    // Remove path separators and special shell characters
    const sanitized = input
        .replace(/[\/\\]/g, '')           // Remove path separators
        .replace(/[;&|`$(){}[\]]/g, '')   // Remove shell special chars
        .replace(/\.\./g, '')             // Remove parent directory refs
        .trim()
        .slice(0, 255);                   // Max filename length

    return sanitized;
};

/**
 * Validate that a string contains only safe shell argument characters
 * Used for algorithm names, key sizes, etc.
 *
 * @param input - The input string to validate
 * @param allowedPattern - Regex pattern for allowed characters (default: alphanumeric + hyphen)
 * @returns True if input is safe, false otherwise
 */
export const isSafeArgument = (
    input: string,
    allowedPattern: RegExp = /^[a-zA-Z0-9\-]+$/
): boolean => {
    if (!input) return false;
    return allowedPattern.test(input);
};

/**
 * Validate algorithm name against a whitelist
 *
 * @param algo - Algorithm name to validate
 * @param allowedAlgorithms - Array of allowed algorithm names
 * @returns True if algorithm is in whitelist
 */
export const isValidAlgorithm = (
    algo: string,
    allowedAlgorithms: readonly string[]
): boolean => {
    return allowedAlgorithms.includes(algo);
};
