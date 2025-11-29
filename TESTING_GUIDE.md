# Testing Guide for Code Review Improvements

## 🎯 Overview

This guide helps you verify the 6 major improvements made to the PQC Timeline app.

---

## ✅ Testing Checklist

### 1. **Input Validation & Sanitization** 🔐

**What Changed:** OpenSSL Studio now sanitizes all user inputs to prevent injection attacks.

**Test Scenarios:**

#### Test 1.1: Common Name Validation
```
Location: OpenSSL Studio → CSR/Certificate Generation
Field: Common Name (CN)

Test inputs:
✅ "example.com" → Should accept
✅ "*.example.com" → Should accept (wildcard)
✅ "sub.example.com" → Should accept
❌ "test/injection" → Should remove '/' (becomes "testinjection")
❌ "test;command" → Should remove ';' (becomes "testcommand")
❌ "test=value" → Should remove '=' (becomes "testvalue")

Expected: Special characters removed in real-time as you type
```

#### Test 1.2: Organization Validation
```
Field: Organization (O)

Test inputs:
✅ "My Company" → Should accept (but removes space? check behavior)
✅ "ACME Corp" → Should accept
❌ "ACME/Corp" → Should remove '/'
❌ "ACME;DROP TABLE" → Should remove ';'

Expected: DN special characters (/, =, +, ", \, <, >, ;) removed
```

#### Test 1.3: Country Code Validation
```
Field: Country (C)

Test inputs:
✅ "US" → Should accept
✅ "us" → Should auto-uppercase to "US"
✅ "gb" → Should auto-uppercase to "GB"
❌ "USA" → Should truncate to "US"
❌ "12" → Should remove numbers (becomes "")
❌ "U$" → Should remove special chars (becomes "U")

Expected: Exactly 2 uppercase letters, auto-sanitized
```

**Verification:**
1. Open OpenSSL Studio
2. Select "CSR Generation" or "Certificate Generation"
3. Try each test input above
4. Verify sanitization happens in real-time
5. Generate CSR/cert and check the subject DN is clean

---

### 2. **Production Logging Removed** 🔇

**What Changed:** Console logs disabled in production, new logging utility created.

**Test Scenarios:**

#### Test 2.1: Development Mode Logging
```
Environment: Development (npm run dev)

Steps:
1. Open browser DevTools Console
2. Generate ML-KEM keys in Interactive Playground
3. Look for logs like:
   ✅ "[timestamp] [Playground] Generating ML-KEM keys: ML-KEM-768"
   ✅ "[timestamp] [liboqs_kem] Creating new WASM instance for ML-KEM-768"

Expected: Logs visible in console with timestamps and context
```

#### Test 2.2: Production Build Logging
```
Environment: Production (npm run build && npm run preview)

Steps:
1. Build for production
2. Open browser DevTools Console
3. Generate ML-KEM keys
4. Look for logs

Expected: No cryptographic logs in console (security!)
```

**Verification Commands:**
```bash
# Development mode
npm run dev
# Check console - should see logs

# Production mode
npm run build
npm run preview
# Check console - should NOT see debug logs
```

---

### 3. **Log Rotation** 💾

**What Changed:** Logs capped at 1,000 entries to prevent memory bloat.

**Test Scenarios:**

#### Test 3.1: Normal Usage
```
Steps:
1. Go to Interactive Playground → Logs Tab
2. Generate 10 key pairs
3. Perform 20 operations (encrypt, sign, etc.)
4. Check log count

Expected: All logs visible, no performance issues
```

#### Test 3.2: Stress Test (Memory Leak Prevention)
```
Steps:
1. Create a script or manually generate 100+ operations
2. Monitor browser memory (DevTools → Performance → Memory)
3. Check Logs Tab

Expected:
- Maximum 1,000 log entries shown
- Oldest logs automatically removed
- Memory stays stable (no unbounded growth)
```

**Verification:**
```javascript
// In browser console after many operations:
// (This won't work directly, but conceptually)
// Check that logs array doesn't exceed 1000 entries
```

---

### 4. **Request Correlation IDs** 🔗

**What Changed:** Each OpenSSL command now has a unique request ID.

**Test Scenarios:**

#### Test 4.1: Single Command
```
Steps:
1. Open OpenSSL Studio
2. Open DevTools → Network or Console
3. Generate a key with OpenSSL
4. Look for request ID in logs/messages

Expected: Unique ID like "req_1733012345678_abc123xyz"
```

#### Test 4.2: Rapid Multiple Commands
```
Steps:
1. Open OpenSSL Studio
2. Queue multiple commands quickly:
   - Generate RSA-2048 key
   - Generate EC key
   - Generate ML-KEM-768 key
   (Click execute rapidly without waiting)
3. Check responses

Expected:
- Each command has unique requestId
- Responses correctly matched to requests
- No mixed outputs between commands
```

**Verification:**
Check browser DevTools Console for messages showing requestId correlation.

---

### 5. **WASM Instance Caching** ⚡ (Performance Critical!)

**What Changed:** WASM instances now cached and reused instead of created/destroyed per operation.

**Test Scenarios:**

#### Test 5.1: Performance Comparison

**First Operation (Cache Miss):**
```
Steps:
1. Refresh page (clear cache)
2. Go to Interactive Playground
3. Time: Generate ML-KEM-768 key pair
4. Note the execution time in logs

Expected: ~XXms (baseline, includes instance creation)
```

**Subsequent Operations (Cache Hit):**
```
Steps:
1. Without refreshing, generate another ML-KEM-768 key pair
2. Generate a third ML-KEM-768 key pair
3. Compare execution times

Expected:
- 2nd/3rd operations significantly faster (10-100x)
- Logs show "Reusing cached WASM instance" (dev mode)
```

#### Test 5.2: Multiple Algorithm Caching
```
Steps:
1. Generate ML-KEM-512 key pair (creates cache entry)
2. Generate ML-KEM-768 key pair (creates cache entry)
3. Generate ML-KEM-1024 key pair (creates cache entry)
4. Generate ML-KEM-512 again (uses cache)
5. Generate ML-DSA-44 key pair (creates cache entry)
6. Generate ML-DSA-44 again (uses cache)

Expected:
- First use of each algorithm: Creates instance
- Subsequent uses: Reuses cached instance
- Max 6 instances cached (3 KEM + 3 DSA)
- Console shows cache hits/misses (dev mode)
```

#### Test 5.3: Memory Efficiency
```
Steps:
1. Open DevTools → Performance → Memory
2. Take heap snapshot (baseline)
3. Generate 100 ML-KEM-768 operations
4. Take another heap snapshot
5. Compare

Expected:
- Old: Memory would grow significantly (100 instances created/destroyed)
- New: Memory stays relatively flat (1 instance reused 100 times)
```

**Performance Benchmark:**
```
# Manual timing test
1. First ML-KEM-768 keygen: Record time
2. Second ML-KEM-768 keygen: Record time
3. Calculate speedup ratio

Expected ratio: 10x - 100x faster for subsequent operations
```

---

### 6. **Deprecated Method Fixed** 🔧

**What Changed:** `String.substr()` → `String.substring()`

**Test Scenarios:**

#### Test 6.1: Hex to ASCII Conversion
```
Steps:
1. Go to Interactive Playground → Data Tab
2. Input mode: Hex
3. Enter hex string: "48656c6c6f" (encodes "Hello")
4. Switch to ASCII mode
5. Verify conversion works

Expected: "Hello" displayed correctly
```

#### Test 6.2: Browser Compatibility
```
Test in multiple browsers:
✅ Chrome/Edge (Chromium)
✅ Firefox
✅ Safari

Expected: No console warnings about deprecated methods
```

---

## 🧪 Automated Testing

### Run Existing Tests
```bash
# Type checking
npx tsc --noEmit
✅ Should pass (already verified)

# Unit tests (if dependencies installed)
npm test

# E2E tests
npm run test:e2e
```

---

## 🎯 Priority Testing Matrix

| Improvement | Priority | Time | Risk |
|-------------|----------|------|------|
| Input Validation | **HIGH** | 10 min | Security |
| WASM Caching | **HIGH** | 15 min | Performance |
| Request IDs | MEDIUM | 5 min | Reliability |
| Log Rotation | MEDIUM | 5 min | Memory |
| Production Logs | LOW | 10 min | Security |
| Deprecated Fix | LOW | 2 min | Compatibility |

**Recommended Testing Order:**
1. Input Validation (security critical)
2. WASM Caching (performance critical)
3. Request Correlation (reliability)
4. Log Rotation (quick check)
5. Production Logging (build test)
6. Deprecated Method (browser test)

---

## 🐛 Known Issues to Watch For

### Potential Edge Cases:

1. **Input Validation:**
   - Edge case: Empty strings after sanitization
   - Edge case: Unicode/emoji characters

2. **WASM Caching:**
   - Edge case: Algorithm switch (ML-KEM-512 → ML-KEM-768)
   - Edge case: Page refresh (cache cleared)

3. **Request IDs:**
   - Edge case: Very rapid consecutive commands
   - Edge case: Worker restart mid-operation

---

## ✅ Sign-Off Checklist

After testing, verify:

- [ ] Input sanitization prevents injection attempts
- [ ] Country code auto-uppercases and validates
- [ ] Common Name accepts domains, rejects special chars
- [ ] Dev console shows logs with timestamps
- [ ] Production build hides debug logs
- [ ] Logs cap at 1,000 entries max
- [ ] WASM instances reused (performance boost visible)
- [ ] Second keygen faster than first (cache working)
- [ ] Request IDs appear in worker messages
- [ ] Rapid commands don't cause race conditions
- [ ] Hex→ASCII conversion works (deprecated method fixed)
- [ ] No browser warnings about deprecated methods

---

## 🚀 Performance Benchmarks

Record your results:

```
Environment: [Browser version, OS]
Date: [Test date]

WASM Caching Performance:
- ML-KEM-768 1st keygen: ___ms
- ML-KEM-768 2nd keygen: ___ms
- Speedup ratio: ___x

Memory:
- Baseline heap: ___MB
- After 100 operations: ___MB
- Growth: ___MB

Input Validation:
- Real-time sanitization: ✅/❌
- Special chars removed: ✅/❌
```

---

## 📝 Bug Report Template

If you find issues:

```markdown
## Bug Report

**Improvement:** [Which of the 6 improvements]
**Severity:** [Critical/High/Medium/Low]
**Browser:** [Chrome 120, Firefox 115, etc.]

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**


**Actual Behavior:**


**Screenshots/Logs:**
[Paste console output or screenshots]
```

---

## 🎓 Testing Tips

1. **Use DevTools Extensively:**
   - Console: Check for logs and errors
   - Network: Monitor worker messages
   - Performance: Track memory usage
   - Sources: Verify production build strips logs

2. **Test Edge Cases:**
   - Very long inputs
   - Special characters
   - Rapid operations
   - Page refresh during operations

3. **Compare Before/After:**
   - If you have the old version, compare performance side-by-side
   - Use browser profiles to isolate tests

4. **Document Results:**
   - Save screenshots of successful tests
   - Record performance numbers for benchmarks

---

## 🤝 Need Help?

If you encounter issues during testing:
1. Check browser console for errors
2. Verify you're on the correct branch
3. Try in incognito/private mode (fresh state)
4. Test in different browsers
5. Report back with specific details

---

**Happy Testing! 🧪**
