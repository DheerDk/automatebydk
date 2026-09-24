import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Zap,
  Plus,
  Power,
  Trash2,
  Clock,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowDown,
  Bot,
  MapPin,
  ShoppingBag,
  Tag,
  UserCheck,
  ChevronRight,
  Layers,
  FileText,
  Smartphone,
  Send,
  HelpCircle,
  Play,
  Flame,
  Check,
  GitBranch,
  Shield,
  UserX,
  Sliders,
  X,
  Split,
  Settings2,
  RotateCcw,
  Sparkle,
  PhoneCall,
  Info,
  Edit3,
  Globe,
  Utensils,
  Stethoscope,
  Building,
  GraduationCap,
  Scissors,
  Car,
  Briefcase,
  Image as ImageIcon,
  Copy,
  Dumbbell,
  Wrench,
  ExternalLink,
  Eye,
  CheckCircle,
  TrendingUp,
  AlertCircle,
  CornerDownRight,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { ImageUploader } from '../../components/common/ImageUploader';
import { DripSequenceManager } from '../../components/drip/DripSequenceManager';

interface FlowButton {
  id: string;
  title: string;
  type?: 'QUICK_REPLY' | 'URL' | 'CATALOG' | 'CALL';
  url?: string;
  phoneNumber?: string;
}

interface FlowBranchAction {
  type: 'SEND_MESSAGE' | 'SEND_CATALOG' | 'SEND_LOCATION' | 'SEND_WEBSITE' | 'CREATE_LEAD' | 'ADD_TAGS' | 'HUMAN_HANDOFF';
  text?: string;
  url?: string;
  mediaUrl?: string;
  address?: string;
  leadStatus?: string;
  tags?: string[];
  buttons?: FlowButton[];
}

interface FlowBranch {
  id: string;
  conditionType: 'NUMBER_CHOICE' | 'EQUALS' | 'CONTAINS';
  value: string; // e.g. "1", "price", "menu"
  title: string;
  mediaUrl?: string;
  buttons?: FlowButton[];
  actions: FlowBranchAction[];
}

interface VisualFlowData {
  triggerKeyword: string;
  triggerType: string;
  welcomeText: string;
  welcomeMediaUrl?: string;
  welcomeButtons?: FlowButton[];
  branches: FlowBranch[];
  defaultAction: {
    type: 'SEND_MESSAGE' | 'AI_FALLBACK' | 'HUMAN_HANDOFF';
    text: string;
    mediaUrl?: string;
    buttons?: FlowButton[];
  };
}

// 7 Complete Industry Templates
const INDUSTRY_TEMPLATES = [
  {
    id: 'retail',
    name: 'Retail & E-Commerce Store',
    icon: ShoppingBag,
    color: 'emerald',
    description: 'Automated trending catalog, discount offers, order tracking, and live sales manager handoff.',
    trigger: 'hi, hello, store, menu, shop, 1, 2, 3, 4, 5, 6',
    welcomeMediaUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80',
    welcome: `👋 *Welcome to our Store!*\n\nHow can we help you today? Reply with a number:\n\n1️⃣ 🛍️ *Browse Trending Products*\n2️⃣ 🔍 *Search Specific Item*\n3️⃣ 🏷️ *Exclusive VIP Discount Code*\n4️⃣ 📍 *Store Location & Timings*\n5️⃣ 🌐 *Visit Official Online Website*\n6️⃣ 🧑‍💼 *Talk to Store Manager*`,
    welcomeButtons: [
      { id: '1', title: '🛍️ Browse Products' },
      { id: '3', title: '🏷️ VIP Coupon' },
      { id: '6', title: '🧑‍💼 Store Manager' },
    ],
    branches: [
      {
        id: 'branch_1',
        value: '1',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 1: Browse Products',
        actions: [
          {
            type: 'SEND_CATALOG' as const,
            text: '🛍️ Here are our top featured products today! Reply with any product name to place your order.',
            leadStatus: 'INTERESTED',
            tags: ['Browsed-Catalog'],
          },
        ],
      },
      {
        id: 'branch_2',
        value: '2',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 2: Search Product',
        actions: [
          {
            type: 'SEND_MESSAGE' as const,
            text: '🔍 *Product Search:* Please type the item name or category (e.g. "T-Shirt", "Wireless Headphones", "Sneakers") and our AI catalog will find it instantly!',
            leadStatus: 'INTERESTED',
          },
        ],
      },
      {
        id: 'branch_3',
        value: '3',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 3: VIP Discount Promo',
        actions: [
          {
            type: 'SEND_MESSAGE' as const,
            mediaUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80',
            text: '🎉 *Special VIP Discount Activated!*\n\nUse Promo Code: *VIP2026* to get Flat 20% OFF on all purchases today.\n\nShop online now: https://automatebydk.pages.dev',
            leadStatus: 'CONTACTED',
            tags: ['VIP-Discount-Claimed'],
          },
        ],
      },
      {
        id: 'branch_4',
        value: '4',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 4: Store Location & Timings',
        actions: [
          {
            type: 'SEND_LOCATION' as const,
            address: 'Main Commercial Plaza, MG Road, Metro Pillar 45',
            text: '📍 *Visit Our Store:*\n🏢 Main Commercial Plaza, MG Road\n⏰ Hours: Mon-Sat (10:00 AM - 09:30 PM)\n🗺️ Maps: https://maps.google.com',
          },
        ],
      },
      {
        id: 'branch_5',
        value: '5',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 5: Online Website',
        actions: [
          {
            type: 'SEND_WEBSITE' as const,
            url: 'https://automatebydk.pages.dev',
            text: '🌐 *Official Store Website:*\n🔗 https://automatebydk.pages.dev\n\n✨ Browse our full range with live inventory & secure Razorpay payments!',
          },
        ],
      },
      {
        id: 'branch_6',
        value: '6',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 6: Human Support',
        actions: [
          {
            type: 'HUMAN_HANDOFF' as const,
            text: '🧑‍💼 A store manager has been notified on WhatsApp and will assist you directly within 2 minutes!',
            leadStatus: 'FOLLOW_UP',
            tags: ['Human-Assistance-Requested'],
          },
        ],
      },
    ],
  },
  {
    id: 'restaurant',
    name: 'Restaurant & Food Delivery',
    icon: Utensils,
    color: 'amber',
    description: 'Digital menu card flyer, table booking, today chef specials, and order tracking.',
    trigger: 'hi, menu, food, order, table, 1, 2, 3, 4',
    welcomeMediaUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
    welcome: `🍽️ *Welcome to Gourmet Bistro & Cafe!*\n\nHow may we serve you today? Reply with a number:\n\n1️⃣ 📋 *View Food & Drinks Menu*\n2️⃣ 🪑 *Book a Table for Dining*\n3️⃣ ⭐ *Today's Chef Specials & Deals*\n4️⃣ 🧑‍🍳 *Speak to Manager / Custom Catering*`,
    welcomeButtons: [
      { id: '1', title: '📋 View Menu' },
      { id: '2', title: '🪑 Book Table' },
      { id: '3', title: '⭐ Chef Specials' },
    ],
    branches: [
      {
        id: 'res_1',
        value: '1',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 1: Food Menu',
        actions: [
          {
            type: 'SEND_MESSAGE' as const,
            mediaUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
            text: '🍕 *Digital Food Menu:*\n\n1. Woodfire Margherita Pizza - ₹399\n2. Creamy Truffle Pasta - ₹449\n3. Gourmet Burger & Fries - ₹299\n4. Signature Chocolate Brownie - ₹199\n\n👉 Reply with your selection to order for home delivery!',
          },
        ],
      },
      {
        id: 'res_2',
        value: '2',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 2: Table Booking',
        actions: [
          {
            type: 'SEND_MESSAGE' as const,
            text: '🪑 *Table Reservation:*\nPlease reply with: *Date, Time & Number of Guests* (e.g. "Tonight 8 PM for 4 people") and we will confirm your table immediately!',
            leadStatus: 'INTERESTED',
            tags: ['Table-Booking-Enquiry'],
          },
        ],
      },
      {
        id: 'res_3',
        value: '3',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 3: Chef Specials',
        actions: [
          {
            type: 'SEND_MESSAGE' as const,
            text: '⭐ *Today’s Chef Specials (Flat 15% OFF):*\n🍲 Smoke-Infused Risotto\n🍹 Berry Mojito Cooler\n🍰 Blueberry Cheesecake\n\nUse Code: *CHEF15* upon ordering!',
          },
        ],
      },
      {
        id: 'res_4',
        value: '4',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 4: Speak to Manager',
        actions: [
          {
            type: 'HUMAN_HANDOFF' as const,
            text: '🧑‍🍳 Our restaurant manager has been alerted and will connect with you shortly!',
          },
        ],
      },
    ],
  },
  {
    id: 'clinic',
    name: 'Clinic & Doctor Healthcare',
    icon: Stethoscope,
    color: 'teal',
    description: 'Patient appointment scheduling, consultation fees, clinic timings, and emergency hotline.',
    trigger: 'hi, doctor, appointment, clinic, fees, 1, 2, 3, 4',
    welcomeMediaUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80',
    welcome: `🏥 *Welcome to CarePlus Health Clinic & Diagnostics!*\n\nHow can our medical team assist you today? Reply with a number:\n\n1️⃣ 🩺 *Book Doctor Consultation*\n2️⃣ 🧪 *Lab Tests & Health Packages*\n3️⃣ ⏰ *Clinic Timings & Location*\n4️⃣ 🚨 *Emergency Helpline / Reception*`,
    welcomeButtons: [
      { id: '1', title: '🩺 Book Doctor' },
      { id: '2', title: '🧪 Lab Tests' },
      { id: '4', title: '🚨 Emergency' },
    ],
    branches: [
      {
        id: 'cli_1',
        value: '1',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 1: Book Doctor',
        actions: [
          {
            type: 'SEND_MESSAGE' as const,
            text: '🩺 *Doctor Appointment:*\n\nAvailable Specialists:\n• Dr. Sharma (Physician & Cardiologist)\n• Dr. Priya (Dermatology & Skin)\n• Dr. Verma (Pediatrics & Child Care)\n\n👉 Reply with your preferred doctor and date!',
            leadStatus: 'NEW',
            tags: ['Doctor-Appointment'],
          },
        ],
      },
      {
        id: 'cli_2',
        value: '2',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 2: Lab Tests',
        actions: [
          {
            type: 'SEND_MESSAGE' as const,
            text: '🧪 *Full Body Health Checkup (₹999 only):*\nIncludes 65+ vital blood tests, lipid profile, thyroid & sugar. Free home sample collection available!',
          },
        ],
      },
      {
        id: 'cli_3',
        value: '3',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 3: Timings & Location',
        actions: [
          {
            type: 'SEND_LOCATION' as const,
            address: 'CarePlus Medical Tower, Sector 18',
            text: '📍 *CarePlus Clinic:*\n🏢 Medical Tower, Sector 18\n⏰ Timings: 08:00 AM - 09:00 PM (All 7 Days)\n🗺️ Maps: https://maps.google.com',
          },
        ],
      },
      {
        id: 'cli_4',
        value: '4',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 4: Emergency Desk',
        actions: [
          {
            type: 'HUMAN_HANDOFF' as const,
            text: '🚨 *Emergency Desk Alerted:* Please call our 24/7 hotline directly at +91 99880 11223 or wait while our duty nurse messages you back immediately.',
          },
        ],
      },
    ],
  },
  {
    id: 'realestate',
    name: 'Real Estate & Properties',
    icon: Building,
    color: 'blue',
    description: 'Luxury apartments showcase, pricing brochures, site visit booking, and broker callback.',
    trigger: 'hi, property, flat, villa, brochure, price, 1, 2, 3, 4',
    welcomeMediaUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
    welcome: `🏢 *Welcome to Prime Heritage Residences!*\n\nDiscover ultra-luxury 2 & 3 BHK homes with panoramic city views.\n\nReply with a number:\n\n1️⃣ 🏡 *View 2 & 3 BHK Floorplans & Photos*\n2️⃣ 💰 *Download Pricing & Payment Plans*\n3️⃣ 🚗 *Schedule Free VIP Site Visit*\n4️⃣ 🧑‍💼 *Connect with Senior Property Advisor*`,
    welcomeButtons: [
      { id: '1', title: '🏡 Floorplans' },
      { id: '2', title: '💰 Pricing' },
      { id: '3', title: '🚗 Book Visit' },
    ],
    branches: [
      {
        id: 're_1',
        value: '1',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 1: Floorplans & Photos',
        actions: [
          {
            type: 'SEND_MESSAGE' as const,
            mediaUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop&q=80',
            text: '🏡 *Prime Heritage Project Highlights:*\n• 2 BHK (1250 sq.ft) - From ₹85 Lakhs\n• 3 BHK (1850 sq.ft) - From ₹1.35 Cr\n• 40+ Lifestyle Amenities (Infinity Pool, Clubhouse, Tennis Court)',
            leadStatus: 'INTERESTED',
            tags: ['Real-Estate-Floorplan-Viewed'],
          },
        ],
      },
      {
        id: 're_2',
        value: '2',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 2: Pricing Brochure',
        actions: [
          {
            type: 'SEND_MESSAGE' as const,
            text: '💰 *Flexible Payment Plan:* 10% on Booking, 80% Construction Linked, 10% on Handover. Bank loans pre-approved with SBI & HDFC at 8.35%!',
          },
        ],
      },
      {
        id: 're_3',
        value: '3',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 3: Schedule Site Visit',
        actions: [
          {
            type: 'SEND_MESSAGE' as const,
            text: '🚗 *Complimentary Site Visit:* We provide free cab pickup and drop for site tours. Reply with your convenient date & time!',
            leadStatus: 'FOLLOW_UP',
            tags: ['Site-Visit-Requested'],
          },
        ],
      },
      {
        id: 're_4',
        value: '4',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 4: Property Advisor',
        actions: [
          {
            type: 'HUMAN_HANDOFF' as const,
            text: '🧑‍💼 A senior property consultant has been assigned to your profile and will call you right away.',
          },
        ],
      },
    ],
  },
  {
    id: 'salon',
    name: 'Salon, Spa & Beauty Care',
    icon: Scissors,
    color: 'purple',
    description: 'Hair, skincare, bridal packages, price list, and slot booking.',
    trigger: 'hi, salon, hair, makeup, spa, booking, 1, 2, 3, 4',
    welcomeMediaUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80',
    welcome: `✨ *Welcome to Glow & Glam Luxury Salon & Spa!*\n\nPamper yourself with premium beauty and haircare treatments.\n\nReply with a number:\n\n1️⃣ 💇‍♀️ *Haircut, Coloring & Keratin Services*\n2️⃣ 🧖‍♀️ *Spa, Facials & Skincare Packages*\n3️⃣ 📅 *Book an Appointment Slot*\n4️⃣ 🏷️ *Bridal & Seasonal Offers (Flat 25% OFF)*`,
    welcomeButtons: [
      { id: '1', title: '💇‍♀️ Hair Services' },
      { id: '2', title: '🧖‍♀️ Spa & Facials' },
      { id: '3', title: '📅 Book Slot' },
    ],
    branches: [
      {
        id: 'sal_1',
        value: '1',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 1: Hair Services',
        actions: [
          {
            type: 'SEND_MESSAGE' as const,
            text: '💇‍♀️ *Haircare Price List:*\n• Designer Cut & Blowdry: ₹599\n• Global Hair Coloring: ₹2,499\n• Keratin Smoothening: ₹3,999\n• Hair Spa Therapy: ₹999',
            tags: ['Hair-Enquiry'],
          },
        ],
      },
      {
        id: 'sal_2',
        value: '2',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 2: Spa & Skincare',
        actions: [
          {
            type: 'SEND_MESSAGE' as const,
            text: '🧖‍♀️ *Spa & Glow Facials:*\n• Hydra Facial Glow: ₹1,999\n• Aromatherapy Body Massage: ₹2,499\n• Organic Detox Body Scrub: ₹1,499',
          },
        ],
      },
      {
        id: 'sal_3',
        value: '3',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 3: Book Slot',
        actions: [
          {
            type: 'SEND_MESSAGE' as const,
            text: '📅 *Slot Booking:* Reply with your preferred service and time (e.g. "Haircut on Saturday at 4 PM") to lock your appointment!',
            leadStatus: 'NEW',
          },
        ],
      },
      {
        id: 'sal_4',
        value: '4',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 4: Bridal Offers',
        actions: [
          {
            type: 'SEND_MESSAGE' as const,
            text: '👰 *Bridal Couture Package (Flat 25% OFF):* Complete pre-bridal skincare, HD bridal makeup, hair styling & draping. Free consultation with senior stylist!',
          },
        ],
      },
    ],
  },
  {
    id: 'fitness',
    name: 'Gym & Fitness Center',
    icon: Dumbbell,
    color: 'orange',
    description: 'Membership plans, personal training, class schedule, and 1-day free trial pass.',
    trigger: 'hi, gym, fitness, trial, workout, 1, 2, 3, 4',
    welcomeMediaUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80',
    welcome: `💪 *Welcome to IronCore Fitness & Wellness Club!*\n\nTransform your body and reach peak fitness with our certified coaches.\n\nReply with a number:\n\n1️⃣ 🎟️ *Claim 1-Day Free VIP Gym Pass*\n2️⃣ 💳 *Membership Plans & Pricing*\n3️⃣ 🏋️ *Personal Training & Diet Consultation*\n4️⃣ 📍 *Club Timings & Equipment Tour*`,
    welcomeButtons: [
      { id: '1', title: '🎟️ Free VIP Pass' },
      { id: '2', title: '💳 Pricing Plans' },
      { id: '3', title: '🏋️ Personal Coach' },
    ],
    branches: [
      {
        id: 'fit_1',
        value: '1',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 1: Free Trial Pass',
        actions: [
          {
            type: 'SEND_MESSAGE' as const,
            mediaUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80',
            text: '🎟️ *Your 1-Day VIP Pass is Ready!*\n\nShow this WhatsApp message at our reception desk to get complimentary access to the gym floor, steam room & Zumba class!',
            leadStatus: 'CONTACTED',
            tags: ['Free-Trial-Pass'],
          },
        ],
      },
      {
        id: 'fit_2',
        value: '2',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 2: Membership Plans',
        actions: [
          {
            type: 'SEND_MESSAGE' as const,
            text: '💳 *Membership Packages:*\n• 1 Month: ₹2,499\n• 3 Months: ₹5,999 (Save ₹1,500)\n• 12 Months: ₹14,999 (Includes Free Nutrition Plan + 2 Personal Training Sessions)',
          },
        ],
      },
      {
        id: 'fit_3',
        value: '3',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 3: Personal Coach',
        actions: [
          {
            type: 'HUMAN_HANDOFF' as const,
            text: '🏋️ Our Head Strength Coach has been notified and will contact you to build your custom workout regimen.',
          },
        ],
      },
      {
        id: 'fit_4',
        value: '4',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 4: Timings',
        actions: [
          {
            type: 'SEND_LOCATION' as const,
            address: 'IronCore Club, 3rd Floor, Sports Complex',
            text: '⏰ *Gym Timings:* Mon-Sat: 05:30 AM - 10:30 PM | Sun: 07:00 AM - 02:00 PM',
          },
        ],
      },
    ],
  },
  {
    id: 'b2b',
    name: 'B2B Sales & Agency Lead Gen',
    icon: Briefcase,
    color: 'slate',
    description: 'Client qualification, portfolio demo, pricing packages, and meeting scheduler.',
    trigger: 'hi, agency, software, service, quote, demo, 1, 2, 3, 4',
    welcomeMediaUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80',
    welcome: `🚀 *Welcome to AutoMate Enterprise Solutions!*\n\nWe build custom AI automations & WhatsApp business engines to scale your revenue.\n\nReply with a number:\n\n1️⃣ 📊 *View Case Studies & Client Results*\n2️⃣ 💼 *Explore Service Packages & Pricing*\n3️⃣ 📅 *Schedule 1-on-1 Strategy Call*\n4️⃣ 🧑‍💼 *Chat with Tech Solutions Lead*`,
    welcomeButtons: [
      { id: '1', title: '📊 Case Studies' },
      { id: '2', title: '💼 Service Packages' },
      { id: '3', title: '📅 Schedule Call' },
    ],
    branches: [
      {
        id: 'b2b_1',
        value: '1',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 1: Case Studies',
        actions: [
          {
            type: 'SEND_MESSAGE' as const,
            text: '📊 *Client Success Highlights:*\n• Retail Brand: +320% WhatsApp sales in 60 days\n• Real Estate: 1,400+ qualified site visits booked automatically\n• Healthcare: 85% reduction in appointment no-shows',
            leadStatus: 'INTERESTED',
          },
        ],
      },
      {
        id: 'b2b_2',
        value: '2',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 2: Service Packages',
        actions: [
          {
            type: 'SEND_WEBSITE' as const,
            url: 'https://automatebydk.pages.dev',
            text: '💼 *Enterprise Automation Packages:* Starting from ₹1,499/mo with full Meta Graph API v21.0 integration, OpenAI GPT-4o, and unlimited conversations.',
          },
        ],
      },
      {
        id: 'b2b_3',
        value: '3',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 3: Schedule Strategy Call',
        actions: [
          {
            type: 'SEND_MESSAGE' as const,
            text: '📅 *Schedule Strategy Call:* Pick your convenient slot on our calendar: https://calendly.com/automatebydk',
            leadStatus: 'FOLLOW_UP',
            tags: ['Discovery-Call-Requested'],
          },
        ],
      },
      {
        id: 'b2b_4',
        value: '4',
        conditionType: 'NUMBER_CHOICE' as const,
        title: 'Option 4: Chat with Solutions Lead',
        actions: [
          {
            type: 'HUMAN_HANDOFF' as const,
            text: '🧑‍💼 A senior automation consultant is joining this chat right now.',
          },
        ],
      },
    ],
  },
];

export const AutomationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'studio' | 'drip' | 'recipes' | 'rules' | 'privacy'>('studio');
  const [rules, setRules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // STUDIO STATE
  const [flowName, setFlowName] = useState('Smart Store Welcome & Branching Menu');
  const [triggerKeyword, setTriggerKeyword] = useState('hi, hello, menu, start, 1, 2, 3, 4, 5, 6');
  const [welcomeText, setWelcomeText] = useState(INDUSTRY_TEMPLATES[0].welcome);
  const [welcomeMediaUrl, setWelcomeMediaUrl] = useState(INDUSTRY_TEMPLATES[0].welcomeMediaUrl || '');
  const [welcomeButtons, setWelcomeButtons] = useState<FlowButton[]>(INDUSTRY_TEMPLATES[0].welcomeButtons || []);
  const [branches, setBranches] = useState<FlowBranch[]>(INDUSTRY_TEMPLATES[0].branches);
  const [defaultAction, setDefaultAction] = useState({
    type: 'SEND_MESSAGE' as const,
    text: '🤖 *AI Assistant:* How else can I assist you with our catalog products, store location, or offers?',
    mediaUrl: '',
    buttons: [{ id: '1', title: '🛍️ Browse Products' }, { id: '6', title: '🧑‍💼 Human Support' }],
  });

  // ACTIVE NODE INSPECTOR DRAWER
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('node_welcome');
  const [isSavingFlow, setIsSavingFlow] = useState(false);
  const [flowSaveSuccess, setFlowSaveSuccess] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // PRIVACY SETTINGS
  const [onlyUnsavedContacts, setOnlyUnsavedContacts] = useState(false);
  const [excludedNumbers, setExcludedNumbers] = useState<string[]>([]);
  const [newExcludedInput, setNewExcludedInput] = useState('');
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

  // SIMULATOR STATE
  const [simMessages, setSimMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; mediaUrl?: string; time: string; buttons?: FlowButton[] }>>([
    {
      sender: 'bot',
      text: INDUSTRY_TEMPLATES[0].welcome,
      mediaUrl: INDUSTRY_TEMPLATES[0].welcomeMediaUrl,
      time: 'Just now',
      buttons: INDUSTRY_TEMPLATES[0].welcomeButtons,
    },
  ]);
  const [simInput, setSimInput] = useState('');
  const [activeSimPath, setActiveSimPath] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/automations');
      const payload = res?.data || res || [];
      setRules(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error('Failed to fetch automations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrivacySettings = async () => {
    try {
      const res: any = await api.get('/settings');
      const payload = res?.data || res;
      if (payload?.settings) {
        setOnlyUnsavedContacts(Boolean(payload.settings.onlyUnsavedContacts));
        if (payload.settings.excludedNumbers) {
          const arr = payload.settings.excludedNumbers
            .split(',')
            .map((n: string) => n.trim())
            .filter(Boolean);
          setExcludedNumbers(arr);
        }
      }
    } catch (err) {
      console.error('Failed to load privacy settings:', err);
    }
  };

  useEffect(() => {
    fetchRules();
    fetchPrivacySettings();
  }, []);

  const savePrivacySettings = async () => {
    setIsSavingPrivacy(true);
    try {
      await api.put('/settings/profile', {
        onlyUnsavedContacts,
        excludedNumbers: excludedNumbers.join(','),
      });
      showToast('Privacy & excluded numbers saved successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update privacy settings');
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  const addExcludedNumber = () => {
    const val = newExcludedInput.trim();
    if (!val) return;
    if (!excludedNumbers.includes(val)) {
      setExcludedNumbers([...excludedNumbers, val]);
    }
    setNewExcludedInput('');
  };

  const removeExcludedNumber = (num: string) => {
    setExcludedNumbers(excludedNumbers.filter((n) => n !== num));
  };

  // APPLY INDUSTRY TEMPLATE
  const applyIndustryTemplate = (tpl: (typeof INDUSTRY_TEMPLATES)[0]) => {
    setEditingRuleId(null);
    setFlowName(`${tpl.name} Workflow`);
    setTriggerKeyword(tpl.trigger);
    setWelcomeText(tpl.welcome);
    setWelcomeMediaUrl(tpl.welcomeMediaUrl || '');
    setWelcomeButtons(JSON.parse(JSON.stringify(tpl.welcomeButtons || [])));
    setBranches(JSON.parse(JSON.stringify(tpl.branches)));
    setSelectedNodeId('node_welcome');
    setActiveTab('studio');

    // Reset simulator
    setSimMessages([
      {
        sender: 'bot',
        text: tpl.welcome,
        mediaUrl: tpl.welcomeMediaUrl,
        time: 'Just now',
        buttons: tpl.welcomeButtons,
      },
    ]);
    showToast(`Applied "${tpl.name}" template to Workflow Studio!`);
  };

  // LOAD EXISTING RULE INTO STUDIO
  const loadRuleIntoStudio = (rule: any) => {
    setEditingRuleId(rule.id);
    setFlowName(rule.name);
    setTriggerKeyword(rule.conditions?.keyword || 'hi, hello, menu, start, 1..6');

    if (rule.flowData) {
      const fd = rule.flowData;
      setWelcomeText(fd.welcomeText || rule.description || 'Welcome to our store!');
      setWelcomeMediaUrl(fd.welcomeMediaUrl || '');
      setWelcomeButtons(fd.welcomeButtons || []);
      setBranches(fd.branches || []);
      if (fd.defaultAction) {
        setDefaultAction(fd.defaultAction);
      }
    }

    setActiveTab('studio');
    setSelectedNodeId('node_welcome');
    showToast(`Loaded "${rule.name}" in Workflow Studio`);
  };

  // SAVE WORKFLOW TO BACKEND
  const handleSaveFlow = async () => {
    if (!flowName.trim()) {
      alert('Please enter a workflow title.');
      return;
    }

    setIsSavingFlow(true);
    setFlowSaveSuccess(false);

    const flowData: VisualFlowData = {
      triggerKeyword: triggerKeyword.trim(),
      triggerType: 'KEYWORD_MATCH',
      welcomeText,
      welcomeMediaUrl,
      welcomeButtons,
      branches,
      defaultAction,
    };

    const payload = {
      name: flowName.trim(),
      description: `Interactive branching workflow with ${branches.length} decision paths.`,
      trigger: 'GREETING',
      conditions: {
        keyword: triggerKeyword.trim(),
      },
      actions: [
        {
          type: 'SEND_MESSAGE',
          payload: {
            text: welcomeText,
            mediaUrl: welcomeMediaUrl || undefined,
            buttons: welcomeButtons,
          },
        },
      ],
      flowData,
      isActive: true,
    };

    try {
      if (editingRuleId) {
        await api.put(`/automations/${editingRuleId}`, payload);
        showToast('Workflow updated and active 24/7 in cloud!');
      } else {
        const res: any = await api.post('/automations', payload);
        const created = res?.data || res;
        if (created?.id) {
          setEditingRuleId(created.id);
        }
        showToast('Workflow created and running 24/7 in cloud!');
      }
      setFlowSaveSuccess(true);
      fetchRules();
      setTimeout(() => setFlowSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to save workflow');
    } finally {
      setIsSavingFlow(false);
    }
  };

  // 1-CLICK TOGGLE RULE ON/OFF
  const handleToggleRule = async (ruleId: string) => {
    try {
      const res: any = await api.patch(`/automations/${ruleId}/toggle`);
      const updated = res?.data || res;
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, isActive: updated.isActive } : r))
      );
      showToast(`Workflow "${updated.name}" is now ${updated.isActive ? 'ACTIVE 24/7' : 'PAUSED'}`);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle rule');
    }
  };

  // DELETE RULE
  const handleDeleteRule = async (ruleId: string, ruleName: string) => {
    if (!confirm(`Are you sure you want to delete workflow "${ruleName}"?`)) return;
    try {
      await api.delete(`/automations/${ruleId}`);
      showToast(`Workflow "${ruleName}" deleted.`);
      fetchRules();
    } catch (err: any) {
      alert(err.message || 'Failed to delete rule');
    }
  };

  // ADD NEW BRANCH NODE
  const addBranch = () => {
    const nextNum = branches.length + 1;
    const newId = `branch_${Date.now()}`;
    const newBranch: FlowBranch = {
      id: newId,
      value: String(nextNum),
      conditionType: 'NUMBER_CHOICE',
      title: `Option ${nextNum}: Custom Service`,
      actions: [
        {
          type: 'SEND_MESSAGE',
          text: `✨ Thank you for choosing Option ${nextNum}! How can we assist you with this service?`,
        },
      ],
    };
    setBranches([...branches, newBranch]);
    setSelectedNodeId(newId);
    showToast(`Added Decision Branch #${nextNum}`);
  };

  // REMOVE BRANCH
  const removeBranch = (id: string) => {
    if (branches.length <= 1) {
      alert('You must maintain at least one branch option.');
      return;
    }
    const filtered = branches.filter((b) => b.id !== id);
    setBranches(filtered);
    if (selectedNodeId === id) {
      setSelectedNodeId('node_welcome');
    }
  };

  // SIMULATOR DISPATCH
  const handleSendSimMessage = (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : simInput).trim();
    if (!text) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text, time: now };
    const nextMessages = [...simMessages, userMsg];

    const cleanInput = text.toLowerCase();

    // Check if matching any branch
    let matchedBranch: FlowBranch | undefined = undefined;
    for (const b of branches) {
      const bVal = b.value.toLowerCase();
      const bTitle = b.title.toLowerCase();
      if (
        cleanInput === bVal ||
        cleanInput === `option ${bVal}` ||
        cleanInput === `${bVal}.` ||
        cleanInput === `#${bVal}` ||
        cleanInput === bTitle ||
        cleanInput.includes(bVal)
      ) {
        matchedBranch = b;
        break;
      }
    }

    if (matchedBranch) {
      setActiveSimPath(matchedBranch.id);
      setTimeout(() => {
        const action = matchedBranch?.actions[0];
        let replyContent = action?.text || `Response for ${matchedBranch?.title}`;
        let replyMedia = action?.mediaUrl;

        if (action?.type === 'SEND_CATALOG') {
          replyContent = `🛍️ *Trending Store Catalog:*\n\n1. Designer Jacket - ₹1,999\n2. Wireless Earbuds - ₹2,499\n3. Smart Sports Watch - ₹3,499\n\n👉 Reply with item name to order!`;
          replyMedia = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
        } else if (action?.type === 'SEND_LOCATION') {
          replyContent = `📍 *Store Location:*\n🏢 Main Plaza, MG Road\n⏰ Mon-Sat 10 AM - 9 PM\n🗺️ Maps: https://maps.google.com`;
        } else if (action?.type === 'HUMAN_HANDOFF') {
          replyContent = `🧑‍💼 A human store manager has been alerted on WhatsApp and is connecting now!`;
        }

        setSimMessages([
          ...nextMessages,
          {
            sender: 'bot',
            text: replyContent,
            mediaUrl: replyMedia,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            buttons: action?.buttons,
          },
        ]);
      }, 400);
    } else if (
      ['hi', 'hello', 'hey', 'start', 'menu', 'help'].some((k) => cleanInput.includes(k)) ||
      triggerKeyword.toLowerCase().includes(cleanInput)
    ) {
      setActiveSimPath('node_welcome');
      setTimeout(() => {
        setSimMessages([
          ...nextMessages,
          {
            sender: 'bot',
            text: welcomeText,
            mediaUrl: welcomeMediaUrl,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            buttons: welcomeButtons,
          },
        ]);
      }, 400);
    } else {
      setActiveSimPath('node_fallback');
      setTimeout(() => {
        setSimMessages([
          ...nextMessages,
          {
            sender: 'bot',
            text: defaultAction.text,
            mediaUrl: defaultAction.mediaUrl,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            buttons: defaultAction.buttons,
          },
        ]);
      }, 400);
    }

    setSimInput('');
  };

  const selectedBranch = branches.find((b) => b.id === selectedNodeId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-slate-100 font-sans">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 border border-emerald-500/50 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-700/80 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1.5">
            <Sparkles className="w-4 h-4" /> Visual Workflow Studio 2.0
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            WhatsApp Workflow Automation
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Build interactive branching customer journeys, attach promotional flyers, auto-reply 24/7 in the cloud, and route leads automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('recipes')}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 border transition cursor-pointer ${
              activeTab === 'recipes'
                ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>1-Click Industry Recipes</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2.5 rounded-2xl font-semibold text-xs flex items-center gap-2 border transition cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/25'
                : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Family &amp; Privacy Filter</span>
          </button>
        </div>
      </div>

      {/* 24/7 Background Persistence Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/60 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg backdrop-blur-md">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5 md:mt-0">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">24/7 Cloud Automation Engine: ACTIVE</h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                Persistent on Logout
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Your active automations and WhatsApp chatbot run permanently in the cloud. <strong className="text-emerald-300">Logging out of your account or closing your device will NEVER stop your automations.</strong> Flows only stop when you explicitly toggle them OFF below.
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Always-On Daemon
        </div>
      </div>

      {/* Studio Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('studio')}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'studio'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>Interactive Visual Studio</span>
        </button>

        <button
          onClick={() => setActiveTab('drip')}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'drip'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>⏱️ Abandoned Inquiry Drip Sequences</span>
        </button>

        <button
          onClick={() => setActiveTab('recipes')}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'recipes'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Industry Recipes ({INDUSTRY_TEMPLATES.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'rules'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Saved Workflows ({rules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('privacy')}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'privacy'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserX className="w-4 h-4" />
          <span>Excluded Numbers ({excludedNumbers.length})</span>
        </button>
      </div>

      {/* TAB 1: VISUAL WORKFLOW STUDIO */}
      {activeTab === 'studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Visual Pipeline Canvas */}
          <div className="lg:col-span-8 space-y-5">
            {/* Studio Action Toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Workflow Title:
                  </label>
                  <input
                    type="text"
                    value={flowName}
                    onChange={(e) => setFlowName(e.target.value)}
                    placeholder="e.g. VIP Retail Store Automation"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <button
                    onClick={handleSaveFlow}
                    disabled={isSavingFlow}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingFlow ? (
                      'Saving 24/7 Engine...'
                    ) : flowSaveSuccess ? (
                      <>
                        <Check className="w-4 h-4" /> Saved &amp; Live!
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 stroke-[3]" /> Save &amp; Activate (24/7)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Step 1: Trigger Node */}
              <div
                onClick={() => setSelectedNodeId('node_trigger')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  selectedNodeId === 'node_trigger'
                    ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                    <Zap className="w-4 h-4" /> 1. Trigger Event Node
                  </div>
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-bold border border-amber-500/20">
                    Incoming Message Match
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Keywords / Numbers: <span className="font-mono text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{triggerKeyword}</span>
                </p>
              </div>
            </div>

            {/* Connecting Visual Flow Connector */}
            <div className="flex justify-center -my-2">
              <div className="w-0.5 h-6 bg-emerald-500/40" />
            </div>

            {/* Step 2: Welcome Greeting & Entry Node */}
            <div
              onClick={() => setSelectedNodeId('node_welcome')}
              className={`p-5 rounded-3xl border transition-all cursor-pointer relative ${
                selectedNodeId === 'node_welcome'
                  ? 'bg-slate-900 border-emerald-500 shadow-xl shadow-emerald-500/10'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-lg'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <MessageSquare className="w-4 h-4" /> 2. Welcome Greeting &amp; Menu Node
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/20">
                  Instant Reply
                </span>
              </div>

              {welcomeMediaUrl && (
                <div className="h-28 rounded-xl overflow-hidden mb-3 border border-slate-800">
                  <img src={welcomeMediaUrl} alt="Flyer" className="w-full h-full object-cover" />
                </div>
              )}

              <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-sans">
                {welcomeText}
              </p>

              {welcomeButtons.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-slate-800">
                  {welcomeButtons.map((btn, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-slate-800 text-emerald-400 border border-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> {btn.title}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Connecting Visual Flow Connector */}
            <div className="flex justify-center -my-2">
              <div className="w-0.5 h-6 bg-emerald-500/40" />
            </div>

            {/* Step 3: Branching Decision Matrix */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Split className="w-4 h-4 text-emerald-400" /> 3. "If-This-Then-That" Decision Branches
                  </h3>
                  <p className="text-xs text-slate-400">
                    What happens when a customer replies with a choice number or keyword.
                  </p>
                </div>

                <button
                  onClick={addBranch}
                  className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Branch Option</span>
                </button>
              </div>

              {/* Branch Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {branches.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedNodeId(b.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      selectedNodeId === b.id
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                          {b.value}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                            {b.actions[0]?.type || 'SEND_MESSAGE'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeBranch(b.id);
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                            title="Delete branch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-white line-clamp-1">{b.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {b.actions[0]?.text || 'Executes custom automated action'}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                      <span>Matches: "{b.value}"</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        Configure <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Connecting Visual Flow Connector */}
            <div className="flex justify-center -my-2">
              <div className="w-0.5 h-6 bg-emerald-500/40" />
            </div>

            {/* Step 4: Unrecognized Fallback Node */}
            <div
              onClick={() => setSelectedNodeId('node_fallback')}
              className={`p-4 rounded-3xl border transition-all cursor-pointer ${
                selectedNodeId === 'node_fallback'
                  ? 'bg-slate-900 border-teal-500 shadow-xl shadow-teal-500/10'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider">
                  <Bot className="w-4 h-4" /> 4. Unhandled Fallback &amp; AI Assistant Node
                </div>
                <span className="text-[10px] bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded-full font-bold border border-teal-500/20">
                  OpenAI GPT-4o Fallback
                </span>
              </div>
              <p className="text-xs text-slate-300">
                If the customer types a custom query outside the menu choices, the AI assistant answers seamlessly using your store catalog &amp; FAQ knowledge base.
              </p>
            </div>
          </div>

          {/* Right Column: Dynamic Node Inspector + Interactive Simulator */}
          <div className="lg:col-span-4 space-y-6">
            {/* Dynamic Node Configuration Inspector */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <SlidersHorizontal className="w-4 h-4" /> Node Inspector
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {selectedNodeId === 'node_trigger'
                    ? 'Trigger Node'
                    : selectedNodeId === 'node_welcome'
                    ? 'Welcome Node'
                    : selectedNodeId === 'node_fallback'
                    ? 'Fallback Node'
                    : 'Decision Branch Node'}
                </span>
              </div>

              {/* INSPECTOR: TRIGGER NODE */}
              {selectedNodeId === 'node_trigger' && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Trigger Keywords / Numbers:
                  </label>
                  <textarea
                    rows={3}
                    value={triggerKeyword}
                    onChange={(e) => setTriggerKeyword(e.target.value)}
                    placeholder="hi, hello, menu, start, 1, 2, 3, 4, 5, 6"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400">
                    Separate multiple keywords with commas. When an incoming message matches any keyword, this workflow executes immediately.
                  </p>
                </div>
              )}

              {/* INSPECTOR: WELCOME NODE */}
              {selectedNodeId === 'node_welcome' && (
                <div className="space-y-3.5">
                  <ImageUploader
                    value={welcomeMediaUrl}
                    onChange={setWelcomeMediaUrl}
                    label="Welcome Flyer / Header Image"
                    description="Upload an image flyer from your computer or paste an image URL."
                  />

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        Welcome Greeting Text:
                      </label>
                      <button
                        onClick={() => setWelcomeText(`${welcomeText} {{name}}`)}
                        className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"
                      >
                        + Insert {'{{name}}'}
                      </button>
                    </div>
                    <textarea
                      rows={6}
                      value={welcomeText}
                      onChange={(e) => setWelcomeText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* INSPECTOR: BRANCH NODE */}
              {selectedBranch && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                        Match Choice:
                      </label>
                      <input
                        type="text"
                        value={selectedBranch.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBranches(
                            branches.map((b) => (b.id === selectedBranch.id ? { ...b, value: val } : b))
                          );
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        placeholder="e.g. 1"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                        Action Type:
                      </label>
                      <select
                        value={selectedBranch.actions[0]?.type || 'SEND_MESSAGE'}
                        onChange={(e: any) => {
                          const newType = e.target.value;
                          setBranches(
                            branches.map((b) =>
                              b.id === selectedBranch.id
                                ? {
                                    ...b,
                                    actions: [{ ...b.actions[0], type: newType }],
                                  }
                                : b
                            )
                          );
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="SEND_MESSAGE">💬 WhatsApp Message</option>
                        <option value="SEND_CATALOG">🛍️ Live Product Catalog</option>
                        <option value="SEND_LOCATION">📍 Store Location Pin</option>
                        <option value="SEND_WEBSITE">🌐 Store Website Link</option>
                        <option value="HUMAN_HANDOFF">🧑‍💼 Human Manager Handoff</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Branch Title:
                    </label>
                    <input
                      type="text"
                      value={selectedBranch.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBranches(
                          branches.map((b) => (b.id === selectedBranch.id ? { ...b, title: val } : b))
                        );
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Response Message:
                    </label>
                    <textarea
                      rows={4}
                      value={selectedBranch.actions[0]?.text || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBranches(
                          branches.map((b) =>
                            b.id === selectedBranch.id
                              ? {
                                  ...b,
                                  actions: [{ ...b.actions[0], text: val }],
                                }
                              : b
                          )
                        );
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <ImageUploader
                    value={selectedBranch.actions[0]?.mediaUrl || ''}
                    onChange={(url) => {
                      setBranches(
                        branches.map((b) =>
                          b.id === selectedBranch.id
                            ? {
                                ...b,
                                actions: [{ ...b.actions[0], mediaUrl: url }],
                              }
                            : b
                        )
                      );
                    }}
                    label="Attached Branch Flyer (Optional)"
                    description="Attach a promo flyer or product image for this quick reply."
                  />
                </div>
              )}

              {/* INSPECTOR: FALLBACK NODE */}
              {selectedNodeId === 'node_fallback' && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Fallback Message / AI Assistant Prompt:
                  </label>
                  <textarea
                    rows={4}
                    value={defaultAction.text}
                    onChange={(e) => setDefaultAction({ ...defaultAction, text: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400">
                    Grounded with your business profile, delivery policy, pricing, and FAQs.
                  </p>
                </div>
              )}
            </div>

            {/* INTERACTIVE WHATSAPP LIVE SIMULATOR */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white">Live Phone Simulator</h3>
                </div>
                <button
                  onClick={() => {
                    setSimMessages([
                      {
                        sender: 'bot',
                        text: welcomeText,
                        mediaUrl: welcomeMediaUrl,
                        time: 'Just now',
                        buttons: welcomeButtons,
                      },
                    ]);
                    setActiveSimPath(null);
                  }}
                  className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1"
                  title="Reset simulator"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>

              {/* WhatsApp Mockup Phone Box */}
              <div className="bg-[#0b141a] rounded-2xl border border-slate-800 overflow-hidden flex flex-col h-[400px]">
                {/* Phone Header */}
                <div className="bg-[#1f2c34] px-3.5 py-2.5 flex items-center justify-between border-b border-slate-800 text-white">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                      DK
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-none">AutoMate Business Bot</p>
                      <span className="text-[10px] text-emerald-400">🟢 Online 24/7</span>
                    </div>
                  </div>
                </div>

                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
                  {simMessages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-2.5 rounded-2xl shadow-xs space-y-1.5 ${
                          m.sender === 'user'
                            ? 'bg-[#005c4b] text-white rounded-tr-xs'
                            : 'bg-[#202c33] text-slate-100 rounded-tl-xs'
                        }`}
                      >
                        {m.mediaUrl && (
                          <div className="h-28 rounded-lg overflow-hidden bg-slate-900 border border-slate-800">
                            <img src={m.mediaUrl} alt="Flyer" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                        <span className="text-[9px] text-slate-400 block text-right">{m.time}</span>
                      </div>

                      {/* Bot Quick Buttons */}
                      {m.buttons && m.buttons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {m.buttons.map((btn, bIdx) => (
                            <button
                              key={bIdx}
                              onClick={() => handleSendSimMessage(btn.id || btn.title)}
                              className="px-2.5 py-1 bg-[#202c33] hover:bg-[#005c4b] border border-slate-700 text-emerald-400 hover:text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                            >
                              {btn.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Simulator Chat Input */}
                <div className="p-2.5 bg-[#1f2c34] border-t border-slate-800 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={simInput}
                    onChange={(e) => setSimInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendSimMessage()}
                    placeholder="Reply 1, 2, 3 or type message..."
                    className="flex-1 bg-[#2a3942] border-none rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none"
                  />
                  <button
                    onClick={() => handleSendSimMessage()}
                    className="w-8 h-8 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INDUSTRY RECIPES */}
      {activeTab === 'recipes' && (
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-xl font-bold text-white">1-Click Industry Workflow Recipes</h2>
            <p className="text-xs text-slate-400">
              Select a battle-tested automation template for your business. Customize and launch in 60 seconds!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {INDUSTRY_TEMPLATES.map((tpl) => {
              const IconComp = tpl.icon;
              return (
                <div
                  key={tpl.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-xl transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {tpl.branches.length} Branches
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white">{tpl.name}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{tpl.description}</p>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
                      <p className="font-bold text-emerald-400">Included Actions:</p>
                      <p>• Multi-choice visual menu with buttons</p>
                      <p>• Promotional flyer banner preview</p>
                      <p>• Automatic CRM lead capture &amp; tagging</p>
                    </div>
                  </div>

                  <button
                    onClick={() => applyIndustryTemplate(tpl)}
                    className="mt-5 w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 stroke-[3]" />
                    <span>Import to Studio &amp; Launch</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SAVED WORKFLOWS LIST */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              All Saved Workflows ({rules.length})
            </h2>
            <button
              onClick={() => {
                applyIndustryTemplate(INDUSTRY_TEMPLATES[0]);
                setActiveTab('studio');
              }}
              className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400 flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" /> New Workflow
            </button>
          </div>

          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rules.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
              <Zap className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Saved Workflows</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Create a custom branching flow or launch a pre-built industry recipe to automate your WhatsApp customer journeys.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rules.map((r) => (
                <div
                  key={r.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                          r.isActive
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            r.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                          }`}
                        />
                        {r.isActive ? 'ACTIVE 24/7' : 'PAUSED'}
                      </span>

                      <button
                        onClick={() => handleToggleRule(r.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          r.isActive ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                        title={r.isActive ? 'Turn OFF' : 'Turn ON'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            r.isActive ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <h3 className="text-sm font-bold text-white line-clamp-1">{r.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {r.description || 'Automated WhatsApp customer flow'}
                    </p>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Trigger: {r.trigger}</span>
                      <span>{r.executionCount || 0} runs</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => loadRuleIntoStudio(r)}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit in Studio</span>
                    </button>

                    <button
                      onClick={() => handleDeleteRule(r.id, r.name)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition cursor-pointer"
                      title="Delete workflow"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: DRIP FOLLOW-UP SEQUENCES */}
      {activeTab === 'drip' && (
        <DripSequenceManager />
      )}

      {/* TAB 4: PRIVACY & EXCLUDED NUMBERS */}
      {activeTab === 'privacy' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6 max-w-3xl">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Family &amp; Personal Contacts Privacy Filter
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Ensure your automated WhatsApp chatbot never sends auto-replies to personal friends, family members, or specific phone numbers.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800">
            <label className="flex items-start gap-3 p-4 bg-slate-950 rounded-2xl border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyUnsavedContacts}
                onChange={(e) => setOnlyUnsavedContacts(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-white block">
                  Only Trigger Bot on Unsaved Contact Numbers
                </span>
                <span className="text-[11px] text-slate-400">
                  When enabled, known personal contacts saved in your phone address book will be completely ignored by the chatbot.
                </span>
              </div>
            </label>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Excluded Phone Numbers (Never Reply):
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newExcludedInput}
                  onChange={(e) => setNewExcludedInput(e.target.value)}
                  placeholder="e.g. +919876543210"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addExcludedNumber}
                  className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400 transition cursor-pointer"
                >
                  Add Number
                </button>
              </div>

              {excludedNumbers.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {excludedNumbers.map((num) => (
                    <span
                      key={num}
                      className="px-3 py-1 bg-slate-950 border border-slate-800 text-slate-300 rounded-xl text-xs font-mono flex items-center gap-2"
                    >
                      <span>{num}</span>
                      <button
                        type="button"
                        onClick={() => removeExcludedNumber(num)}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={savePrivacySettings}
              disabled={isSavingPrivacy}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              {isSavingPrivacy ? 'Saving...' : 'Save Privacy Preferences'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
