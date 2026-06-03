const assert = require('assert');

// Mock backend/config/db, backend/utils/smsService, and backend/services/walletService
// before requiring the handlers, or we can mock them inline since we want to test in isolation.
console.log('🧪 Starting OTP API logic verification...');

// We will construct dummy req, res objects and mock the database queries
// to verify the logic of handleSendOtp and handleVerifyOtp directly.

// Mock Database State
let dbOtpRecords = [];
let mockUser = { id: 1, email: 'demo@gmail.com' };

const mockQuery = async (sql, params) => {
    // console.log(`[SQL Mock] ${sql} | Params:`, params);
    const sqlUpper = sql.toUpperCase();
    
    if (sqlUpper.includes('INSERT INTO OTP_VERIFICATIONS')) {
        // [user_id, cleanMobile, otpCode, otpSessionId, expiry]
        const [user_id, mobile, otp_code, otp_session_id, expiry] = params;
        const newRecord = {
            id: dbOtpRecords.length + 1,
            user_id,
            mobile,
            otp_code,
            otp_session_id,
            expiry,
            status: 'pending',
            attempts: 0
        };
        dbOtpRecords.push(newRecord);
        return [{ insertId: newRecord.id }];
    }
    
    if (sqlUpper.includes('SELECT * FROM OTP_VERIFICATIONS')) {
        // Lookup by session or mobile
        if (params.length === 3) {
            // [user_id, cleanMobile, otpSessionId]
            const [user_id, mobile, otp_session_id] = params;
            const matches = dbOtpRecords.filter(r => r.user_id === user_id && r.mobile === mobile && r.otp_session_id === otp_session_id);
            return [matches];
        } else {
            // [user_id, cleanMobile]
            const [user_id, mobile] = params;
            const matches = dbOtpRecords.filter(r => r.user_id === user_id && r.mobile === mobile);
            return [matches];
        }
    }
    
    if (sqlUpper.includes('UPDATE OTP_VERIFICATIONS')) {
        if (sqlUpper.includes('STATUS = "EXPIRED"')) {
            const [id] = params;
            const rec = dbOtpRecords.find(r => r.id === id);
            if (rec) rec.status = 'expired';
        } else if (sqlUpper.includes('ATTEMPTS = ?')) {
            const [attempts, status, id] = params;
            const rec = dbOtpRecords.find(r => r.id === id);
            if (rec) {
                rec.attempts = attempts;
                rec.status = status;
            }
        } else if (sqlUpper.includes('STATUS = "VERIFIED"')) {
            const [id] = params;
            const rec = dbOtpRecords.find(r => r.id === id);
            if (rec) rec.status = 'verified';
        }
        return [{ affectedRows: 1 }];
    }

    if (sqlUpper.includes('SELECT NAME, BODY, METADATA FROM MESSAGE_TEMPLATES')) {
        return [[]]; // No templates found for mock
    }
    
    if (sqlUpper.includes('SELECT TEMP_ID, PE_ID, HASH_ID FROM DLT_TEMPLATES')) {
        return [[]];
    }

    if (sqlUpper.includes('INSERT INTO API_MESSAGE_LOGS')) {
        return [{ affectedRows: 1 }];
    }
    
    return [[]];
};

// Import Express Router and controller functions
// To avoid loading the actual DB pool, we inject the mock query function into the module
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(moduleName) {
    if (moduleName.endsWith('config/db')) {
        return { query: mockQuery };
    }
    if (moduleName.endsWith('utils/smsService')) {
        return {
            sendSMS: async (mobile, msg, options) => {
                // console.log(`[SMS Send Mock] To: ${mobile}, Msg: ${msg}`);
                return { success: true, messageId: 'msg_123456789' };
            }
        };
    }
    if (moduleName.endsWith('services/walletService')) {
        return {
            deductSingleMessageCredit: async (userId, channel, templateName) => {
                return { success: true, cost: 0.18 };
            }
        };
    }
    return originalRequire.apply(this, arguments);
};

// Load routes
const smsApiRouter = require('../routes/smsApiV1');

// Retrieve route handlers from the router stack
const routes = smsApiRouter.stack;
const handleSendOtp = routes.find(r => r.route && r.route.path === '/otp/send').route.stack[1].handle;
const handleVerifyOtp = routes.find(r => r.route && r.route.path === '/otp/verify').route.stack[1].handle;

// Restore original require
Module.prototype.require = originalRequire;

// Helper to run send OTP
async function runSendOtp(payload) {
    let responseData = null;
    let statusCode = 200;
    
    const req = {
        query: {},
        body: payload,
        user: mockUser
    };
    
    const res = {
        status: (code) => {
            statusCode = code;
            return res;
        },
        json: (data) => {
            responseData = data;
            return res;
        }
    };
    
    await handleSendOtp(req, res);
    return { statusCode, responseData };
}

// Helper to run verify OTP
async function runVerifyOtp(payload) {
    let responseData = null;
    let statusCode = 200;
    
    const req = {
        query: {},
        body: payload,
        user: mockUser
    };
    
    const res = {
        status: (code) => {
            statusCode = code;
            return res;
        },
        json: (data) => {
            responseData = data;
            return res;
        }
    };
    
    await handleVerifyOtp(req, res);
    return { statusCode, responseData };
}

async function testSuite() {
    try {
        // Test 1: Send OTP Validation Error (No Placeholder)
        console.log('Test 1: Send OTP validation for placeholder...');
        const res1 = await runSendOtp({
            to: '9876839965',
            msg: 'Hello customer, no placeholder here.'
        });
        assert.strictEqual(res1.statusCode, 400);
        assert.strictEqual(res1.responseData.success, false);
        assert.ok(res1.responseData.message.includes('must contain an OTP placeholder'));
        console.log('✅ Test 1 Passed.');

        // Test 2: Send OTP Success
        console.log('Test 2: Successful OTP send...');
        const res2 = await runSendOtp({
            to: '9876839965',
            msg: 'Dear Customer, Your OTP is %OTP%. CMT',
            templateId: '1007939764982063485'
        });
        assert.strictEqual(res2.statusCode, 200);
        assert.strictEqual(res2.responseData.success, true);
        assert.ok(res2.responseData.otp_session_id);
        const sessionId = res2.responseData.otp_session_id;
        console.log(`✅ Test 2 Passed. Session ID generated: ${sessionId}`);

        // Find the generated OTP code from our DB mock
        const createdRecord = dbOtpRecords.find(r => r.otp_session_id === sessionId);
        const generatedOtp = createdRecord.otp_code;
        console.log(`Mock Generated OTP Code: ${generatedOtp}`);

        // Test 3: Verify OTP - Wrong Code (First Attempt)
        console.log('Test 3: Verify with incorrect OTP code...');
        const res3 = await runVerifyOtp({
            mobile: '9876839965',
            otp: '000000', // incorrect
            otp_session_id: sessionId
        });
        assert.strictEqual(res3.statusCode, 400);
        assert.strictEqual(res3.responseData.success, false);
        assert.strictEqual(res3.responseData.message, 'Invalid OTP');
        assert.strictEqual(createdRecord.attempts, 1);
        assert.strictEqual(createdRecord.status, 'pending');
        console.log('✅ Test 3 Passed.');

        // Test 4: Verify OTP - Wrong Code (Second Attempt)
        console.log('Test 4: Verify with incorrect OTP code (2nd attempt)...');
        const res4 = await runVerifyOtp({
            mobile: '9876839965',
            otp: '111111', // incorrect
            otp_session_id: sessionId
        });
        assert.strictEqual(res4.statusCode, 400);
        assert.strictEqual(res4.responseData.attempts, undefined);
        assert.strictEqual(createdRecord.attempts, 2);
        assert.strictEqual(createdRecord.status, 'pending');
        console.log('✅ Test 4 Passed.');

        // Test 5: Verify OTP - Wrong Code (Third Attempt - Exceeded)
        console.log('Test 5: Verify with incorrect OTP code (3rd attempt - should lock/expire)...');
        const res5 = await runVerifyOtp({
            mobile: '9876839965',
            otp: '222222', // incorrect
            otp_session_id: sessionId
        });
        assert.strictEqual(res5.statusCode, 400);
        assert.strictEqual(res5.responseData.success, false);
        assert.ok(res5.responseData.message.includes('Max verification attempts exceeded'));
        assert.strictEqual(createdRecord.attempts, 3);
        assert.strictEqual(createdRecord.status, 'expired');
        console.log('✅ Test 5 Passed.');

        // Test 6: Verify after expired/locked
        console.log('Test 6: Verify correct code but record is already expired...');
        const res6 = await runVerifyOtp({
            mobile: '9876839965',
            otp: generatedOtp,
            otp_session_id: sessionId
        });
        assert.strictEqual(res6.statusCode, 400);
        assert.strictEqual(res6.responseData.success, false);
        assert.strictEqual(res6.responseData.message, 'OTP has expired');
        console.log('✅ Test 6 Passed.');

        // Test 7: Send another OTP for Success path
        console.log('Test 7: Send a new OTP...');
        const res7 = await runSendOtp({
            to: '9876839965',
            msg: 'Dear Customer, Your verification code is {#OTP#}. CMT',
            templateId: '1007939764982063485'
        });
        const newSessionId = res7.responseData.otp_session_id;
        const newRecord = dbOtpRecords.find(r => r.otp_session_id === newSessionId);
        const newOtp = newRecord.otp_code;
        console.log(`New Session ID: ${newSessionId}, OTP: ${newOtp}`);

        // Test 8: Verify successfully
        console.log('Test 8: Verify correct code...');
        const res8 = await runVerifyOtp({
            mobile: '9876839965',
            otp: newOtp,
            otp_session_id: newSessionId
        });
        assert.strictEqual(res8.statusCode, 200);
        assert.strictEqual(res8.responseData.success, true);
        assert.strictEqual(res8.responseData.message, 'OTP verified successfully');
        assert.strictEqual(newRecord.status, 'verified');
        console.log('✅ Test 8 Passed.');

        // Test 9: Verify already verified record
        console.log('Test 9: Attempt to verify already verified OTP...');
        const res9 = await runVerifyOtp({
            mobile: '9876839965',
            otp: newOtp,
            otp_session_id: newSessionId
        });
        assert.strictEqual(res9.statusCode, 400);
        assert.strictEqual(res9.responseData.success, false);
        assert.strictEqual(res9.responseData.message, 'OTP has already been verified');
        console.log('✅ Test 9 Passed.');

        console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The logic is 100% correct.');
        process.exit(0);

    } catch (e) {
        console.error('❌ Test failed with assertion error:', e);
        process.exit(1);
    }
}

testSuite();
