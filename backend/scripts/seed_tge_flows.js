
const path = require('path');
const fs = require('fs');

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
const envPath = path.join(__dirname, '..', envFile);

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log(`📝 Loaded environment from ${envFile}`);
} else {
  require('dotenv').config();
  console.log('📝 Loaded default .env');
}

const { query } = require('../config/db');

// The user ID where you want these flows to appear
// On local it was 34, on server it might be different. 
// We will look for 'notifynow@gmail.com' or use ID 34 as fallback
async function getTgeUserId() {
  try {
    const [rows] = await query("SELECT id FROM users WHERE email = 'notifynow@gmail.com' LIMIT 1");
    if (rows && rows.length > 0) return rows[0].id;
    return 34; // Fallback
  } catch (err) {
    return 34;
  }
}

const flows = [
  {
    name: "TGE - Hello Welcome",
    category: "Formal Message",
    keywords: ["hi", "hello", "hey", "start", "menu"],
    header_type: "Text",
    header_value: "The Great Escape Water Park",
    body: "Hello 👋\nWelcome to *The Great Escape Water Park* — your ultimate fun and masti zone 🌊🎢\n\nWe’re excited to help you plan a fun-filled day.\n\nPlease choose an option below:",
    footer_config: {
      footerType: "new_option",
      interactiveType: "Button",
      customButtons: [
        { label: "Know More", keyword: "know more" },
        { label: "Ticket Price", keyword: "ticket price" },
        { label: "Book Now", keyword: "book now" }
      ]
    },
    logic_config: { connectToTopic: "", getUserInput: false }
  },
  {
    name: "TGE - Know More",
    category: "Formal Message",
    keywords: ["know more", "details", "info", "information", "about park"],
    header_type: "Image",
    header_value: "https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?q=80&w=1000&auto=format&fit=crop",
    body: "Explore our thrilling rides, family pools, and amazing food! 🏊‍♂️🍔\n\nWe have attractions for all ages, from high-speed slides to relaxing lazy rivers.\n\nWhat would you like to check next?",
    footer_config: {
      footerType: "new_option",
      interactiveType: "Button",
      customButtons: [
        { label: "Ticket Price", keyword: "ticket price" },
        { label: "Book Now", keyword: "book now" },
        { label: "Park Timing", keyword: "timing" }
      ]
    },
    logic_config: { connectToTopic: "", getUserInput: false }
  },
  {
    name: "TGE - Ticket Price",
    category: "Formal Message",
    keywords: ["ticket", "price", "rate", "charges", "fees", "cost"],
    header_type: "Text",
    header_value: "Ticket Information",
    body: "🎟️ *Current Ticket Rates:*\n\n👨 Adults: ₹999\n👶 Children (below 4ft): ₹699\n👵 Senior Citizens: ₹799\n\n*Note:* Rates include access to all rides and pools. GST extra.",
    footer_config: {
      footerType: "new_option",
      interactiveType: "Button",
      customButtons: [
        { label: "Book Now", keyword: "book now" },
        { label: "Know More", keyword: "know more" },
        { label: "Talk to Support", keyword: "support" }
      ]
    },
    logic_config: { connectToTopic: "", getUserInput: false }
  },
  {
    name: "TGE - Book Now",
    category: "Formal Message",
    keywords: ["book", "booking", "reserve", "ticket booking", "entry booking"],
    header_type: "None",
    header_value: "",
    body: "Ready for the adventure? 🚀\n\nYou can book your tickets directly via our website or call us for group bookings (15+ people).\n\n📞 Call: +91 9876543210\n🌐 Web: www.greatescape.com",
    footer_config: {
      footerType: "new_option",
      interactiveType: "Button",
      customButtons: [
        { label: "Ticket Price", keyword: "ticket price" },
        { label: "Talk to Support", keyword: "support" }
      ]
    },
    logic_config: { connectToTopic: "", getUserInput: false }
  },
  {
    name: "TGE - Park Timing",
    category: "Formal Message",
    keywords: ["timing", "opening time", "closing time", "hours"],
    header_type: "None",
    header_value: "",
    body: "⏰ *Park Timings:*\n\nMonday - Sunday: 10:00 AM to 6:00 PM\n\n*Ticket counter closes at 4:30 PM.*\n\nPlease arrive early to enjoy all the rides!",
    footer_config: {
      footerType: "new_option",
      interactiveType: "Button",
      customButtons: [
        { label: "Location", keyword: "location" },
        { label: "Book Now", keyword: "book now" }
      ]
    },
    logic_config: { connectToTopic: "", getUserInput: false }
  },
  {
    name: "TGE - Location",
    category: "Formal Message",
    keywords: ["location", "address", "map", "how to reach"],
    header_type: "Text",
    header_value: "Our Location",
    body: "📍 *The Great Escape Water Park*\n\nParol - Bhiwandi Road, Off Vajreshwari Road, Virar (East), Maharashtra 401303.\n\n🗺️ *Google Maps:* https://goo.gl/maps/example",
    footer_config: {
      footerType: "new_option",
      interactiveType: "Button",
      customButtons: [
        { label: "Book Now", keyword: "book now" },
        { label: "Talk to Support", keyword: "support" }
      ]
    },
    logic_config: { connectToTopic: "", getUserInput: false }
  },
  {
    name: "TGE - Support",
    category: "Formal Message",
    keywords: ["support", "help", "talk to agent", "contact"],
    header_type: "None",
    header_value: "",
    body: "Our team is here to help you! 👋\n\nA human agent will be with you shortly to answer your questions. \n\nIn the meantime, you can explore other options below.",
    footer_config: {
      footerType: "new_option",
      interactiveType: "Button",
      customButtons: [
        { label: "Book Now", keyword: "book now" },
        { label: "Main Menu", keyword: "menu" }
      ]
    },
    logic_config: { connectToTopic: "", getUserInput: false }
  }
];

async function seedFlows() {
  try {
    const userId = await getTgeUserId();
    console.log("🚀 Starting flow injection for User ID:", userId);
    
    // Clean up existing TGE flows for this user
    await query("DELETE FROM chat_flows WHERE user_id = ? AND name LIKE 'TGE - %'", [userId]);
    console.log("🧹 Cleaned up old TGE flows.");

    for (const flow of flows) {
      const { name, category, keywords, header_type, header_value, body, footer_config, logic_config } = flow;
      
      await query(
        `INSERT INTO chat_flows (
          user_id, name, category, keywords, 
          header_type, header_value, body, 
          footer_config, logic_config, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          userId, name, category, JSON.stringify(keywords),
          header_type, header_value, body,
          JSON.stringify(footer_config), JSON.stringify(logic_config)
        ]
      );
      console.log(`✅ Inserted flow: ${name}`);
    }

    console.log("\n✨ All 7 flows injected successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error injecting flows:", error);
    process.exit(1);
  }
}

seedFlows();
