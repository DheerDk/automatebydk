import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AutomationRule } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
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
  AlertCircle
} from 'lucide-react';

interface FlowButton {
  id: string;
  title: string;
  type?: 'QUICK_REPLY' | 'URL' | 'CATALOG' | 'CALL';
  url?: string;
  phoneNumber?: string;
}

interface FlowBranch {
  id: string;
  conditionType: 'NUMBER_CHOICE' | 'EQUALS' | 'CONTAINS';
  value: string; // e.g. "1", "price", "order"
  title: string;
  mediaUrl?: string;
  buttons?: FlowButton[];
  actions: {
    type: 'SEND_MESSAGE' | 'SEND_CATALOG' | 'SEND_LOCATION' | 'SEND_WEBSITE' | 'CREATE_LEAD' | 'ADD_TAGS' | 'HUMAN_HANDOFF';
    text?: string;
    url?: string;
    mediaUrl?: string;
    address?: string;
    leadStatus?: string;
    tags?: string[];
    buttons?: FlowButton[];
  }[];
}

interface VisualFlowData {
  triggerKeyword: string;
  triggerType: string;
  welcomeMediaUrl?: string;
  branches: FlowBranch[];
  buttons?: FlowButton[];
  defaultAction: {
    type: 'SEND_MESSAGE' | 'AI_FALLBACK' | 'HUMAN_HANDOFF';
    text: string;
    mediaUrl?: string;
    buttons?: FlowButton[];
  };
}

// 8+ INDUSTRY RECIPES & WORKFLOW TEMPLATES
const INDUSTRY_TEMPLATES = [
  {
    id: 'retail',
    name: '🛍️ Retail & E-Commerce Store',
    tagline: 'Catalog, Promo Codes & Store Location',
    icon: ShoppingBag,
    color: 'emerald',
    badge: 'Popular',
    description: 'Instant catalog browsing, discount coupon codes, physical store visit map, and human manager handoff.',
    trigger: 'hi, hello, menu, start, 1, 2, 3, 4, 5, 6',
    welcomeMediaUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=60',
    welcome: '👋 *Welcome to our Store!*\n\nHow can we help you today? Reply with a number:\n1️⃣ 🛍️ Browse Trending Products\n2️⃣ 🔍 Search Product Catalog\n3️⃣ 🏷️ Exclusive Sale & Promo Code\n4️⃣ 📍 Store Location & Hours\n5️⃣ 🌐 Visit Official Website\n6️⃣ 🧑‍💼 Talk to Store Manager',
    branches: [
      {
        id: 'b1',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '1',
        title: 'Option 1: Browse Products',
        actions: [
          { type: 'SEND_CATALOG' as const, text: '🛍️ Here are our top trending products from the store catalog:' },
          { type: 'CREATE_LEAD' as const, leadStatus: 'INTERESTED' },
          { type: 'ADD_TAGS' as const, tags: ['Browsed-Catalog'] },
        ],
      },
      {
        id: 'b2',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '2',
        title: 'Option 2: Search a Product',
        actions: [
          { type: 'SEND_MESSAGE' as const, text: '🔍 *Product Search:* Reply with the name of the product or model you are looking for, and our team will find it instantly!' },
          { type: 'ADD_TAGS' as const, tags: ['Search-Intent'] },
        ],
      },
      {
        id: 'b3',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '3',
        title: 'Option 3: Offers & Deals',
        mediaUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=60',
        actions: [
          { type: 'SEND_MESSAGE' as const, mediaUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=60', text: '🏷️ *Exclusive VIP Discount!*\nGet *Flat 20% OFF* using promo code: *VIP20*.\n\n✨ Reply with the item you want to order to claim this discount!' },
          { type: 'CREATE_LEAD' as const, leadStatus: 'HOT' },
          { type: 'ADD_TAGS' as const, tags: ['Hot-Offer-Lead'] },
        ],
      },
      {
        id: 'b4',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '4',
        title: 'Option 4: Store Location',
        actions: [
          { type: 'SEND_LOCATION' as const, address: 'Main Commercial Hub, Store #42', text: '📍 *Store Location & Hours:*\n🏢 Main Commercial Hub, Store #42\n🗺️ Google Maps: https://maps.google.com/?q=Store\n⏰ Hours: Mon-Sat (10:00 AM - 9:00 PM)' },
          { type: 'ADD_TAGS' as const, tags: ['Store-Visit'] },
        ],
      },
      {
        id: 'b5',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '5',
        title: 'Option 5: Online Website',
        actions: [
          { type: 'SEND_WEBSITE' as const, url: 'https://automatebydk.pages.dev', text: '🌐 *Shop Online at Our Store:*\n🔗 https://automatebydk.pages.dev\n\n✨ Place orders directly with free doorstep delivery!' },
        ],
      },
      {
        id: 'b6',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '6',
        title: 'Option 6: Talk to Support',
        actions: [
          { type: 'HUMAN_HANDOFF' as const, text: '🧑‍💼 *Transferring to Support Manager...*\nOur live store manager has been notified and will message you directly in a moment! Please describe what you need help with.' },
        ],
      },
    ],
  },
  {
    id: 'restaurant',
    name: '🍕 Restaurant & Food Delivery',
    tagline: 'Digital Menu, Table Booking & Specials',
    icon: Utensils,
    color: 'amber',
    badge: 'High Conversion',
    description: 'Digital food menu, table reservation booking, take-out orders, and chef specials.',
    trigger: 'hi, hello, food, menu, order, book table, 1, 2, 3, 4',
    welcomeMediaUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=60',
    welcome: '🍽️ *Welcome to Delicious Bites Kitchen!*\n\nWhat would you like to order today? Reply with a number:\n1️⃣ 📋 View Digital Food Menu\n2️⃣ 🪑 Book a Table Reservation\n3️⃣ 🍕 Today\'s Chef Specials & Deals\n4️⃣ 📍 Restaurant Location & Timings\n5️⃣ 🧑‍🍳 Talk to Captain / Manager',
    branches: [
      {
        id: 'b1',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '1',
        title: 'Option 1: Digital Menu',
        mediaUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=60',
        actions: [
          { type: 'SEND_MESSAGE' as const, mediaUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=60', text: '📋 *Digital Food Menu:*\n🍕 Woodfired Margherita Pizza - ₹399\n🍔 Double Smash Burger - ₹299\n🍝 Creamy Alfredo Pasta - ₹349\n🥤 Iced Caramel Frappe - ₹189\n\n👉 Reply with the dish names and your address to place an order!' },
          { type: 'CREATE_LEAD' as const, leadStatus: 'INTERESTED' },
          { type: 'ADD_TAGS' as const, tags: ['Food-Menu-Viewer'] },
        ],
      },
      {
        id: 'b2',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '2',
        title: 'Option 2: Book a Table',
        actions: [
          { type: 'SEND_MESSAGE' as const, text: '🪑 *Table Reservation Booking:*\nPlease reply with:\n1. Your Name\n2. Date & Time (e.g. Tonight 8:00 PM)\n3. Number of Guests\n\nOur captain will immediately confirm your table!' },
          { type: 'CREATE_LEAD' as const, leadStatus: 'HOT' },
          { type: 'ADD_TAGS' as const, tags: ['Table-Booking-Request'] },
        ],
      },
      {
        id: 'b3',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '3',
        title: 'Option 3: Chef Specials & Deals',
        mediaUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=60',
        actions: [
          { type: 'SEND_MESSAGE' as const, mediaUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=60', text: '✨ *Today\'s Chef Special Deal:*\nOrder any 2 Large Pizzas and get a *Free Garlic Bread + 2 Drinks*! 🥤\n\nUse Code: *CHEFDELIGHT*' },
          { type: 'ADD_TAGS' as const, tags: ['Food-Offer-Lead'] },
        ],
      },
      {
        id: 'b4',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '4',
        title: 'Option 4: Location & Timings',
        actions: [
          { type: 'SEND_LOCATION' as const, address: 'Gourmet Street, 2nd Cross, Food Park', text: '📍 *Restaurant Location:*\n🏢 Gourmet Street, 2nd Cross, Food Park\n🗺️ Google Maps: https://maps.google.com/?q=Restaurant\n⏰ Open Daily: 11:30 AM - 11:30 PM\n🚗 Valet Parking Available' },
        ],
      },
    ],
  },
  {
    id: 'clinic',
    name: '🏥 Clinic & Doctor Appointments',
    tagline: 'Appointment Booking & Consultation Fees',
    icon: Stethoscope,
    color: 'blue',
    badge: 'Healthcare',
    description: 'Doctor appointment booking, clinic timings, consultation fees, and emergency contact.',
    trigger: 'hi, hello, appointment, doctor, book, clinic, 1, 2, 3, 4',
    welcome: '🏥 *Welcome to CareFirst Health Clinic!*\n\nHow can our medical reception assist you? Reply with a number:\n1️⃣ 🩺 Book Doctor Consultation\n2️⃣ ⏰ Clinic Hours & Doctor Schedule\n3️⃣ 📍 Clinic Address & Directions\n4️⃣ 💊 Medicine & Prescription Refill\n5️⃣ 🚨 Emergency Helpline',
    branches: [
      {
        id: 'b1',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '1',
        title: 'Option 1: Book Consultation',
        actions: [
          { type: 'SEND_MESSAGE' as const, text: '🩺 *Doctor Consultation Booking:*\nPlease reply with:\n1. Patient Name & Age\n2. Department (General / Dental / Skin / Pediatric)\n3. Preferred Time Slot (Morning / Evening)\n\nOur reception will assign your token number.' },
          { type: 'CREATE_LEAD' as const, leadStatus: 'HOT' },
          { type: 'ADD_TAGS' as const, tags: ['Doctor-Appointment'] },
        ],
      },
      {
        id: 'b2',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '2',
        title: 'Option 2: Schedule & Fees',
        actions: [
          { type: 'SEND_MESSAGE' as const, text: '⏰ *Doctor Timings & Consultation Fees:*\n👨‍⚕️ Dr. Sharma (General Medicine): 10 AM - 1 PM (Fee: ₹500)\n👩‍⚕️ Dr. Patel (Dermatology): 5 PM - 8 PM (Fee: ₹700)\n🦷 Dr. Roy (Dentist): 11 AM - 4 PM (Fee: ₹600)' },
        ],
      },
      {
        id: 'b3',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '3',
        title: 'Option 3: Clinic Directions',
        actions: [
          { type: 'SEND_LOCATION' as const, address: 'CareFirst Hospital Complex, Wing B', text: '📍 *Clinic Location:*\n🏢 CareFirst Complex, 1st Floor, Wing B\n🗺️ Google Maps: https://maps.google.com/?q=Clinic\n⏰ Open Mon-Sat: 9:00 AM - 8:30 PM' },
        ],
      },
      {
        id: 'b4',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '4',
        title: 'Option 4: Emergency Line',
        actions: [
          { type: 'HUMAN_HANDOFF' as const, text: '🚨 *Connecting to Emergency Medical Receptionist...*\nFor immediate emergency assistance, call: +91 98765 00112 (24/7 Helpline).' },
        ],
      },
    ],
  },
  {
    id: 'realestate',
    name: '🏠 Real Estate & Property Enquiries',
    tagline: 'Apartments, Villas & Site Visits',
    icon: Building,
    color: 'purple',
    badge: 'High Ticket',
    description: 'Property listings by budget, schedule site visits, virtual tour links, and agent callback.',
    trigger: 'hi, hello, property, flat, villa, plot, site visit, 1, 2, 3, 4',
    welcomeMediaUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=60',
    welcome: '🏰 *Welcome to Apex Realty & Living!*\n\nLooking for your dream home or investment? Reply with a number:\n1️⃣ 🏢 2 & 3 BHK Luxury Apartments\n2️⃣ 🏡 Independent Villas & Plots\n3️⃣ 🚗 Schedule a Free Site Visit\n4️⃣ 📊 Download Price Sheet & Brochure\n5️⃣ 🧑‍💼 Talk to Property Advisor',
    branches: [
      {
        id: 'b1',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '1',
        title: 'Option 1: 2 & 3 BHK Apartments',
        mediaUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=60',
        actions: [
          { type: 'SEND_MESSAGE' as const, mediaUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=60', text: '🏢 *Premium 2 & 3 BHK Apartments:*\n• 2 BHK (1150 sq.ft) - Starting at ₹65 Lakhs\n• 3 BHK (1650 sq.ft) - Starting at ₹92 Lakhs\n🏊 Clubhouse, Swimming Pool, Gym, 24/7 Security.\n\n👉 Reply with "VISIT" to book a private tour!' },
          { type: 'CREATE_LEAD' as const, leadStatus: 'HOT' },
          { type: 'ADD_TAGS' as const, tags: ['Apartment-Lead'] },
        ],
      },
      {
        id: 'b2',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '2',
        title: 'Option 2: Villas & Plots',
        actions: [
          { type: 'SEND_MESSAGE' as const, text: '🏡 *Gated Community Luxury Villas:*\n• 4 BHK Duplex Villa (2800 sq.ft) - Starting at ₹1.45 Cr\n• Gated Villa Plots (1200 - 2400 sq.ft) - ₹3,500/sq.ft\n\n👉 Reply with your budget to see matching layouts!' },
          { type: 'CREATE_LEAD' as const, leadStatus: 'HOT' },
          { type: 'ADD_TAGS' as const, tags: ['Villa-Lead'] },
        ],
      },
      {
        id: 'b3',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '3',
        title: 'Option 3: Schedule Site Visit',
        actions: [
          { type: 'SEND_MESSAGE' as const, text: '🚗 *Free Cab Pickup Site Visit:*\nPlease reply with:\n1. Your Name\n2. Preferred Date & Time\n3. Pickup Location\n\nOur property manager will confirm your free site visit cab!' },
          { type: 'CREATE_LEAD' as const, leadStatus: 'HOT' },
          { type: 'ADD_TAGS' as const, tags: ['Site-Visit-Requested'] },
        ],
      },
    ],
  },
  {
    id: 'salon',
    name: '💇 Salon, Spa & Beauty Studio',
    tagline: 'Rate Card, Slot Booking & Bridal Deals',
    icon: Scissors,
    color: 'pink',
    badge: 'Services',
    description: 'Services rate card, appointment booking, bridal packages, and studio location.',
    trigger: 'hi, hello, salon, haircut, spa, facial, book, 1, 2, 3, 4',
    welcomeMediaUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=60',
    welcome: '✨ *Welcome to Glow & Glam Beauty Lounge!*\n\nReady for a fresh look? Reply with a number:\n1️⃣ 💇 Hair Styling & Color Rate Card\n2️⃣ 🧖 Spa & Skin Care Packages\n3️⃣ 📅 Book an Appointment Slot\n4️⃣ 📍 Salon Location & Directions\n5️⃣ 💄 Bridal & Groom Packages',
    branches: [
      {
        id: 'b1',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '1',
        title: 'Option 1: Hair Services',
        actions: [
          { type: 'SEND_MESSAGE' as const, text: '💇 *Hair Styling Rate Card:*\n• Haircut & Wash (Men): ₹350\n• Haircut & Blowdry (Women): ₹650\n• Keratin Treatment: ₹3,999\n• Global Hair Color & Highlights: ₹2,499' },
          { type: 'CREATE_LEAD' as const, leadStatus: 'INTERESTED' },
          { type: 'ADD_TAGS' as const, tags: ['Hair-Service-Enquiry'] },
        ],
      },
      {
        id: 'b2',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '2',
        title: 'Option 2: Book Appointment',
        actions: [
          { type: 'SEND_MESSAGE' as const, text: '📅 *Book Your Slot:*\nPlease reply with your preferred day, time, and service. Our front desk will lock in your slot immediately!' },
          { type: 'CREATE_LEAD' as const, leadStatus: 'HOT' },
          { type: 'ADD_TAGS' as const, tags: ['Salon-Booking-Request'] },
        ],
      },
    ],
  },
  {
    id: 'education',
    name: '🎓 Coaching, Classes & Courses',
    tagline: 'Course Syllabus, Demo Classes & Fees',
    icon: GraduationCap,
    color: 'indigo',
    badge: 'EdTech',
    description: 'Course syllabus, batch timings, fee structures, and admission counseling.',
    trigger: 'hi, hello, course, admission, classes, fees, syllabus, 1, 2, 3',
    welcome: '🎓 *Welcome to Excellence Academy!*\n\nBoost your career and exam scores! Reply with a number:\n1️⃣ 📚 Available Courses & Syllabus\n2️⃣ ⏰ Batch Timings & Fee Structure\n3️⃣ 🧑‍🏫 Book Free Counseling Demo Class\n4️⃣ 📍 Institute Address & Classroom Tour',
    branches: [
      {
        id: 'b1',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '1',
        title: 'Option 1: Courses & Syllabus',
        actions: [
          { type: 'SEND_MESSAGE' as const, text: '📚 *Popular Career Courses:*\n1. Full-Stack Web & AI Development (6 Months)\n2. Digital Marketing & Growth Hacking (3 Months)\n3. Data Science & Machine Learning (6 Months)\n4. Competitive Exam Preparation (Class 9 to 12)' },
          { type: 'CREATE_LEAD' as const, leadStatus: 'INTERESTED' },
          { type: 'ADD_TAGS' as const, tags: ['Course-Enquiry'] },
        ],
      },
      {
        id: 'b2',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '2',
        title: 'Option 2: Free Demo Class',
        actions: [
          { type: 'SEND_MESSAGE' as const, text: '🧑‍🏫 *Book a Free 1-on-1 Demo Session:*\nReply with your Name, Email, and Course of interest to receive your free class access link!' },
          { type: 'CREATE_LEAD' as const, leadStatus: 'HOT' },
          { type: 'ADD_TAGS' as const, tags: ['Demo-Class-Lead'] },
        ],
      },
    ],
  },
  {
    id: 'fitness',
    name: '🏋️ Gym & Fitness Center',
    tagline: 'Membership Plans, Free Trial & Trainer',
    icon: Dumbbell,
    color: 'rose',
    badge: 'Fitness',
    description: 'Membership packages, free 1-day guest pass booking, personal training rates, and gym hours.',
    trigger: 'hi, hello, gym, workout, trial, membership, 1, 2, 3, 4',
    welcomeMediaUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=60',
    welcome: '💪 *Welcome to IronCore Fitness Club!*\n\nAchieve your dream fitness goals! Reply with a number:\n1️⃣ 💳 Membership Plans & Pricing\n2️⃣ 🎟️ Claim Free 1-Day Workout Pass\n3️⃣ 🏋️ Personal Training & Nutritionist\n4️⃣ 📍 Gym Location & Timings',
    branches: [
      {
        id: 'b1',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '1',
        title: 'Option 1: Membership Plans',
        actions: [
          { type: 'SEND_MESSAGE' as const, text: '💳 *IronCore Membership Plans:*\n• 1 Month: ₹1,800\n• 3 Months: ₹4,500\n• Annual VIP Pass: ₹12,999 (Includes Free Steam Bath + Trainer Guidance)\n\n👉 Reply with your chosen plan to join!' },
          { type: 'CREATE_LEAD' as const, leadStatus: 'HOT' },
          { type: 'ADD_TAGS' as const, tags: ['Gym-Membership-Lead'] },
        ],
      },
      {
        id: 'b2',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '2',
        title: 'Option 2: Free Workout Pass',
        actions: [
          { type: 'SEND_MESSAGE' as const, text: '🎟️ *Claim Your Free 1-Day Guest Workout Pass!*\nPlease reply with:\n1. Your Name\n2. Date you wish to visit\n\nShow this WhatsApp message at reception to begin!' },
          { type: 'CREATE_LEAD' as const, leadStatus: 'HOT' },
          { type: 'ADD_TAGS' as const, tags: ['Free-Trial-Pass'] },
        ],
      },
    ],
  },
  {
    id: 'carcare',
    name: '🚗 Car Service & Auto Repair',
    tagline: 'Service Booking, Pickup & Emergency Help',
    icon: Car,
    color: 'cyan',
    badge: 'Automotive',
    description: 'Periodic maintenance packages, free doorstep pickup & drop booking, tyre/battery care, and breakdown towing.',
    trigger: 'hi, hello, car, service, repair, breakdown, 1, 2, 3, 4',
    welcomeMediaUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop&q=60',
    welcome: '🚗 *Welcome to Apex Auto Care & Service!*\n\nKeep your car running smoothly! Reply with a number:\n1️⃣ 🔧 Book Periodic Car Service\n2️⃣ 🚚 Free Doorstep Pickup & Drop\n3️⃣ ⚡ Battery / Tyre Replacement\n4️⃣ 🚨 Emergency Roadside Towing',
    branches: [
      {
        id: 'b1',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '1',
        title: 'Option 1: Service Booking',
        actions: [
          { type: 'SEND_MESSAGE' as const, text: '🔧 *Periodic Car Service Packages:*\n• Basic Service (Engine Oil + Filter + Checkup): ₹1,999\n• Comprehensive 40-Point Service: ₹3,999\n\n👉 Reply with your Car Make & Model (e.g. Hyundai i20) to book!' },
          { type: 'CREATE_LEAD' as const, leadStatus: 'HOT' },
          { type: 'ADD_TAGS' as const, tags: ['Car-Service-Lead'] },
        ],
      },
      {
        id: 'b2',
        conditionType: 'NUMBER_CHOICE' as const,
        value: '2',
        title: 'Option 2: Emergency Breakdown',
        actions: [
          { type: 'HUMAN_HANDOFF' as const, text: '🚨 *24/7 Roadside Assistance & Towing:*\nOur emergency response team is available immediately. Call: +91 99880 11223 or reply with your live GPS location pin!' },
        ],
      },
    ],
  },
];

export const AutomationsPage: React.FC = () => {
  const { currentOrganization } = useAuth();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'flow_builder' | 'recipes' | 'workflows' | 'privacy'>('flow_builder');

  // Privacy & Excluded Contacts State
  const [onlyUnsavedContacts, setOnlyUnsavedContacts] = useState(false);
  const [excludedNumbers, setExcludedNumbers] = useState<string[]>([]);
  const [newExcludedInput, setNewExcludedInput] = useState('');
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [privacySuccess, setPrivacySuccess] = useState(false);

  // Visual Flow Builder State
  const [flowName, setFlowName] = useState('Smart Store Welcome & Branching Menu');
  const [triggerKeyword, setTriggerKeyword] = useState('hi, hello, menu, start, 1, 2, 3, 4, 5, 6');
  const [welcomeMediaUrl, setWelcomeMediaUrl] = useState<string>(INDUSTRY_TEMPLATES[0].welcomeMediaUrl || '');
  const [branches, setBranches] = useState<FlowBranch[]>(INDUSTRY_TEMPLATES[0].branches);

  const [defaultAction, setDefaultAction] = useState<{
    type: 'SEND_MESSAGE' | 'AI_FALLBACK' | 'HUMAN_HANDOFF';
    text: string;
    mediaUrl?: string;
  }>({
    type: 'SEND_MESSAGE',
    text: INDUSTRY_TEMPLATES[0].welcome,
    mediaUrl: INDUSTRY_TEMPLATES[0].welcomeMediaUrl,
  });

  const [activeBranchId, setActiveBranchId] = useState<string>('b1');
  const [isSavingFlow, setIsSavingFlow] = useState(false);
  const [flowSaveSuccess, setFlowSaveSuccess] = useState(false);

  // Live Simulator State
  const [simMessages, setSimMessages] = useState<Array<{
    sender: 'user' | 'bot';
    text: string;
    mediaUrl?: string;
    time: string;
  }>>([
    {
      sender: 'bot',
      text: INDUSTRY_TEMPLATES[0].welcome,
      mediaUrl: INDUSTRY_TEMPLATES[0].welcomeMediaUrl,
      time: 'Just now',
    },
  ]);
  const [simInput, setSimInput] = useState('');

  useEffect(() => {
    fetchRules();
    fetchPrivacySettings();
  }, []);

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/automations');
      setRules(res.data || []);
    } catch (err) {
      console.error('Failed to fetch automations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrivacySettings = async () => {
    try {
      const res: any = await api.get('/settings');
      if (res.data?.settings) {
        setOnlyUnsavedContacts(Boolean(res.data.settings.onlyUnsavedContacts));
        if (res.data.settings.excludedNumbers) {
          const arr = res.data.settings.excludedNumbers
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

  const savePrivacySettings = async () => {
    setIsSavingPrivacy(true);
    setPrivacySuccess(false);
    try {
      await api.put('/settings/profile', {
        onlyUnsavedContacts,
        excludedNumbers: excludedNumbers.join(','),
      });
      setPrivacySuccess(true);
      setTimeout(() => setPrivacySuccess(false), 3000);
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

  const applyIndustryTemplate = (tpl: (typeof INDUSTRY_TEMPLATES)[0]) => {
    setFlowName(`${tpl.name} Workflow`);
    setTriggerKeyword(tpl.trigger);
    setWelcomeMediaUrl(tpl.welcomeMediaUrl || '');
    setBranches(JSON.parse(JSON.stringify(tpl.branches)));
    setDefaultAction({
      type: 'SEND_MESSAGE',
      text: tpl.welcome,
      mediaUrl: tpl.welcomeMediaUrl,
    });
    setActiveBranchId(tpl.branches[0].id);
    setSimMessages([
      {
        sender: 'bot',
        text: tpl.welcome,
        mediaUrl: tpl.welcomeMediaUrl,
        time: 'Just now',
      },
    ]);
    setActiveTab('flow_builder');
  };

  const handleSaveFlow = async () => {
    setIsSavingFlow(true);
    setFlowSaveSuccess(false);
    try {
      const flowData = {
        triggerKeyword,
        welcomeMediaUrl,
        branches,
        defaultAction: {
          ...defaultAction,
          mediaUrl: welcomeMediaUrl || defaultAction.mediaUrl,
        },
      };

      const actionsList = branches.map((b) => ({
        type: 'BRANCH_NODE',
        keyword: b.value,
        title: b.title,
        mediaUrl: b.mediaUrl,
        actions: b.actions,
      }));

      await api.post('/automations', {
        name: flowName,
        trigger: 'KEYWORD_MATCH',
        conditions: JSON.stringify({ keyword: triggerKeyword }),
        actions: JSON.stringify(actionsList),
        flowData: JSON.stringify(flowData),
        isActive: true,
      });

      setFlowSaveSuccess(true);
      fetchRules();
      setTimeout(() => setFlowSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save ChatFlow');
    } finally {
      setIsSavingFlow(false);
    }
  };

  const handleSimSend = (textToSend?: string) => {
    const text = (textToSend || simInput).trim();
    if (!text) return;

    const newMsgs = [...simMessages, { sender: 'user' as const, text, time: 'Just now' }];
    setSimMessages(newMsgs);
    setSimInput('');

    // Simulate flow logic
    setTimeout(() => {
      const lower = text.toLowerCase();

      // Check if matches any branch
      const matchedBranch = branches.find((b) => {
        if (b.conditionType === 'NUMBER_CHOICE' || b.conditionType === 'EQUALS') {
          return (
            lower === b.value.toLowerCase() ||
            lower === `option ${b.value.toLowerCase()}` ||
            lower === `${b.value.toLowerCase()}.` ||
            lower === `#${b.value.toLowerCase()}`
          );
        }
        return lower.includes(b.value.toLowerCase());
      });

      if (matchedBranch) {
        let reply = '';
        let mediaUrl = matchedBranch.mediaUrl;

        matchedBranch.actions.forEach((act) => {
          if (act.mediaUrl) mediaUrl = act.mediaUrl;

          if (act.type === 'SEND_MESSAGE') {
            reply = act.text || 'Action executed.';
          } else if (act.type === 'SEND_CATALOG') {
            reply = '🛍️ *Trending Catalog Products:*\n1. Premium Phone Case - ₹499\n2. Fast Wireless Charger 20W - ₹899\n3. Noise Cancelling Earbuds - ₹1,499\n\n👉 Tap an option below or reply to order!';
          } else if (act.type === 'SEND_LOCATION') {
            reply = act.text || '📍 *Store Location & Timings:*\n🏢 Main Commercial Boulevard, Store #42\n🗺️ Google Maps: https://maps.google.com/?q=Store\n⏰ Hours: Mon-Sat (10:00 AM - 9:00 PM)';
          } else if (act.type === 'SEND_WEBSITE') {
            reply = act.text || '🌐 *Visit Our Official Online Store:*\n🔗 https://automatebydk.pages.dev\n\n✨ Browse full catalog, check new arrivals, and place orders directly!';
          } else if (act.type === 'HUMAN_HANDOFF') {
            reply = act.text || '🧑‍💼 Store manager has been alerted and will message you shortly!';
          }
        });

        setSimMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: reply || `✅ Executed ${matchedBranch.title}`,
            mediaUrl,
            time: 'Just now',
          },
        ]);
      } else if (lower.includes('hi') || lower.includes('hello') || lower.includes('menu') || lower.includes('start')) {
        setSimMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: defaultAction.text,
            mediaUrl: welcomeMediaUrl || defaultAction.mediaUrl,
            time: 'Just now',
          },
        ]);
      } else {
        setSimMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: `🤖 I received "${text}". Please reply with a number (1 to ${branches.length}) or type *Menu* to see available options!`,
            time: 'Just now',
          },
        ]);
      }
    }, 500);
  };

  const addBranch = () => {
    const newId = `b${Date.now()}`;
    const nextNum = branches.length + 1;
    const newBranch: FlowBranch = {
      id: newId,
      conditionType: 'NUMBER_CHOICE',
      value: String(nextNum),
      title: `Option ${nextNum}: Custom Branch`,
      actions: [
        {
          type: 'SEND_MESSAGE',
          text: `✨ Response for option ${nextNum}! Customize this message in the flow editor.`,
        },
      ],
    };
    setBranches([...branches, newBranch]);
    setActiveBranchId(newId);
  };

  const removeBranch = (id: string) => {
    if (branches.length <= 1) {
      alert('You must keep at least one branch.');
      return;
    }
    const filtered = branches.filter((b) => b.id !== id);
    setBranches(filtered);
    if (activeBranchId === id && filtered.length > 0) {
      setActiveBranchId(filtered[0].id);
    }
  };

  const selectedBranch = branches.find((b) => b.id === activeBranchId) || branches[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-6 rounded-2xl border border-emerald-500/20 shadow-xl text-white">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Sparkles className="w-4 h-4" /> Visual Automation Engine & Studio
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">ChatFlow Automation Studio</h1>
          <p className="text-slate-300 text-sm mt-1">
            Build custom "If-This-Then-That" WhatsApp branching flows, attach promotional flyers, and automate business leads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveTab('recipes')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition ${
              activeTab === 'recipes'
                ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            1-Click Industry Recipes
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2 border transition ${
              activeTab === 'privacy'
                ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-semibold shadow-lg shadow-emerald-500/25'
                : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            Family & Privacy Filter
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 gap-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('flow_builder')}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'flow_builder'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          Visual Flow Canvas
        </button>

        <button
          onClick={() => setActiveTab('recipes')}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'recipes'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          Industry Recipes ({INDUSTRY_TEMPLATES.length})
        </button>

        <button
          onClick={() => setActiveTab('workflows')}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'workflows'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Active Rules ({rules.length})
        </button>

        <button
          onClick={() => setActiveTab('privacy')}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'privacy'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserX className="w-4 h-4" />
          Excluded Numbers ({excludedNumbers.length})
        </button>
      </div>

      {/* TAB 1: VISUAL FLOW BUILDER CANVAS */}
      {activeTab === 'flow_builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Center: Interactive Node Canvas */}
          <div className="lg:col-span-8 space-y-6">
            {/* Flow Header Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Workflow Title
                  </label>
                  <input
                    type="text"
                    value={flowName}
                    onChange={(e) => setFlowName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. VIP Retail Store Automation"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleSaveFlow}
                    disabled={isSavingFlow}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {isSavingFlow ? (
                      'Saving Flow...'
                    ) : flowSaveSuccess ? (
                      <>
                        <Check className="w-4 h-4" /> Saved Successfully!
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" /> Save & Activate Flow
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Trigger Node */}
              <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    <Zap className="w-3.5 h-3.5" /> 1. Flow Trigger Node
                  </div>
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-medium border border-emerald-500/20">
                    Incoming Message Match
                  </span>
                </div>
                <label className="text-xs text-slate-400 block mb-1">
                  Trigger on Customer Keywords / Numbers:
                </label>
                <input
                  type="text"
                  value={triggerKeyword}
                  onChange={(e) => setTriggerKeyword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
                  placeholder="e.g. hi, hello, menu, start, 1, 2, 3, 4, 5, 6"
                />
              </div>
            </div>

            {/* Visual Branch Nodes List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Split className="w-4 h-4 text-emerald-400" /> 2. "If-This-Then-That" Branching Options
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure what happens when a customer sends a specific choice number or keyword.
                  </p>
                </div>
                <button
                  onClick={addBranch}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Branch Option
                </button>
              </div>

              {/* Branch Selector Tabs */}
              <div className="flex flex-wrap gap-2 pt-2">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setActiveBranchId(b.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
                      activeBranchId === b.id
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-900/50 flex items-center justify-center text-[10px] font-bold">
                      {b.value}
                    </span>
                    {b.title}
                  </button>
                ))}
              </div>

              {/* Active Branch Configuration Card */}
              {selectedBranch && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mt-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                        {selectedBranch.value}
                      </span>
                      <input
                        type="text"
                        value={selectedBranch.title}
                        onChange={(e) => {
                          const updated = branches.map((b) =>
                            b.id === selectedBranch.id ? { ...b, title: e.target.value } : b
                          );
                          setBranches(updated);
                        }}
                        className="bg-transparent text-white font-bold text-sm focus:outline-none border-b border-dashed border-slate-700 hover:border-emerald-500 focus:border-emerald-500 px-1 py-0.5"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-400">Match Choice:</label>
                      <input
                        type="text"
                        value={selectedBranch.value}
                        onChange={(e) => {
                          const updated = branches.map((b) =>
                            b.id === selectedBranch.id ? { ...b, value: e.target.value } : b
                          );
                          setBranches(updated);
                        }}
                        className="w-16 bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-center font-mono text-xs text-emerald-400 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      {branches.length > 1 && (
                        <button
                          onClick={() => removeBranch(selectedBranch.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 transition"
                          title="Delete Branch"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions in this branch */}
                  <div className="space-y-4">
                    {/* Action 1: Response Type & Text */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                          <MessageSquare className="w-3.5 h-3.5" /> Action: WhatsApp Reply Message
                        </div>
                        <select
                          value={selectedBranch.actions[0]?.type || 'SEND_MESSAGE'}
                          onChange={(e) => {
                            const newType = e.target.value as any;
                            const updated = branches.map((b) => {
                              if (b.id === selectedBranch.id) {
                                const acts = [...b.actions];
                                acts[0] = { ...acts[0], type: newType };
                                return { ...b, actions: acts };
                              }
                              return b;
                            });
                            setBranches(updated);
                          }}
                          className="bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="SEND_MESSAGE">💬 Send Text / Flyer Message</option>
                          <option value="SEND_CATALOG">🛍️ Send Product Catalog</option>
                          <option value="SEND_LOCATION">📍 Send Store Location (Google Maps Pin)</option>
                          <option value="SEND_WEBSITE">🌐 Send Official Store Website Link</option>
                          <option value="HUMAN_HANDOFF">🧑‍💼 Transfer to Support Manager</option>
                        </select>
                      </div>

                      {/* Attached Flyer / Image URL */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                          Attach Flyer / Offer Image URL (Optional):
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={selectedBranch.mediaUrl || selectedBranch.actions[0]?.mediaUrl || ''}
                            onChange={(e) => {
                              const img = e.target.value;
                              const updated = branches.map((b) => {
                                if (b.id === selectedBranch.id) {
                                  const acts = [...b.actions];
                                  acts[0] = { ...acts[0], mediaUrl: img };
                                  return { ...b, mediaUrl: img, actions: acts };
                                }
                                return b;
                              });
                              setBranches(updated);
                            }}
                            placeholder="https://images.unsplash.com/... or flyer image link"
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
                          />
                        </div>

                        {(selectedBranch.mediaUrl || selectedBranch.actions[0]?.mediaUrl) && (
                          <div className="mt-2 relative w-32 h-20 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center">
                            <img
                              src={selectedBranch.mediaUrl || selectedBranch.actions[0]?.mediaUrl}
                              alt="Branch flyer preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as any).style.display = 'none';
                              }}
                            />
                            <button
                              onClick={() => {
                                const updated = branches.map((b) => {
                                  if (b.id === selectedBranch.id) {
                                    const acts = [...b.actions];
                                    acts[0] = { ...acts[0], mediaUrl: '' };
                                    return { ...b, mediaUrl: '', actions: acts };
                                  }
                                  return b;
                                });
                                setBranches(updated);
                              }}
                              className="absolute top-1 right-1 p-1 bg-slate-900/80 rounded text-slate-400 hover:text-red-400"
                              title="Remove Flyer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {selectedBranch.actions[0]?.type === 'SEND_LOCATION' ? (
                        <div className="space-y-2">
                          <div className="p-3 bg-slate-950/60 border border-emerald-500/30 rounded-lg text-xs text-slate-300 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <span>
                              Sends store address, opening hours, Google Maps GPS link, and a native WhatsApp Location Pin.
                            </span>
                          </div>
                          <textarea
                            rows={3}
                            value={selectedBranch.actions[0]?.text || ''}
                            onChange={(e) => {
                              const updated = branches.map((b) => {
                                if (b.id === selectedBranch.id) {
                                  const acts = [...b.actions];
                                  acts[0] = { ...acts[0], text: e.target.value };
                                  return { ...b, actions: acts };
                                }
                                return b;
                              });
                              setBranches(updated);
                            }}
                            placeholder="Store address and directions..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 font-sans focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                          />
                        </div>
                      ) : selectedBranch.actions[0]?.type === 'SEND_WEBSITE' ? (
                        <div className="space-y-2">
                          <div className="p-3 bg-slate-950/60 border border-blue-500/30 rounded-lg text-xs text-slate-300 flex items-center gap-2">
                            <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <span>
                              Delivers direct website catalog link with preview and shopping instructions.
                            </span>
                          </div>
                          <input
                            type="text"
                            value={selectedBranch.actions[0]?.url || 'https://automatebydk.pages.dev'}
                            onChange={(e) => {
                              const updated = branches.map((b) => {
                                if (b.id === selectedBranch.id) {
                                  const acts = [...b.actions];
                                  acts[0] = { ...acts[0], url: e.target.value };
                                  return { ...b, actions: acts };
                                }
                                return b;
                              });
                              setBranches(updated);
                            }}
                            placeholder="https://yourwebsite.com"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-blue-400 font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      ) : selectedBranch.actions[0]?.type !== 'SEND_CATALOG' ? (
                        <textarea
                          rows={4}
                          value={selectedBranch.actions[0]?.text || ''}
                          onChange={(e) => {
                            const updated = branches.map((b) => {
                              if (b.id === selectedBranch.id) {
                                  const acts = [...b.actions];
                                  acts[0] = { ...acts[0], text: e.target.value };
                                  return { ...b, actions: acts };
                              }
                              return b;
                            });
                            setBranches(updated);
                          }}
                          placeholder="Type response text here... Use {{name}} for customer's name."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 font-sans focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                        />
                      ) : (
                        <div className="p-3 bg-slate-950/60 border border-dashed border-emerald-500/30 rounded-lg text-xs text-slate-300 flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>
                            Automatically pulls active products from your **Products** catalog with photo, price, and instant order instructions.
                          </span>
                        </div>
                      )}

                      {/* Interactive Action Buttons Customizer for this Step */}
                      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                            WhatsApp Interactive Buttons (e.g. Book Appointment, View Services, View Collection)
                          </label>
                          <span className="text-[10px] text-slate-400">Up to 3 Quick Action Buttons</span>
                        </div>

                        <div className="space-y-1.5">
                          {(selectedBranch.buttons || [
                            { id: '1', title: '📋 View Collection' },
                            { id: '2', title: '🧑‍💼 Talk to Support' }
                          ]).map((btn, bIdx) => (
                            <div key={bIdx} className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-bold">
                                {bIdx + 1}
                              </span>
                              <input
                                type="text"
                                value={btn.title}
                                onChange={(e) => {
                                  const currentBtns = [...(selectedBranch.buttons || [
                                    { id: '1', title: '📋 View Collection' },
                                    { id: '2', title: '🧑‍💼 Talk to Support' }
                                  ])];
                                  currentBtns[bIdx] = { ...currentBtns[bIdx], title: e.target.value };
                                  const updated = branches.map((b) => {
                                    if (b.id === selectedBranch.id) {
                                      const acts = [...b.actions];
                                      acts[0] = { ...acts[0], buttons: currentBtns };
                                      return { ...b, buttons: currentBtns, actions: acts };
                                    }
                                    return b;
                                  });
                                  setBranches(updated);
                                }}
                                placeholder="e.g. Book Appointment, View Collection, View Services"
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-teal-300 font-semibold focus:outline-none focus:border-teal-400"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const currentBtns = (selectedBranch.buttons || [
                                    { id: '1', title: '📋 View Collection' },
                                    { id: '2', title: '🧑‍💼 Talk to Support' }
                                  ]).filter((_, i) => i !== bIdx);
                                  const updated = branches.map((b) => {
                                    if (b.id === selectedBranch.id) {
                                      const acts = [...b.actions];
                                      acts[0] = { ...acts[0], buttons: currentBtns };
                                      return { ...b, buttons: currentBtns, actions: acts };
                                    }
                                    return b;
                                  });
                                  setBranches(updated);
                                }}
                                className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                                title="Remove Button"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}

                          {(selectedBranch.buttons?.length || 2) < 3 && (
                            <button
                              type="button"
                              onClick={() => {
                                const currentBtns = [...(selectedBranch.buttons || [
                                  { id: '1', title: '📋 View Collection' },
                                  { id: '2', title: '🧑‍💼 Talk to Support' }
                                ])];
                                currentBtns.push({ id: String(currentBtns.length + 1), title: '✨ Quick Action' });
                                const updated = branches.map((b) => {
                                  if (b.id === selectedBranch.id) {
                                    const acts = [...b.actions];
                                    acts[0] = { ...acts[0], buttons: currentBtns };
                                    return { ...b, buttons: currentBtns, actions: acts };
                                  }
                                  return b;
                                });
                                setBranches(updated);
                              }}
                              className="text-[11px] text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 pt-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Add Interactive Button
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action 2: Lead CRM Status & Customer Tag */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                        <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-amber-400" /> Capture Lead in CRM:
                        </label>
                        <select
                          value={selectedBranch.actions.find((a) => a.type === 'CREATE_LEAD')?.leadStatus || 'INTERESTED'}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            const updated = branches.map((b) => {
                              if (b.id === selectedBranch.id) {
                                const existing = b.actions.filter((a) => a.type !== 'CREATE_LEAD');
                                existing.push({ type: 'CREATE_LEAD', leadStatus: newStatus });
                                return { ...b, actions: existing };
                              }
                              return b;
                            });
                            setBranches(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="NEW">🎯 New Inquirer</option>
                          <option value="INTERESTED">🔥 Interested Prospect</option>
                          <option value="HOT">⚡ Hot Deal Lead</option>
                          <option value="NEGOTIATION">💳 Checkout / Order Lead</option>
                        </select>
                      </div>

                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                        <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-blue-400" /> Apply CRM Customer Tag:
                        </label>
                        <input
                          type="text"
                          value={selectedBranch.actions.find((a) => a.type === 'ADD_TAGS')?.tags?.[0] || 'Store-Lead'}
                          onChange={(e) => {
                            const newTag = e.target.value;
                            const updated = branches.map((b) => {
                              if (b.id === selectedBranch.id) {
                                const existing = b.actions.filter((a) => a.type !== 'ADD_TAGS');
                                existing.push({ type: 'ADD_TAGS', tags: [newTag] });
                                return { ...b, actions: existing };
                              }
                              return b;
                            });
                            setBranches(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder="e.g. Catalog-Viewer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Default Greeting / Fallback Menu Node */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-emerald-400" /> 3. Default Welcome Greeting Menu (Sent for 'Hi' or Unrecognized Text)
                </h3>
              </div>

              {/* Optional Welcome Flyer */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                  Attach Welcome Flyer / Header Banner (Optional):
                </label>
                <input
                  type="text"
                  value={welcomeMediaUrl}
                  onChange={(e) => {
                    setWelcomeMediaUrl(e.target.value);
                    setDefaultAction({ ...defaultAction, mediaUrl: e.target.value });
                  }}
                  placeholder="https://... image URL for welcome banner"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <textarea
                rows={4}
                value={defaultAction.text}
                onChange={(e) => setDefaultAction({ ...defaultAction, text: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-100 font-sans focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
              />

              {/* Welcome Greeting Interactive Buttons Customizer */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    Welcome Greeting Interactive WhatsApp Buttons (e.g. Book Appointment, View Services)
                  </label>
                  <span className="text-[10px] text-slate-400">Clicking button triggers matching branch</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {branches.slice(0, 3).map((b, idx) => (
                    <div key={b.id} className="bg-slate-900 border border-slate-700/80 rounded-lg p-2 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={b.title.replace(/^Option \d+:\s*/i, '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          const updated = branches.map((branch) =>
                            branch.id === b.id ? { ...branch, title: `Option ${idx + 1}: ${val}` } : branch
                          );
                          setBranches(updated);
                        }}
                        className="w-full bg-transparent text-xs text-teal-300 font-semibold focus:outline-none border-b border-transparent focus:border-teal-400"
                        placeholder="Button Title"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive WhatsApp Simulator */}
          <div className="lg:col-span-4">
            <div className="sticky top-6 bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Live WhatsApp Simulator</h4>
                    <p className="text-[11px] text-slate-400">Click buttons or type to test</p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setSimMessages([
                      {
                        sender: 'bot',
                        text: defaultAction.text,
                        mediaUrl: welcomeMediaUrl || defaultAction.mediaUrl,
                        time: 'Just now',
                      },
                    ])
                  }
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition text-xs flex items-center gap-1 cursor-pointer"
                  title="Reset Simulator"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* WhatsApp Smartphone Frame */}
              <div className="bg-[#111b21] rounded-[32px] border-4 border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[520px]">
                {/* Phone WhatsApp Top Bar */}
                <div className="bg-[#202c33] px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs shadow-md">
                      DK
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">AutoMate Official</p>
                      <p className="text-[9px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Verified Business Bot
                      </p>
                    </div>
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                </div>

                {/* Messages Body */}
                <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs bg-[#0c1317]">
                  {simMessages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[92%] rounded-2xl overflow-hidden shadow-md ${
                          m.sender === 'user'
                            ? 'bg-[#005c4b] text-white rounded-tr-none p-3'
                            : 'bg-[#202c33] text-slate-100 rounded-tl-none border border-slate-700/60'
                        }`}
                      >
                        {/* Media Flyer Image if present */}
                        {m.mediaUrl && (
                          <div className="w-full bg-slate-950 max-h-40 overflow-hidden">
                            <img
                              src={m.mediaUrl}
                              alt="Flyer"
                              className="w-full h-36 object-cover"
                              onError={(e) => {
                                (e.target as any).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <div className="p-3 whitespace-pre-wrap leading-relaxed text-xs">
                          {m.text}
                        </div>

                        {/* WhatsApp Native Interactive Buttons Stack */}
                        {m.sender === 'bot' && (
                          <div className="border-t border-slate-700/60 divide-y divide-slate-700/60 bg-[#182229]">
                            {branches.slice(0, 3).map((b) => (
                              <button
                                key={b.id}
                                onClick={() => handleSimSend(b.value)}
                                className="w-full py-2.5 px-3 text-sky-400 hover:text-sky-300 hover:bg-[#202c33] text-xs font-bold text-center flex items-center justify-center gap-2 transition active:bg-sky-950/40 cursor-pointer"
                              >
                                {b.actions[0]?.type === 'SEND_CATALOG' ? (
                                  <ShoppingBag className="w-3.5 h-3.5 text-sky-400" />
                                ) : b.actions[0]?.type === 'SEND_LOCATION' ? (
                                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                                ) : b.actions[0]?.type === 'SEND_WEBSITE' ? (
                                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                                ) : (
                                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                                )}
                                <span>{b.title.replace(/^Option \d+:\s*/i, '')}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Choice Buttons */}
                <div className="px-2 py-1.5 bg-slate-900/80 border-t border-slate-800 flex gap-1.5 overflow-x-auto">
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleSimSend(b.value)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-[10px] font-semibold rounded-lg border border-slate-700 whitespace-nowrap transition"
                    >
                      Send {b.value}
                    </button>
                  ))}
                  <button
                    onClick={() => handleSimSend('hi')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-[10px] font-semibold rounded-lg border border-slate-700 whitespace-nowrap transition"
                  >
                    Send 'Hi'
                  </button>
                </div>

                {/* Input Bar */}
                <div className="p-2 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    value={simInput}
                    onChange={(e) => setSimInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSimSend()}
                    placeholder="Type a message (e.g. 1, 2, hi)..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => handleSimSend()}
                    className="p-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition shadow-md"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-slate-300">
                <p className="font-semibold text-emerald-400 mb-0.5">💡 Tip:</p>
                Click any quick button above or type numbers (1 to {branches.length}) to test how customer flows execute live!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INDUSTRY RECIPES (1-CLICK INSTALL) */}
      {activeTab === 'recipes' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Pre-Configured Industry Workflow Recipes
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Install full business chat flows with 1 click. Includes welcome flyers, branching menus, maps, and CRM tagging.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {INDUSTRY_TEMPLATES.map((tpl) => {
              const IconComp = tpl.icon;
              return (
                <div
                  key={tpl.id}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-lg flex flex-col justify-between group transition duration-200"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        {tpl.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition">
                        {tpl.name}
                      </h3>
                      <p className="text-xs text-emerald-400/90 font-medium">{tpl.tagline}</p>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{tpl.description}</p>
                    </div>

                    {/* Flow Breakdown Pill Preview */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs text-slate-300">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Included Branches ({tpl.branches.length}):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {tpl.branches.map((b) => (
                          <span
                            key={b.id}
                            className="bg-slate-900 text-slate-300 border border-slate-800 text-[10px] px-2 py-0.5 rounded-md"
                          >
                            {b.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Triggers: <span className="text-slate-300">Hi, Menu, 1-6</span>
                    </span>
                    <button
                      onClick={() => applyIndustryTemplate(tpl)}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Install Recipe
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: PRIVACY & PERSONAL CONTACT FILTER */}
      {activeTab === 'privacy' && (
        <div className="max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Family & Personal Contact Protection</h2>
              <p className="text-xs text-slate-400">
                Ensure your personal family, friends, and staff never get disturbed by automated bot replies.
              </p>
            </div>
          </div>

          {/* Toggle 1: Only Unsaved Contacts */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">
                  Only Automate Unsaved Customer Numbers
                </h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                When enabled, the automation will **only respond to new / unsaved customer phone numbers**. Anyone already saved in your personal phone contact book will be completely ignored by the bot, allowing you to chat normally.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
              <input
                type="checkbox"
                checked={onlyUnsavedContacts}
                onChange={(e) => setOnlyUnsavedContacts(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Section 2: Excluded Numbers Blacklist */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <UserX className="w-4 h-4 text-red-400" /> Excluded Phone Numbers Blacklist
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Add specific numbers (family members, personal friends, VIPs) that should **NEVER** receive automated replies under any circumstance.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newExcludedInput}
                onChange={(e) => setNewExcludedInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addExcludedNumber()}
                placeholder="Enter phone number (e.g. +919876543210 or 9876543210)"
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                onClick={addExcludedNumber}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Number
              </button>
            </div>

            {/* List of excluded numbers tags */}
            <div className="flex flex-wrap gap-2 pt-2">
              {excludedNumbers.map((num) => (
                <span
                  key={num}
                  className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg shadow-sm font-mono"
                >
                  <PhoneCall className="w-3 h-3 text-red-400" />
                  {num}
                  <button
                    onClick={() => removeExcludedNumber(num)}
                    className="text-slate-400 hover:text-red-400 transition ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}

              {excludedNumbers.length === 0 && (
                <p className="text-xs text-slate-500 italic">No numbers excluded yet.</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {privacySuccess ? (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" /> Privacy settings saved successfully!
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                Changes take effect immediately on your live WhatsApp number.
              </span>
            )}

            <button
              onClick={savePrivacySettings}
              disabled={isSavingPrivacy}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
            >
              {isSavingPrivacy ? 'Saving...' : 'Save Privacy Filters'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: ACTIVE RULES LIST */}
      {activeTab === 'workflows' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Active Automation Workflows</h2>
              <p className="text-xs text-slate-400">
                All automation rules currently running on your WhatsApp business account.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('flow_builder')}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create New Flow
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {rules.map((r) => (
              <div
                key={r.id}
                className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <h4 className="text-sm font-bold text-white">{r.name}</h4>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 font-mono">
                      {r.trigger}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Executed: <span className="text-emerald-400 font-semibold">{r.executionCount}</span> times
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('flow_builder')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
                  >
                    Edit Flow
                  </button>
                </div>
              </div>
            ))}

            {rules.length === 0 && !isLoading && (
              <div className="text-center py-12 text-slate-500 text-xs">
                No custom automation rules created yet. Click **Create New Flow** or choose an **Industry Recipe** to launch your first flow!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
