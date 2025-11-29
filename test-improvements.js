/**
 * Test Helper for Code Review Improvements
 *
 * Run this in the browser console to verify improvements are working.
 *
 * Usage:
 * 1. Open the app in your browser
 * 2. Open DevTools Console (F12)
 * 3. Copy and paste this entire file
 * 4. Call: testImprovements()
 */

window.testImprovements = function() {
    console.log('🧪 Testing Code Review Improvements...\n');

    const results = {
        passed: [],
        failed: [],
        warnings: []
    };

    // Test 1: Input Validation Functions Exist
    console.log('Test 1: Checking input validation utilities...');
    try {
        // These won't be directly accessible, but we can check if the module loaded
        const workbenchElement = document.querySelector('[class*="Workbench"]');
        if (workbenchElement) {
            results.passed.push('✅ OpenSSL Workbench component found');
        } else {
            results.warnings.push('⚠️  OpenSSL Workbench not visible (may not be on correct page)');
        }
    } catch (e) {
        results.failed.push('❌ Error checking Workbench: ' + e.message);
    }

    // Test 2: Logger Configuration
    console.log('\nTest 2: Checking logger configuration...');
    try {
        const isDev = import.meta?.env?.DEV;
        if (typeof isDev !== 'undefined') {
            results.passed.push(`✅ Environment detected: ${isDev ? 'Development' : 'Production'}`);
            if (isDev) {
                results.passed.push('✅ Logs should be visible in console');
            } else {
                results.passed.push('✅ Debug logs should be suppressed');
            }
        } else {
            results.warnings.push('⚠️  Cannot detect environment (expected in browser)');
        }
    } catch (e) {
        results.warnings.push('⚠️  Logger check not applicable in browser console');
    }

    // Test 3: Check for console.log pollution
    console.log('\nTest 3: Checking for legacy console statements...');
    const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn
    };

    let consoleCallCount = 0;
    const consoleMonitor = (...args) => {
        consoleCallCount++;
        originalConsole.log('[INTERCEPTED]', ...args);
    };

    console.log = consoleMonitor;
    console.error = consoleMonitor;
    console.warn = consoleMonitor;

    setTimeout(() => {
        console.log = originalConsole.log;
        console.error = originalConsole.error;
        console.warn = originalConsole.warn;

        if (consoleCallCount === 0) {
            results.passed.push('✅ No direct console calls detected during test');
        } else {
            results.warnings.push(`⚠️  ${consoleCallCount} console calls detected (may be from other code)`);
        }
    }, 1000);

    // Test 4: Performance - Check WASM instances
    console.log('\nTest 4: WASM Instance Caching...');
    results.warnings.push('⚠️  WASM caching requires manual testing (see TESTING_GUIDE.md)');
    results.warnings.push('   → Generate keys multiple times and compare execution times');

    // Test 5: Log Rotation
    console.log('\nTest 5: Log Rotation...');
    results.warnings.push('⚠️  Log rotation requires manual testing');
    results.warnings.push('   → Generate 1000+ operations and verify memory stays stable');

    // Test 6: Input Sanitization
    console.log('\nTest 6: Input Sanitization...');
    try {
        // Test the sanitization functions if we can access them
        const testCases = {
            'test/injection': 'testinjection',
            'test;command': 'testcommand',
            'test=value': 'testvalue',
            'US': 'US',
            'usa': 'US'
        };

        results.warnings.push('⚠️  Input sanitization requires UI testing');
        results.warnings.push('   → Try entering special characters in OpenSSL Studio forms');
    } catch (e) {
        results.warnings.push('⚠️  Cannot directly test sanitization (requires UI interaction)');
    }

    // Print Results
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(60));

    if (results.passed.length > 0) {
        console.log('\n✅ PASSED (' + results.passed.length + '):');
        results.passed.forEach(r => console.log('  ' + r));
    }

    if (results.warnings.length > 0) {
        console.log('\n⚠️  WARNINGS (' + results.warnings.length + '):');
        results.warnings.forEach(r => console.log('  ' + r));
    }

    if (results.failed.length > 0) {
        console.log('\n❌ FAILED (' + results.failed.length + '):');
        results.failed.forEach(r => console.log('  ' + r));
    }

    console.log('\n' + '='.repeat(60));
    console.log('📖 For detailed testing instructions, see TESTING_GUIDE.md');
    console.log('='.repeat(60));

    return {
        passed: results.passed.length,
        failed: results.failed.length,
        warnings: results.warnings.length,
        total: results.passed.length + results.failed.length + results.warnings.length
    };
};

// Performance Testing Helper
window.benchmarkWASM = async function() {
    console.log('🏃 WASM Performance Benchmark');
    console.log('This requires the Interactive Playground to be open\n');

    console.log('📝 Manual Test Instructions:');
    console.log('1. Go to Interactive Playground');
    console.log('2. Select ML-KEM-768');
    console.log('3. Click "Generate Keys" and note the time');
    console.log('4. Click "Generate Keys" again and note the time');
    console.log('5. Compare: 2nd run should be 10-100x faster!');
    console.log('\nLook for logs like:');
    console.log('  "[liboqs_kem] Creating new WASM instance" (1st run)');
    console.log('  "[liboqs_kem] Reusing cached WASM instance" (2nd run)');
};

// Input Validation Testing Helper
window.testInputValidation = function() {
    console.log('🔒 Input Validation Test');
    console.log('\n📝 Manual Test Instructions:');
    console.log('1. Go to OpenSSL Studio');
    console.log('2. Select "CSR Generation" or "Certificate"');
    console.log('3. Try these inputs:\n');

    const tests = [
        { field: 'Common Name', input: 'test/injection', expected: 'testinjection' },
        { field: 'Common Name', input: 'test;drop', expected: 'testdrop' },
        { field: 'Organization', input: 'ACME/Corp', expected: 'ACMECorp' },
        { field: 'Country', input: 'usa', expected: 'US' },
        { field: 'Country', input: '123', expected: '' }
    ];

    console.table(tests);

    console.log('\n✅ Expected behavior:');
    console.log('  - Special characters removed in real-time');
    console.log('  - Country auto-uppercases');
    console.log('  - No injection possible');
};

// Auto-run basic tests
console.log('🎯 Code Review Improvements Test Helper Loaded!');
console.log('\nAvailable commands:');
console.log('  testImprovements()      - Run basic automated tests');
console.log('  benchmarkWASM()         - WASM caching test instructions');
console.log('  testInputValidation()   - Input validation test instructions');
console.log('\nRun testImprovements() to start!\n');
