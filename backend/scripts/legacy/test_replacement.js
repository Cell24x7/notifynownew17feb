const replaceVariables = (text, variablesJson) => {
    if (!text || !variablesJson) return text;
    try {
        const vars = typeof variablesJson === 'string' ? JSON.parse(variablesJson) : variablesJson;
        let result = text;

        Object.keys(vars).forEach(key => {
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\[${escapedKey}\\]|\\{\\{${escapedKey}\\}\\}`, 'gi');
            result = result.replace(regex, vars[key]);
        });

        return result;
    } catch (err) {
        return text;
    }
};

const testCases = [
    {
        text: "Dear [Name], your balance is [Amount].",
        vars: { "Name": "Vikas", "Amount": "₹500" },
        expected: "Dear Vikas, your balance is ₹500."
    },
    {
        text: "Hello {{name}}, welcome to {{Brand}}.",
        vars: { "name": "Sandeep", "Brand": "NotifyNow" },
        expected: "Hello Sandeep, welcome to NotifyNow."
    },
    {
        text: "Using mixed [Name] and {{Brand}}.",
        vars: { "Name": "User", "Brand": "System" },
        expected: "Using mixed User and System."
    },
    {
        text: "Missing [Variable] should stay.",
        vars: { "Other": "Val" },
        expected: "Missing [Variable] should stay."
    }
];

console.log("🧪 Testing Variable Replacement Logic...");
let success = true;

testCases.forEach((tc, i) => {
    const result = replaceVariables(tc.text, tc.vars);
    if (result === tc.expected) {
        console.log(`✅ Test ${i + 1} Passed`);
    } else {
        console.error(`❌ Test ${i + 1} Failed!`);
        console.error(`   Expected: ${tc.expected}`);
        console.error(`   Got:      ${result}`);
        success = false;
    }
});

if (success) {
    console.log("\n✨ All replacement tests passed successfully!");
} else {
    process.exit(1);
}
