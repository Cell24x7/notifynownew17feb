const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function generateSample() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('DLT Templates');

    // Add headers matching the user's expected format
    worksheet.columns = [
        { header: 'SENDER (ENTITY ID)', key: 'sender', width: 20 },
        { header: 'TEMPLATE NAME', key: 'name', width: 25 },
        { header: 'TEMPLATE ID', key: 'id', width: 25 },
        { header: 'TEMPLATE TEXT (CONTENT)', key: 'text', width: 50 },
    ];

    // Add some dummy data
    worksheet.addRows([
        { sender: 'ZTISPL', name: 'Welcome_Msg', id: '1107175222970123721', text: 'Hello {#var}, welcome to our service. Your ID is {#var}.' },
        { sender: 'ZTISPL', name: 'OTP_Verification', id: '1107159887766554433', text: 'Your login OTP is {#var}. Do not share it with anyone.' },
        { sender: 'NOTIFY', name: 'Service_Update', id: '1107122334455667788', text: 'Dear Customer, your service {#var} has been updated. Status: {#var}' }
    ]);

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    const filePath = path.join(__dirname, 'dlt_templates_sample.xlsx');
    await workbook.xlsx.writeFile(filePath);
    console.log(`✓ Sample file generated at: ${filePath}`);
}

generateSample().catch(console.error);
